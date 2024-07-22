use anchor_lang::prelude::*;
use std::vec::Vec;

declare_id!("AHgfWmuvjuCCiBuF1AuqHuKUvTewc9xoYpYmpJoxSGsH");

#[program]
pub mod prime_slot_checker {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, _bump: u8) -> Result<()> {
        let jackpot = &mut ctx.accounts.jackpot;
        let treasury = &mut ctx.accounts.treasury;
        let player_list = &mut ctx.accounts.player_list;

        // Initialize only if they have not been initialized already
        if jackpot.amount == 0 && jackpot.winner == Pubkey::default() {
            jackpot.amount = 0;
            jackpot.winner = Pubkey::default(); // Initialize winner with default Pubkey
            msg!("Jackpot pool initialized with 0 amount.");
        }

        if treasury.amount == 0 {
            treasury.amount = 0;
            msg!("Treasury pool initialized with 0 amount.");
        }

        if player_list.players.is_empty() {
            player_list.players = Vec::new();
            msg!("Player List initialized.");
        }

        Ok(())
    }

    pub fn initialize_user(ctx: Context<InitializeUser>, _bump: u8) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let payer = &ctx.accounts.payer;
        user.points = 1000;
        msg!("User initialized with 1000 points, payer was: {:?}", payer.key());
        Ok(())
    }

    pub fn check_slot(ctx: Context<CheckSlot>, _bump: u8) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let jackpot = &mut ctx.accounts.jackpot;
        let treasury = &mut ctx.accounts.treasury;
        let payer = &ctx.accounts.payer;
        let player_list = &mut ctx.accounts.player_list;

        // Prevent transaction if user points are 0 or less
        if user.points <= 0 {
            return Err(ProgramError::InsufficientFunds.into());
        }

        // Convert user public key to a number in the range of 1 to 100,000
        let user_pubkey = user.key();
        let user_number = pubkey_to_number(&user_pubkey);

        // Get the current slot
        let slot = Clock::get()?.slot;

        // Convert last 10 players' pubkeys to numbers and add to slot
        let recent_players: Vec<Pubkey> = player_list.players.iter().rev().take(10).cloned().collect();
        let recent_players_sum: u64 = recent_players.iter().map(|pk| pubkey_to_number(pk) as u64).sum();

        // Get current UNIX time and convert to number
        let unix_time = Clock::get()?.unix_timestamp;
        let time_number = (unix_time % 100_000) as u64;

        // Calculate the number to test
        let number_to_test = slot + user_number as u64 + recent_players_sum + time_number;

        // Check if the resulting number is prime
        if is_prime(number_to_test) {
            user.points += jackpot.amount + 10;
            jackpot.winner = payer.key(); // Assign the payer's pubkey as the winner
            msg!("Slot {} + User number {} + Players sum {} + Time number {} = {} is prime. Payer {} rewarded with {} points.", slot, user_number, recent_players_sum, time_number, number_to_test, payer.key(), jackpot.amount + 10);

            // Transfer the entire balance from treasury to the user
            let treasury_balance = **treasury.to_account_info().lamports.borrow();
            let rent_exemption = Rent::get()?.minimum_balance(treasury.to_account_info().data_len());
            let transfer_amount = treasury_balance.checked_sub(rent_exemption).ok_or(ProgramError::InsufficientFunds)?;
            **treasury.to_account_info().lamports.borrow_mut() -= transfer_amount;
            **payer.to_account_info().lamports.borrow_mut() += transfer_amount;

            msg!("Transferred {} lamports from treasury to user {}", transfer_amount, payer.key());

            jackpot.amount = 0; // Reset the jackpot pool
        } else {
            jackpot.amount += 10;
            user.points -= 10;
            msg!("Slot {} + User number {} + Players sum {} + Time number {} = {} is not prime. Jackpot pool increased by 10 points.", slot, user_number, recent_players_sum, time_number, number_to_test);
        }

        // Update the player list with the latest user
        update_player_list(player_list, payer.key());

        // Log the last 10 user public keys
        // msg!("Last 10 players: {:?}", recent_players);

        msg!("User {} now has {} points.", user.key(), user.points);
        msg!("Jackpot pool now has {} points.", jackpot.amount);
        msg!("Jackpot winner is now: {:?}", jackpot.winner);
        Ok(())
    }

    pub fn pay_for_points(ctx: Context<PayForPoints>, _bump: u8) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let treasury = &mut ctx.accounts.treasury;
        let payer = &ctx.accounts.payer;

        // Transfer 1 SOL to the treasury using the system program
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &payer.key(),
            &treasury.key(),
            1_000_000_000,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                payer.to_account_info(),
                treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Add points to user
        user.points += 1000;
        msg!("User {} paid 1 SOL and received 1000 points.", payer.key());

        Ok(())
    }
}

fn update_player_list(player_list: &mut Account<PlayerList>, new_player: Pubkey) {
    if player_list.players.len() >= 10 {
        player_list.players.remove(0);
    }
    player_list.players.push(new_player);
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init_if_needed, payer = payer, space = Jackpot::LEN, seeds = [b"jackpot"], bump)]
    pub jackpot: Account<'info, Jackpot>,
    #[account(init_if_needed, payer = payer, space = Treasury::LEN, seeds = [b"treasury"], bump)]
    pub treasury: Account<'info, Treasury>,
    #[account(init_if_needed, payer = payer, space = PlayerList::LEN, seeds = [b"player_list"], bump)]
    pub player_list: Account<'info, PlayerList>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(init_if_needed, payer = payer, space = 8 + 8, seeds = [b"user", payer.key().as_ref()], bump)]
    pub user: Account<'info, User>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckSlot<'info> {
    #[account(mut, seeds = [b"user", payer.key().as_ref()], bump)]
    pub user: Account<'info, User>,
    #[account(mut, seeds = [b"jackpot"], bump)]
    pub jackpot: Account<'info, Jackpot>,
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: Account<'info, Treasury>,
    #[account(mut, seeds = [b"player_list"], bump)]
    pub player_list: Account<'info, PlayerList>,
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
pub struct PayForPoints<'info> {
    #[account(mut, seeds = [b"user", payer.key().as_ref()], bump)]
    pub user: Account<'info, User>,
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: Account<'info, Treasury>,
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct User {
    pub points: i64,
}

#[account]
pub struct Jackpot {
    pub amount: i64,
    pub winner: Pubkey,
}

#[account]
pub struct Treasury {
    pub amount: i64,
}

#[account]
pub struct PlayerList {
    pub players: Vec<Pubkey>,
}

impl PlayerList {
    const LEN: usize = 8 + (32 * 20) + 32; // Discriminator + 20 Pubkeys
}

impl Jackpot {
    const LEN: usize = 8 + 8 + 32; // Discriminator + amount + Pubkey
}

impl Treasury {
    const LEN: usize = 8 + 8; // Discriminator + amount
}

// Convert a public key to a number in the range of 1 to 100,000
fn pubkey_to_number(pubkey: &Pubkey) -> u32 {
    let mut number: u32 = 0;
    for byte in pubkey.to_bytes().iter() {
        number = number.wrapping_add(*byte as u32);
    }
    (number % 100_000) + 1
}

// Check if a number is prime using trial division
fn is_prime(n: u64) -> bool {
    if n <= 1 {
        return false;
    }
    if n <= 3 {
        return true;
    }
    if n % 2 == 0 || n % 3 == 0 {
        return false;
    }
    let mut i = 5;
    while i * i <= n {
        if n % i == 0 || n % (i + 2) == 0 {
            return false;
        }
        i += 6;
    }
    true
}

