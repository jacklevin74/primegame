use anchor_lang::prelude::*;
use std::vec::Vec;
use math_utils::{is_prime};

declare_id!("B4FMCpibTGdZhxHHNgWWnwk5PhhKdST37uFRY6TVksaj");

#[program]
#[allow(dead_code)]
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

        if player_list.players.is_empty() {
            player_list.players = Vec::new();
            msg!("Player List initialized.");
        }

        // Only log treasury initialization, do not reinitialize or reset lamports
        msg!("Treasury account initialized {}", treasury.key());

        Ok(())
    }

    pub fn initialize_total_won_points(ctx: Context<InitializeTotalWonPoints>) -> Result<()> {
        let total_won_points = &ctx.accounts.total_won_points;
        msg!("TotalWonPoints account initialized {}", total_won_points.key());
        Ok(())
    }

    pub fn initialize_staking_treasury(ctx: Context<InitializeStakingTreasury>) -> Result<()> {
        let staking_treasury = &ctx.accounts.staking_treasury;
        msg!("Staking Treasury account initialized {}", staking_treasury.key());
        Ok(())
    }

    pub fn initialize_leaderboard(ctx: Context<InitializeLeaderboard>, _bump: u8) -> Result<()> {
        let leaderboard = &mut ctx.accounts.leaderboard;

        // Initialize only if it has not been initialized already
        if leaderboard.users.is_empty() {
            leaderboard.users = Vec::new();
            msg!("Leaderboard initialized.");
        } else {
            msg!("Leaderboard already initialized with {} entries.", leaderboard.users.len());
        }

        Ok(())
    }

    pub fn initialize_user(ctx: Context<InitializeUser>, _bump: u8) -> Result<()> {
        let user = &mut ctx.accounts.user;

        // Initialize user points only if they have not been initialized already
        if user.points == 0 && user.won_points == 0 {
            user.points = 0;
            user.won_points = 0;
            user.last_won_slot = 0;
            user.last_claimed_slot = 0;
            user.last_claimed_lamports = 0;

            msg!("User initialized with 0 points and 0 won points.");
        } else if user.points == 0 {
            user.points = 0;
            msg!("User initialized with 0 points and {} won points.", user.won_points);
        } else {
            msg!("User already initialized with {} points and {} won points and last won slot {} ", user.points, user.won_points, user.last_won_slot);
        }

        Ok(())
    }


    pub fn check_slot(ctx: Context<CheckSlot>, _bump: u8) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let jackpot = &mut ctx.accounts.jackpot;
        let treasury = &mut ctx.accounts.treasury;
        let payer = &ctx.accounts.payer;
        let player_list = &mut ctx.accounts.player_list;
        let leaderboard = &mut ctx.accounts.leaderboard;
        let total_won_points = &mut ctx.accounts.total_won_points;
        let rate = &mut ctx.accounts.rate;
        let staking_treasury = &ctx.accounts.staking_treasury;

        // Prevent transaction if user points are 0 or less
        if user.points <= 10 {
            return Err(ProgramError::InsufficientFunds.into());
        }

        // Convert user public key to a number in the range of 1 to 100,000
        let payer_pubkey = payer.key();
        let user_pubkey = user.key();
        let user_number = pubkey_to_number(&user_pubkey);

        // Get the current slot
        let slot = Clock::get()?.slot;
        let last_won_slot = user.last_won_slot;

        // Calculate the power-up percentage based on the slot difference
        let slots_since_last_win = slot - last_won_slot;
        let power_up = if last_won_slot == 0 {
            0.1 // New user
        } else if slots_since_last_win >= 600 {
            0.75
        } else if slots_since_last_win >= 300 {
            0.5
        } else if slots_since_last_win >= 100 {
            0.25
        } else {
            0.1
        };

        // Convert last 10 players' pubkeys to numbers and add to slot
        let recent_players: Vec<Pubkey> = player_list.players.iter().rev().take(10).cloned().collect();
        let recent_players_sum: u64 = recent_players.iter().map(|pk| pubkey_to_number(pk) as u64).sum();

        // Get current UNIX time and convert to number
        let unix_time = Clock::get()?.unix_timestamp;
        let time_number = (unix_time % 100_000) as u64;

        // Calculate the number to test
        let number_to_test = slot + user_number as u64 + recent_players_sum + time_number;

        // Check if the resulting number is prime
        if is_prime(number_to_test, 5) {
            let reward_points = (jackpot.amount as f64 * power_up) as i64;
            user.points -= 10;
            user.points += reward_points;
            user.won_points += reward_points;
            total_won_points.points += reward_points as u64;
            user.last_won_slot = slot;
            jackpot.winner = payer.key(); // Assign the payer's pubkey as the winner
            msg!("Slot {} + User number {} + Players sum {} + Time number {} = {} is prime. Payer {} rewarded with {} points.", slot, user_number, recent_players_sum, time_number, number_to_test, payer.key(), reward_points);

            transfer_from_treasury(treasury, payer, number_to_test, power_up)?;
            msg!("User won with {} power-up", power_up);

            // Send event
            msg!("PrimeFound: slot={}, user_pubkey={}, power_up={}, number_to_test={}, reward_points={}",
                slot,
                payer_pubkey,
                power_up,
                number_to_test,
                reward_points
            );

            // Calculate the new point rate after winning
            calculate_point_rate_internal(staking_treasury, total_won_points, rate)?;

            // Adjust jackpot amount to ensure it doesn't go below zero
            if jackpot.amount >= reward_points {
                jackpot.amount -= reward_points;
            } else {
                jackpot.amount = 0;
            }

        } else {
            jackpot.amount += 10;
            user.points -= 10;
            msg!("Slot {} + User number {} + Players sum {} + Time number {} = {} is not prime. Jackpot pool increased by 10 points.", slot, user_number, recent_players_sum, time_number, number_to_test);
        }

        // Update the player list with the latest user
        update_player_list(player_list, payer.key());

        // Log the last 10 user public keys
        // update_leaderboard(leaderboard, payer.key(), user.won_points);

        msg!("User {} now has {} points.", payer.key(), user.points);
        msg!("Jackpot pool now has {} points.", jackpot.amount);
        msg!("User {} has {} won points.", payer.key(), user.won_points);
        msg!("Jackpot winner is now: {:?}", jackpot.winner);

        // Read and print the balance of the treasury
        let treasury_balance = **treasury.to_account_info().lamports.borrow();
        msg!("Treasury balance: {}", treasury_balance);

        Ok(())
    }

    pub fn trade_won_points(ctx: Context<TradeWonPoints>, _bump: u8) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let rate = &ctx.accounts.rate;
        let staking_treasury = &mut ctx.accounts.staking_treasury;
        let payer = &ctx.accounts.payer;
        let total_won_points = &mut ctx.accounts.total_won_points;

        // Check if user has at least 1000 won points
        if user.won_points < 1000 {
            return Err(ProgramError::InsufficientFunds.into());
        }

        // Calculate the lamports to transfer
        let lamports_to_transfer = (1000.0 * rate.value) as u64;

        // Check if staking treasury has enough lamports
        let staking_treasury_balance = **staking_treasury.to_account_info().lamports.borrow();
        if staking_treasury_balance < lamports_to_transfer {
            return Err(ProgramError::InsufficientFunds.into());
        }

        // Transfer lamports from staking treasury to payer
        **staking_treasury.to_account_info().lamports.borrow_mut() -= lamports_to_transfer;
        **payer.to_account_info().lamports.borrow_mut() += lamports_to_transfer;

        // Deduct 1000 won points from user
        user.won_points -= 1000;
        total_won_points.points -= 1000;

        msg!("Traded 1000 won points for {} lamports", lamports_to_transfer);
        msg!("User {} now has {} won points", payer.key(), user.won_points);

        Ok(())
    }


    pub fn pay_for_points(ctx: Context<PayForPoints>, _bump: u8) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let treasury = &mut ctx.accounts.treasury;
        let staking_treasury = &mut ctx.accounts.staking_treasury;
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

        // Transfer 0.1 SOL to the staking treasury
        let staking_transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &payer.key(),
            &staking_treasury.key(),
            100_000_000,
        );
        anchor_lang::solana_program::program::invoke(
            &staking_transfer_instruction,
            &[
                payer.to_account_info(),
                staking_treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Add points to user
        user.points += 1000;
        msg!("User {} paid 1 SOL and received 1000 points.", payer.key());
        msg!("Buy Points: Yield Pool {}",  **staking_treasury.to_account_info().lamports.borrow());

        Ok(())
    }

    pub fn claim_lamports(ctx: Context<ClaimLamports>, _bump: u8) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let total_won_points = &ctx.accounts.total_won_points;
        let _staking_treasury = &mut ctx.accounts.staking_treasury;
        let _payer = &ctx.accounts.payer;

        // Calculate the ratio of user's won points to total won points
        let ratio = user.won_points as f64 / total_won_points.points as f64;
        msg!("User ratio: {}", ratio);
        msg!("User last claimed slot: {}", user.last_claimed_slot);
        msg!("User last claimed lamports: {}", user.last_claimed_lamports);

        // Get the current slot
        let current_slot = Clock::get()?.slot;

        // Transfer lamports from staking treasury to the payer
        // let lamports_transferred = transfer_from_staking_treasury(staking_treasury, payer, ratio)?;

        // Update user's last claimed slot and last claimed lamports
        user.last_claimed_slot = current_slot;
        //user.last_claimed_lamports = lamports_transferred;

        msg!("Updated user last claimed slot: {}", user.last_claimed_slot);
        //msg!("Updated user last claimed lamports: {}", user.last_claimed_lamports);

        Ok(())
    }
}

