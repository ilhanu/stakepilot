use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod agent_vault {
    use super::*;

    /// Initialize a new vault for a user
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.agent = ctx.accounts.agent.key();
        vault.balance = 0;
        vault.total_staked = 0;
        vault.bump = ctx.bumps.vault;
        
        let strategy = &mut ctx.accounts.strategy;
        strategy.vault = vault.key();
        strategy.risk_tolerance = RiskTolerance::Medium;
        strategy.target_apy = 800; // 8.00% in basis points
        strategy.max_validators = 5;
        strategy.prefer_decentralization = true;
        strategy.bump = ctx.bumps.strategy;
        
        emit!(VaultCreated {
            vault: vault.key(),
            owner: vault.owner,
            agent: vault.agent,
        });
        
        Ok(())
    }

    /// Deposit SOL into the vault
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, AgentVaultError::ZeroAmount);
        
        // Transfer SOL from user to vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.owner.to_account_info(),
                to: ctx.accounts.vault_sol.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, amount)?;
        
        // Update vault balance
        let vault = &mut ctx.accounts.vault;
        vault.balance = vault.balance.checked_add(amount).ok_or(AgentVaultError::Overflow)?;
        
        emit!(Deposited {
            vault: vault.key(),
            owner: ctx.accounts.owner.key(),
            amount,
            new_balance: vault.balance,
        });
        
        Ok(())
    }

    /// Withdraw SOL from the vault (only owner can call)
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let vault_key = vault.key();
        
        require!(amount > 0, AgentVaultError::ZeroAmount);
        require!(amount <= vault.balance, AgentVaultError::InsufficientBalance);
        
        // Transfer SOL from vault to user
        let bump = ctx.bumps.vault_sol;
        let seeds = &[
            b"vault_sol".as_ref(),
            vault_key.as_ref(),
            &[bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault_sol.to_account_info(),
                to: ctx.accounts.owner.to_account_info(),
            },
            signer,
        );
        system_program::transfer(cpi_context, amount)?;
        
        // Update vault balance
        vault.balance = vault.balance.checked_sub(amount).ok_or(AgentVaultError::Underflow)?;
        
        emit!(Withdrawn {
            vault: vault.key(),
            owner: ctx.accounts.owner.key(),
            amount,
            new_balance: vault.balance,
        });
        
        Ok(())
    }

    /// Update strategy parameters (only owner can call)
    pub fn update_strategy(
        ctx: Context<UpdateStrategy>,
        risk_tolerance: RiskTolerance,
        target_apy: u16,
        max_validators: u8,
        prefer_decentralization: bool,
    ) -> Result<()> {
        let strategy = &mut ctx.accounts.strategy;
        
        strategy.risk_tolerance = risk_tolerance;
        strategy.target_apy = target_apy;
        strategy.max_validators = max_validators;
        strategy.prefer_decentralization = prefer_decentralization;
        
        emit!(StrategyUpdated {
            vault: ctx.accounts.vault.key(),
            risk_tolerance,
            target_apy,
            max_validators,
            prefer_decentralization,
        });
        
        Ok(())
    }

    /// Execute stake operation (only agent can call)
    /// Agent can stake vault funds to validators but cannot withdraw to itself
    pub fn execute_stake(
        ctx: Context<ExecuteStake>,
        validator: Pubkey,
        amount: u64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        
        require!(amount > 0, AgentVaultError::ZeroAmount);
        require!(amount <= vault.balance, AgentVaultError::InsufficientBalance);
        
        // Verify the validator is in our allowed list or strategy permits it
        // For hackathon MVP, we trust the agent's validator selection
        
        // Create stake account and delegate
        // This will be implemented with native stake program CPI
        
        // Update vault state
        vault.balance = vault.balance.checked_sub(amount).ok_or(AgentVaultError::Underflow)?;
        vault.total_staked = vault.total_staked.checked_add(amount).ok_or(AgentVaultError::Overflow)?;
        
        emit!(StakeExecuted {
            vault: vault.key(),
            agent: ctx.accounts.agent.key(),
            validator,
            amount,
            remaining_balance: vault.balance,
            total_staked: vault.total_staked,
        });
        
        Ok(())
    }

    /// Execute unstake operation (only agent can call)
    /// Unstaked funds return to vault, not to agent
    pub fn execute_unstake(
        ctx: Context<ExecuteUnstake>,
        stake_account: Pubkey,
        amount: u64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        
        // Deactivate stake and return to vault
        // This will be implemented with native stake program CPI
        
        // Update vault state (funds return after cooldown)
        vault.total_staked = vault.total_staked.checked_sub(amount).ok_or(AgentVaultError::Underflow)?;
        
        emit!(UnstakeExecuted {
            vault: vault.key(),
            agent: ctx.accounts.agent.key(),
            stake_account,
            amount,
            total_staked: vault.total_staked,
        });
        
        Ok(())
    }

    /// Change the agent (only owner can call)
    pub fn change_agent(ctx: Context<ChangeAgent>, new_agent: Pubkey) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let old_agent = vault.agent;
        vault.agent = new_agent;
        
        emit!(AgentChanged {
            vault: vault.key(),
            old_agent,
            new_agent,
        });
        
        Ok(())
    }
}

