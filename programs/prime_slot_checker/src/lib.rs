use anchor_lang::prelude::*;
use std::vec::Vec;

declare_id!("GYRYg9FkC6qTNWU2QMrkFEWimChKo86vYecKGw5n9KJa");

#[program]
pub mod prime_slot_checker {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, _bump: u8) -> Result<()> {
        let jackpot = &mut ctx.accounts.jackpot;
        let treasury = &mut ctx.accounts.treasury;
        jackpot.amount = 0;
        jackpot.winner = Pubkey::default(); // Initialize winner with default Pubkey
        treasury.amount = 0;
        msg!("Jackpot and Treasury pool initialized with 0 amount.");
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
        let payer = &ctx.accounts.payer;

        // Prevent transaction if user points are 0 or less
        if user.points <= 0 {
            return Err(ProgramError::InsufficientFunds.into());
        }

        // Convert user public key to a number in the range of 1 to 100,000
        let user_pubkey = user.key();
        let user_number = pubkey_to_number(&user_pubkey);

        // Get the current slot
        let slot = Clock::get()?.slot;

        // Add user number to current slot
        let number_to_test = slot + user_number as u64;

        // Check if the resulting number is prime
        if is_prime(number_to_test) {
            user.points += jackpot.amount + 10;
            jackpot.winner = payer.key(); // Assign the payer's pubkey as the winner
            msg!("Slot {} + User number {} = {} is prime. Payer {} rewarded with {} points.", slot, user_number, number_to_test, payer.key(), jackpot.amount + 10);
            jackpot.amount = 0; // Reset the jackpot pool
        } else {
            jackpot.amount += 10;
            user.points -= 10;
            msg!("Slot {} + User number {} = {} is not prime. Jackpot pool increased by 10 points.", slot, user_number, number_to_test);
        }

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

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = Jackpot::LEN, seeds = [b"jackpot"], bump)]
    pub jackpot: Account<'info, Jackpot>,
    #[account(init, payer = payer, space = Treasury::LEN, seeds = [b"treasury"], bump)]
    pub treasury: Account<'info, Treasury>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(init, payer = payer, space = 8 + 8, seeds = [b"user", payer.key().as_ref()], bump)]
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
