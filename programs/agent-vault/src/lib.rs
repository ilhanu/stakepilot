use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    stake::{
        self,
        state::{Authorized, Lockup, StakeState},
    },
    system_instruction,
    program::invoke_signed,
    program::invoke,
};

declare_id!("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");

/// Staker Space Vault - A managed staking vault for decentralized validators
/// 
/// Users deposit SOL → Vault tracks balances → Agent stakes to validators
/// No LST tokens - just native SOL and stake accounts
#[program]
pub mod agent_vault {
    use super::*;

    /// Initialize the main vault (one-time setup by admin)
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.agent = ctx.accounts.agent.key();
        vault.total_deposits = 0;
        vault.total_staked = 0;
        vault.total_users = 0;
        vault.bump = *ctx.bumps.get("vault").unwrap();
        
        msg!("Vault initialized. Authority: {}, Agent: {}", vault.authority, vault.agent);
        Ok(())
    }

    /// User deposits SOL into the vault
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount >= 10_000_000, VaultError::MinimumDeposit); // 0.01 SOL minimum
        
        // Transfer SOL from user to vault
        let transfer_ix = system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.vault.key(),
            amount,
        );
        invoke(
            &transfer_ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Update or create user deposit record
        let user_deposit = &mut ctx.accounts.user_deposit;
        let is_new_user = user_deposit.amount == 0;
        user_deposit.user = ctx.accounts.user.key();
        user_deposit.amount = user_deposit.amount.checked_add(amount).unwrap();
        user_deposit.deposit_time = Clock::get()?.unix_timestamp;
        user_deposit.bump = *ctx.bumps.get("user_deposit").unwrap();

        // Update vault totals
        let vault = &mut ctx.accounts.vault;
        vault.total_deposits = vault.total_deposits.checked_add(amount).unwrap();
        if is_new_user {
            vault.total_users = vault.total_users.checked_add(1).unwrap();
        }

        msg!("Deposited {} lamports from {}", amount, ctx.accounts.user.key());
        Ok(())
    }

    /// User requests unstake (initiates deactivation)
    pub fn request_unstake(ctx: Context<RequestUnstake>, amount: u64) -> Result<()> {
        let user_deposit = &mut ctx.accounts.user_deposit;
        require!(user_deposit.amount >= amount, VaultError::InsufficientBalance);
        
        user_deposit.pending_unstake = user_deposit.pending_unstake.checked_add(amount).unwrap();
        user_deposit.unstake_request_time = Clock::get()?.unix_timestamp;
        
        msg!("Unstake requested: {} lamports for {}", amount, ctx.accounts.user.key());
        Ok(())
    }

    /// User withdraws after cooldown period
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let user_deposit = &mut ctx.accounts.user_deposit;
        let vault = &mut ctx.accounts.vault;
        
        // Check user has enough pending unstake that's ready
        require!(user_deposit.pending_unstake >= amount, VaultError::NoPendingUnstake);
        
        // Check cooldown period (1 epoch ≈ 2-3 days on mainnet)
        let current_time = Clock::get()?.unix_timestamp;
        let cooldown_seconds = 3600; // 1 hour (testnet — mainnet would be ~172800)
        require!(
            current_time - user_deposit.unstake_request_time >= cooldown_seconds,
            VaultError::CooldownNotComplete
        );

        // Transfer SOL from vault to user (direct lamport manipulation for PDAs)
        **vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += amount;

        // Update records
        user_deposit.amount = user_deposit.amount.checked_sub(amount).unwrap();
        user_deposit.pending_unstake = user_deposit.pending_unstake.checked_sub(amount).unwrap();
        vault.total_deposits = vault.total_deposits.checked_sub(amount).unwrap();

        msg!("Withdrawn {} lamports to {}", amount, ctx.accounts.user.key());
        Ok(())
    }

    /// Agent stakes vault funds to a validator
    /// Agent pays upfront to create stake account, vault reimburses
    pub fn stake_to_validator(
        ctx: Context<StakeToValidator>,
        amount: u64,
    ) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(ctx.accounts.agent.key() == vault.agent, VaultError::UnauthorizedAgent);
        require!(amount >= 1_000_000_000, VaultError::MinimumStake); // 1 SOL minimum
        
        // Calculate rent for stake account
        let stake_space = std::mem::size_of::<StakeState>();
        let stake_rent = Rent::get()?.minimum_balance(stake_space);
        let total_lamports = amount.checked_add(stake_rent).unwrap();
        
        // Check vault has enough lamports to reimburse
        let vault_lamports = vault.to_account_info().lamports();
        require!(vault_lamports >= total_lamports + 100_000, VaultError::InsufficientBalance);
        
        let vault_bump = vault.bump;
        let vault_seeds: &[&[u8]] = &[b"vault", &[vault_bump]];

        // Step 1: Agent creates stake account with FULL amount (rent + stake)
        // Agent pays upfront, vault will reimburse
        let create_ix = system_instruction::create_account(
            &ctx.accounts.agent.key(),  // Funder (agent pays)
            &ctx.accounts.stake_account.key(),  // New account
            total_lamports,  // Full amount: rent + stake
            stake_space as u64,
            &stake::program::ID,
        );
        
        invoke(
            &create_ix,
            &[
                ctx.accounts.agent.to_account_info(),
                ctx.accounts.stake_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Step 2: Initialize stake account with vault as staker/withdrawer
        let init_ix = stake::instruction::initialize(
            &ctx.accounts.stake_account.key(),
            &Authorized {
                staker: ctx.accounts.vault.key(),
                withdrawer: ctx.accounts.vault.key(),
            },
            &Lockup::default(),
        );
        
        invoke(
            &init_ix,
            &[
                ctx.accounts.stake_account.to_account_info(),
                ctx.accounts.rent.to_account_info(),
            ],
        )?;

        // Step 3: Delegate to validator (vault signs as staker)
        let delegate_ix = stake::instruction::delegate_stake(
            &ctx.accounts.stake_account.key(),
            &ctx.accounts.vault.key(),  // Staker authority
            &ctx.accounts.validator_vote.key(),
        );
        
        invoke_signed(
            &delegate_ix,
            &[
                ctx.accounts.stake_account.to_account_info(),
                ctx.accounts.validator_vote.to_account_info(),
                ctx.accounts.clock.to_account_info(),
                ctx.accounts.stake_history.to_account_info(),
                ctx.accounts.stake_config.to_account_info(),
                ctx.accounts.vault.to_account_info(),  // Staker signs
            ],
            &[vault_seeds],
        )?;

        // Step 4: Vault reimburses agent for the full amount (rent + stake)
        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= total_lamports;
        **ctx.accounts.agent.to_account_info().try_borrow_mut_lamports()? += total_lamports;

        // Update vault accounting
        let vault = &mut ctx.accounts.vault;
        vault.total_staked = vault.total_staked.checked_add(amount).unwrap();

        msg!("Staked {} lamports to validator {}", amount, ctx.accounts.validator_vote.key());
        Ok(())
    }

    /// Agent deactivates stake (for rebalancing or unstake requests)
    pub fn deactivate_stake(ctx: Context<DeactivateStake>) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(ctx.accounts.agent.key() == vault.agent, VaultError::UnauthorizedAgent);
        
        let vault_bump = vault.bump;
        let vault_seeds: &[&[u8]] = &[b"vault", &[vault_bump]];

        let deactivate_ix = stake::instruction::deactivate_stake(
            &ctx.accounts.stake_account.key(),
            &ctx.accounts.vault.key(),
        );
        
        invoke_signed(
            &deactivate_ix,
            &[
                ctx.accounts.stake_account.to_account_info(),
                ctx.accounts.clock.to_account_info(),
                ctx.accounts.vault.to_account_info(),
            ],
            &[vault_seeds],
        )?;

        msg!("Deactivated stake account {}", ctx.accounts.stake_account.key());
        Ok(())
    }

    /// Agent withdraws deactivated stake back to vault
    pub fn withdraw_stake(ctx: Context<WithdrawStake>) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(ctx.accounts.agent.key() == vault.agent, VaultError::UnauthorizedAgent);
        
        let vault_bump = vault.bump;
        let vault_seeds: &[&[u8]] = &[b"vault", &[vault_bump]];

        // Get stake account balance before withdrawal
        let stake_balance = ctx.accounts.stake_account.lamports();

        let withdraw_ix = stake::instruction::withdraw(
            &ctx.accounts.stake_account.key(),
            &ctx.accounts.vault.key(),  // Withdrawer
            &ctx.accounts.vault.key(),  // Destination
            stake_balance,
            None,
        );
        
        invoke_signed(
            &withdraw_ix,
            &[
                ctx.accounts.stake_account.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.clock.to_account_info(),
                ctx.accounts.stake_history.to_account_info(),
                ctx.accounts.vault.to_account_info(),  // Withdrawer signs
            ],
            &[vault_seeds],
        )?;

        // Update vault
        let vault = &mut ctx.accounts.vault;
        vault.total_staked = vault.total_staked.saturating_sub(stake_balance);

        msg!("Withdrew {} lamports from stake account", stake_balance);
        Ok(())
    }

    /// Update agent address (authority only)
    pub fn update_agent(ctx: Context<UpdateAgent>, new_agent: Pubkey) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(ctx.accounts.authority.key() == vault.authority, VaultError::UnauthorizedAuthority);
        
        let old_agent = vault.agent;
        vault.agent = new_agent;
        
        msg!("Agent updated from {} to {}", old_agent, new_agent);
        Ok(())
    }
}