fn calculate_point_rate_internal(
    staking_treasury: &Account<StakingTreasury>,
    total_won_points: &Account<TotalWonPoints>,
    rate: &mut Account<Rate>,
) -> Result<()> {
    let staking_treasury_balance = **staking_treasury.to_account_info().lamports.borrow() as f64;
    let total_points = total_won_points.points as f64;

    if total_points == 0.0 {
        rate.value = 0.0;
    } else {
        rate.value = staking_treasury_balance / total_points;
    }

    msg!("Point rate: {} lamports per point", rate.value);
    Ok(())
}

/*
fn transfer_from_staking_treasury(
    staking_treasury: &mut Account<StakingTreasury>,
    payer: &Signer,
    ratio: f64,
) -> Result<u64> {
    let staking_treasury_balance = **staking_treasury.to_account_info().lamports.borrow();
    let rent_exemption = Rent::get()?.minimum_balance(staking_treasury.to_account_info().data_len());

    // Calculate the amount to transfer based on the ratio
    let transfer_amount = (staking_treasury_balance.checked_sub(rent_exemption).ok_or(ProgramError::InsufficientFunds)? as f64 * ratio) as u64;

    // Ensure the calculated transfer amount doesn't exceed the balance minus rent exemption
    if transfer_amount > staking_treasury_balance.checked_sub(rent_exemption).ok_or(ProgramError::InsufficientFunds)? {
        return Err(ProgramError::InsufficientFunds.into());
    }

    **staking_treasury.to_account_info().lamports.borrow_mut() -= transfer_amount;
    **payer.to_account_info().lamports.borrow_mut() += transfer_amount;

    msg!("Transferred {} lamports from staking treasury {} to user {}", transfer_amount, staking_treasury.key(), payer.key());
    Ok(transfer_amount)
}
*/