// ============================================
// ACCOUNTS
// ============================================

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// The agent wallet that can execute staking operations
    /// CHECK: This is just a pubkey for authorization
    pub agent: UncheckedAccount<'info>,
    
    #[account(
        init,
        payer = owner,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", owner.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        init,
        payer = owner,
        space = 8 + Strategy::INIT_SPACE,
        seeds = [b"strategy", vault.key().as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,
    
    /// The PDA that holds the actual SOL
    #[account(
        seeds = [b"vault_sol", vault.key().as_ref()],
        bump
    )]
    /// CHECK: This is a PDA that holds SOL
    pub vault_sol: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AgentVaultError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        mut,
        seeds = [b"vault_sol", vault.key().as_ref()],
        bump
    )]
    /// CHECK: This is a PDA that holds SOL
    pub vault_sol: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AgentVaultError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        mut,
        seeds = [b"vault_sol", vault.key().as_ref()],
        bump
    )]
    /// CHECK: This is a PDA that holds SOL
    pub vault_sol: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateStrategy<'info> {
    pub owner: Signer<'info>,
    
    #[account(
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AgentVaultError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        mut,
        seeds = [b"strategy", vault.key().as_ref()],
        bump = strategy.bump,
    )]
    pub strategy: Account<'info, Strategy>,
}

#[derive(Accounts)]
pub struct ExecuteStake<'info> {
    pub agent: Signer<'info>,
    
    #[account(
        mut,
        has_one = agent @ AgentVaultError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        seeds = [b"strategy", vault.key().as_ref()],
        bump = strategy.bump,
    )]
    pub strategy: Account<'info, Strategy>,
    
    #[account(
        mut,
        seeds = [b"vault_sol", vault.key().as_ref()],
        bump
    )]
    /// CHECK: This is a PDA that holds SOL
    pub vault_sol: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
    // TODO: Add stake program and related accounts
}

#[derive(Accounts)]
pub struct ExecuteUnstake<'info> {
    pub agent: Signer<'info>,
    
    #[account(
        mut,
        has_one = agent @ AgentVaultError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        mut,
        seeds = [b"vault_sol", vault.key().as_ref()],
        bump
    )]
    /// CHECK: This is a PDA that holds SOL
    pub vault_sol: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
    // TODO: Add stake program and related accounts
}

#[derive(Accounts)]
pub struct ChangeAgent<'info> {
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ AgentVaultError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
}

// ============================================
// STATE
// ============================================

#[account]
#[derive(InitSpace)]
pub struct Vault {
    /// The owner who can deposit, withdraw, and change settings
    pub owner: Pubkey,
    /// The agent that can execute staking operations
    pub agent: Pubkey,
    /// Current unstaked balance in the vault (lamports)
    pub balance: u64,
    /// Total amount currently staked (lamports)
    pub total_staked: u64,
    /// PDA bump
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Strategy {
    /// The vault this strategy belongs to
    pub vault: Pubkey,
    /// Risk tolerance level
    pub risk_tolerance: RiskTolerance,
    /// Target APY in basis points (800 = 8.00%)
    pub target_apy: u16,
    /// Maximum number of validators to spread stake across
    pub max_validators: u8,
    /// Whether to prefer validators that help decentralization
    pub prefer_decentralization: bool,
    /// PDA bump
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum RiskTolerance {
    /// Conservative: Prefer established validators with long track records
    Low,
    /// Balanced: Mix of established and high-performing validators
    Medium,
    /// Aggressive: Prioritize APY, accept more variance
    High,
}

// ============================================
// EVENTS
// ============================================

#[event]
pub struct VaultCreated {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub agent: Pubkey,
}

#[event]
pub struct Deposited {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

#[event]
pub struct Withdrawn {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

#[event]
pub struct StrategyUpdated {
    pub vault: Pubkey,
    pub risk_tolerance: RiskTolerance,
    pub target_apy: u16,
    pub max_validators: u8,
    pub prefer_decentralization: bool,
}

#[event]
pub struct StakeExecuted {
    pub vault: Pubkey,
    pub agent: Pubkey,
    pub validator: Pubkey,
    pub amount: u64,
    pub remaining_balance: u64,
    pub total_staked: u64,
}

#[event]
pub struct UnstakeExecuted {
    pub vault: Pubkey,
    pub agent: Pubkey,
    pub stake_account: Pubkey,
    pub amount: u64,
    pub total_staked: u64,
}

#[event]
pub struct AgentChanged {
    pub vault: Pubkey,
    pub old_agent: Pubkey,
    pub new_agent: Pubkey,
}

// ============================================
// ERRORS
// ============================================

#[error_code]
pub enum AgentVaultError {
    #[msg("Unauthorized: caller is not the owner or agent")]
    Unauthorized,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Insufficient balance in vault")]
    InsufficientBalance,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Arithmetic underflow")]
    Underflow,
}