// ============================================
// ACCOUNTS
// ============================================

#[account]
pub struct Vault {
    pub authority: Pubkey,      // Admin who can update agent
    pub agent: Pubkey,          // Agent who can stake/unstake
    pub total_deposits: u64,    // Total SOL deposited by users
    pub total_staked: u64,      // Total SOL currently staked
    pub total_users: u64,       // Number of depositors
    pub bump: u8,
}

#[account]
pub struct UserDeposit {
    pub user: Pubkey,
    pub amount: u64,
    pub pending_unstake: u64,
    pub deposit_time: i64,
    pub unstake_request_time: i64,
    pub bump: u8,
}

// ============================================
// CONTEXTS
// ============================================

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 1,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Agent wallet address
    pub agent: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 1,
        seeds = [b"deposit", user.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestUnstake<'info> {
    #[account(
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        mut,
        seeds = [b"deposit", user.key().as_ref()],
        bump = user_deposit.bump,
        constraint = user_deposit.user == user.key()
    )]
    pub user_deposit: Account<'info, UserDeposit>,
    
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        mut,
        seeds = [b"deposit", user.key().as_ref()],
        bump = user_deposit.bump,
        constraint = user_deposit.user == user.key()
    )]
    pub user_deposit: Account<'info, UserDeposit>,
    
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct StakeToValidator<'info> {
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(mut)]
    pub agent: Signer<'info>,
    
    /// CHECK: Stake account - created in this instruction
    /// Must be a new keypair signed by the agent
    #[account(mut)]
    pub stake_account: Signer<'info>,
    
    /// CHECK: Validator vote account
    pub validator_vote: UncheckedAccount<'info>,
    
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
    pub stake_history: Sysvar<'info, StakeHistory>,
    
    /// CHECK: Stake config
    #[account(address = stake::config::ID)]
    pub stake_config: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
    
    /// CHECK: Stake program
    #[account(address = stake::program::ID)]
    pub stake_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct DeactivateStake<'info> {
    #[account(
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    
    pub agent: Signer<'info>,
    
    /// CHECK: Stake account to deactivate
    #[account(mut)]
    pub stake_account: UncheckedAccount<'info>,
    
    pub clock: Sysvar<'info, Clock>,
    
    /// CHECK: Stake program
    #[account(address = stake::program::ID)]
    pub stake_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct WithdrawStake<'info> {
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    
    pub agent: Signer<'info>,
    
    /// CHECK: Stake account to withdraw from
    #[account(mut)]
    pub stake_account: UncheckedAccount<'info>,
    
    pub clock: Sysvar<'info, Clock>,
    pub stake_history: Sysvar<'info, StakeHistory>,
    
    /// CHECK: Stake program
    #[account(address = stake::program::ID)]
    pub stake_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    
    pub authority: Signer<'info>,
}

// ============================================
// ERRORS
// ============================================

#[error_code]
pub enum VaultError {
    #[msg("Minimum deposit is 0.01 SOL")]
    MinimumDeposit,
    #[msg("Minimum stake is 1 SOL")]
    MinimumStake,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("No pending unstake")]
    NoPendingUnstake,
    #[msg("Cooldown period not complete")]
    CooldownNotComplete,
    #[msg("Unauthorized agent")]
    UnauthorizedAgent,
    #[msg("Unauthorized authority")]
    UnauthorizedAuthority,
}