fn transfer_from_treasury(treasury: &mut Account<Treasury>, payer: &Signer, number_to_test: u64, power_up: f64) -> Result<()> {
    let treasury_balance = **treasury.to_account_info().lamports.borrow();
    let rent_exemption = Rent::get()?.minimum_balance(treasury.to_account_info().data_len());
    let payer_pubkey = payer.key();

    // Calculate the amount to transfer based on the prime number ending and power-up
    let transfer_amount = if number_to_test % 100 == 1 {
        treasury_balance.checked_sub(rent_exemption).ok_or(ProgramError::InsufficientFunds)?
    } else {
        (treasury_balance.checked_sub(rent_exemption).ok_or(ProgramError::InsufficientFunds)? as f64 * power_up) as u64
    };

    **treasury.to_account_info().lamports.borrow_mut() -= transfer_amount;
    **payer.to_account_info().lamports.borrow_mut() += transfer_amount;

    msg!("Transferred {} lamports from treasury {} to user {}", transfer_amount, treasury.key(), payer.key());
    msg!("Winner: User: {} Lamports: {} Power-up: {}", payer_pubkey, transfer_amount, power_up);
    Ok(())
}

fn update_player_list(player_list: &mut Account<PlayerList>, new_player: Pubkey) {
    if player_list.players.len() >= 10 {
        player_list.players.remove(0);
    }
    player_list.players.push(new_player);
}

