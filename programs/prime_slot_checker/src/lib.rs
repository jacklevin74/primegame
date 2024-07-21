use anchor_lang::prelude::*;
use primal::is_prime;

declare_id!("CPEruFKwEu5897J7QeYzjxjkS5UR2eRZgEDchWmZ9v6s");

#[program]
pub mod prime_slot_checker {
    use super::*;
    
    pub fn initialize(ctx: Context<Initialize>, bump: u8) -> Result<()> {
        let jackpot = &mut ctx.accounts.jackpot;
        jackpot.amount = 0;
        msg!("Jackpot pool initialized with 0 amount.");
        Ok(())
    }

    pub fn initialize_user(ctx: Context<InitializeUser>, bump: u8) -> Result<()> {
        let user = &mut ctx.accounts.user;
        user.points = 1000;
        msg!("User initialized with 1000 points.");
        Ok(())
    }

    pub fn check_slot(ctx: Context<CheckSlot>, bump: u8) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let jackpot = &mut ctx.accounts.jackpot;

        // Get the current slot
        let slot = Clock::get()?.slot;

        // Check if the slot number is prime
        if is_prime(slot) {
            user.points += jackpot.amount + 10;
            msg!("Slot {} is prime. User {} rewarded with {} points.", slot, user.key(), jackpot.amount + 10);
            jackpot.amount = 0; // Reset the jackpot pool
        } else {
            jackpot.amount += 10;
            user.points -= 10;
            msg!("Slot {} is not prime. Jackpot pool increased by 10 points.", slot);
            msg!("Slot {} is not prime. User credit has been decreased by 10 points.", slot);
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

