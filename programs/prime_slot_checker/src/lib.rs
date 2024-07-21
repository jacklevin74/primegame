use anchor_lang::prelude::*;
use std::vec::Vec;

declare_id!("6MsNcwvyQCnze2FJrvL48Xab3ZvjJNaQ45w5vVgHGZXK");

#[program]
pub mod prime_slot_checker {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, _bump: u8) -> Result<()> {
        let jackpot = &mut ctx.accounts.jackpot;
        jackpot.amount = 0;
        msg!("Jackpot pool initialized with 0 amount.");
        Ok(())
    }

    pub fn initialize_user(ctx: Context<InitializeUser>, _bump: u8) -> Result<()> {
        let user = &mut ctx.accounts.user;
        user.points = 1000;
        msg!("User initialized with 1000 points.");
        Ok(())
    }

    pub fn check_slot(ctx: Context<CheckSlot>, _bump: u8) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let jackpot = &mut ctx.accounts.jackpot;

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
            msg!("Slot {} + User number {} = {} is prime. User {} rewarded with {} points.", slot, user_number, number_to_test, user.key(), jackpot.amount + 10);
            jackpot.amount = 0; // Reset the jackpot pool
        } else {
            jackpot.amount += 10;
            user.points -= 10;
            msg!("Slot {} + User number {} = {} is not prime. Jackpot pool increased by 10 points.", slot, user_number, number_to_test);
        }

        msg!("User {} now has {} points.", user.key(), user.points);
        msg!("Jackpot pool now has {} points.", jackpot.amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 8 + 8, seeds = [b"jackpot"], bump)]
    pub jackpot: Account<'info, Jackpot>,
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

#[account]
pub struct User {
    pub points: i64,
}

#[account]
pub struct Jackpot {
    pub amount: i64,
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