fn update_leaderboard(leaderboard: &mut Account<Leaderboard>, user: Pubkey, points: i64) {
    // Remove the user if they are already in the leaderboard
    leaderboard.users.retain(|entry| entry.user != user);

    // Add the user back with updated points
    leaderboard.users.push(UserEntry { user, points });

    // Sort the leaderboard by points in descending order and keep only the top 100
    leaderboard.users.sort_by(|a, b| b.points.cmp(&a.points));
    leaderboard.users.truncate(100);

    // Log the specific user and their points
    msg!("Leaderboard: User: {}, Points: {}", user.to_string(), points);
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init_if_needed, payer = payer, space = Jackpot::LEN, seeds = [b"jackpot"], bump)]
    pub jackpot: Box<Account<'info, Jackpot>>,
    #[account(init_if_needed, payer = payer, space = Treasury::LEN, seeds = [b"treasury"], bump)]
    pub treasury: Box<Account<'info, Treasury>>,
    #[account(init_if_needed, payer = payer, space = PlayerList::LEN, seeds = [b"player_list"], bump)]
    pub player_list: Box<Account<'info, PlayerList>>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeTotalWonPoints<'info> {
    #[account(init_if_needed, payer = payer, space = TotalWonPoints::LEN, seeds = [b"total_won_points"], bump)]
    pub total_won_points: Box<Account<'info, TotalWonPoints>>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeStakingTreasury<'info> {
    #[account(init_if_needed, payer = payer, space = StakingTreasury::LEN, seeds = [b"staking_treasury"], bump)]
    pub staking_treasury: Box<Account<'info, StakingTreasury>>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeLeaderboard<'info> {
    #[account(init_if_needed, payer = payer, space = Leaderboard::LEN, seeds = [b"leaderboard"], bump)]
    pub leaderboard: Box<Account<'info, Leaderboard>>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(init_if_needed, payer = payer, space = User::LEN, seeds = [b"user", payer.key().as_ref()], bump)]
    pub user: Box<Account<'info, User>>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeRate<'info> {
    #[account(init_if_needed, payer = payer, space = Rate::LEN, seeds = [b"rate"], bump)]
    pub rate: Box<Account<'info, Rate>>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckSlot<'info> {
    #[account(mut, seeds = [b"user", payer.key().as_ref()], bump)]
    pub user: Box<Account<'info, User>>,
    #[account(mut, seeds = [b"jackpot"], bump)]
    pub jackpot: Box<Account<'info, Jackpot>>,
    #[account(mut, seeds = [b"total_won_points"], bump)]
    pub total_won_points: Box<Account<'info, TotalWonPoints>>,
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: Box<Account<'info, Treasury>>,
    #[account(mut, seeds = [b"player_list"], bump)]
    pub player_list: Box<Account<'info, PlayerList>>,
    #[account(mut, seeds = [b"leaderboard"], bump)]
    pub leaderboard: Box<Account<'info, Leaderboard>>,
    #[account(mut, seeds = [b"staking_treasury"], bump)]
    pub staking_treasury: Box<Account<'info, StakingTreasury>>,
    #[account(mut, seeds = [b"rate"], bump)]
    pub rate: Box<Account<'info, Rate>>,
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
pub struct PayForPoints<'info> {
    #[account(mut, seeds = [b"user", payer.key().as_ref()], bump)]
    pub user: Box<Account<'info, User>>,
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: Box<Account<'info, Treasury>>,
    #[account(mut, seeds = [b"staking_treasury"], bump)]
    pub staking_treasury: Box<Account<'info, StakingTreasury>>,
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimLamports<'info> {
    #[account(mut, seeds = [b"user", payer.key().as_ref()], bump)]
    pub user: Box<Account<'info, User>>,
    #[account(mut, seeds = [b"total_won_points"], bump)]
    pub total_won_points: Box<Account<'info, TotalWonPoints>>,
    #[account(mut, seeds = [b"staking_treasury"], bump)]
    pub staking_treasury: Box<Account<'info, StakingTreasury>>,
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TradeWonPoints<'info> {
    #[account(mut, seeds = [b"user", payer.key().as_ref()], bump)]
    pub user: Box<Account<'info, User>>,
    #[account(mut, seeds = [b"rate"], bump)]
    pub rate: Box<Account<'info, Rate>>,
    #[account(mut, seeds = [b"total_won_points"], bump)]
    pub total_won_points: Box<Account<'info, TotalWonPoints>>,
    #[account(mut, seeds = [b"staking_treasury"], bump)]
    pub staking_treasury: Box<Account<'info, StakingTreasury>>,
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}


#[account]
pub struct User {
    pub points: i64,
    pub won_points: i64,
    pub last_won_slot: u64,
    pub last_claimed_slot: u64,
    pub last_claimed_lamports: u64,
}

#[account]
pub struct Jackpot {
    pub amount: i64,
    pub winner: Pubkey,
}

#[account]
pub struct StakingTreasury {}

#[account]
pub struct TotalWonPoints {
    pub points: u64,
}

#[account]
pub struct Treasury {
    pub amount: i64,
}

#[account]
pub struct PlayerList {
    pub players: Vec<Pubkey>,
}

#[account]
pub struct Leaderboard {
    pub users: Vec<UserEntry>,
}

#[account]
pub struct Rate {
    pub value: f64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UserEntry {
    pub user: Pubkey,
    pub points: i64,
}

impl PlayerList {
    const LEN: usize = 8 + (32 * 20) + 32; // Discriminator + 20 Pubkeys
}

impl User {
    const LEN: usize = 8 * 6;
}

impl Jackpot {
    const LEN: usize = 8 + 8 + 32; // Discriminator + amount + Pubkey
}

impl TotalWonPoints {
    const LEN: usize = 8 + 8; // Discriminator + amount
}

impl Treasury {
    const LEN: usize = 8 + 8; // Discriminator + amount
}

impl Leaderboard {
    const LEN: usize = 8 + (32 + 8) * 100; // Discriminator + 100 UserEntry
}

impl Rate {
    const LEN: usize = 8 + 8; // Discriminator + rate value
}

impl StakingTreasury {
    const LEN: usize = 8; // Discriminator
}

#[event]
pub struct PrimeFound {
    pub slot: u64,
    pub user_pubkey: Pubkey,
    pub power_up: f64,
    pub number_to_test: u64,
    pub reward_points: i64,
}

// Convert a public key to a number in the range of 1 to 100,000
fn pubkey_to_number(pubkey: &Pubkey) -> u32 {
    let mut number: u32 = 0;
    for byte in pubkey.to_bytes().iter() {
        number = number.wrapping_add(*byte as u32);
    }
    (number % 100_000) + 1
}

