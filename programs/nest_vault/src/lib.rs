//! Nest Finance vault: time-locked savings for Solana Mobile.
//!
//! Savings live in a program-owned vault. Every outgoing transfer waits a delay during
//! which the owner, a guardian or the app's sentinel key can cancel it. A lockdown freezes
//! the vault and voids every pending request at once. Even an attacker holding the owner's
//! real key cannot move funds faster than the delay allows.

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

pub mod errors;
pub mod events;
pub mod state;

use errors::VaultError;
use events::*;
use state::*;

declare_id!("EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ");

#[program]
pub mod nest_vault {
    use super::*;

    /// Creates the vault. Settings take effect immediately here because the vault is empty.
    pub fn init_vault(ctx: Context<InitVault>, params: VaultParams) -> Result<()> {
        let owner = ctx.accounts.owner.key();
        params.validate(&owner)?;
        let now = Clock::get()?.unix_timestamp;

        let vault = &mut ctx.accounts.vault;
        vault.owner = owner;
        vault.lockdown_until = 0;
        vault.epoch = 0;
        vault.next_withdrawal_id = 0;
        vault.bump = ctx.bumps.vault;
        vault.apply_params(&params, now);

        emit!(VaultCreated { vault: vault.key(), owner, delay_secs: vault.delay_secs });
        Ok(())
    }

    /// Anyone can add SOL. Plain transfers to the vault address also work.
    pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.depositor.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;
        emit!(Deposited {
            vault: ctx.accounts.vault.key(),
            mint: NATIVE_SOL,
            amount,
            from: ctx.accounts.depositor.key(),
        });
        Ok(())
    }

    /// Moves SPL tokens (SKR included) into the vault's associated token account.
    pub fn deposit_token(ctx: Context<DepositToken>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: ctx.accounts.depositor_token.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.vault_token.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.mint.decimals,
        )?;
        emit!(Deposited {
            vault: ctx.accounts.vault.key(),
            mint: ctx.accounts.mint.key(),
            amount,
            from: ctx.accounts.depositor.key(),
        });
        Ok(())
    }

    /// Queues a withdrawal that unlocks after the vault's delay.
    /// `destination` is a wallet for SOL, or a token account for SPL.
    pub fn request_withdrawal(
        ctx: Context<RequestWithdrawal>,
        mint: Pubkey,
        amount: u64,
        destination: Pubkey,
    ) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        let now = Clock::get()?.unix_timestamp;
        let vault = &mut ctx.accounts.vault;
        vault.require_open(now)?;
        require_keys_neq!(destination, vault.key(), VaultError::DestinationIsVault);

        let id = vault.next_withdrawal_id;
        vault.next_withdrawal_id = id.checked_add(1).ok_or(VaultError::Overflow)?;
        let unlock_at = now.checked_add(vault.delay_secs).ok_or(VaultError::Overflow)?;

        let pending = &mut ctx.accounts.pending;
        pending.vault = vault.key();
        pending.id = id;
        pending.mint = mint;
        pending.amount = amount;
        pending.destination = destination;
        pending.requested_at = now;
        pending.unlock_at = unlock_at;
        pending.epoch = vault.epoch;
        pending.bump = ctx.bumps.pending;

        emit!(WithdrawalRequested {
            vault: vault.key(),
            pending: pending.key(),
            id,
            mint,
            amount,
            destination,
            unlock_at,
        });
        Ok(())
    }

    /// Pays out a matured withdrawal. Permissionless: the funds can only go to the
    /// destination fixed at request time.
    pub fn execute_withdrawal(ctx: Context<ExecuteWithdrawal>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let vault = &ctx.accounts.vault;
        let pending = &ctx.accounts.pending;
        vault.require_open(now)?;
        require!(pending.epoch == vault.epoch, VaultError::VoidedByLockdown);
        require!(now >= pending.unlock_at, VaultError::StillLocked);

        pay_out(
            vault,
            pending.mint,
            pending.amount,
            &ctx.accounts.destination.to_account_info(),
            &ctx.accounts.mint,
            &ctx.accounts.vault_token,
            &ctx.accounts.token_program,
        )?;

        emit!(WithdrawalExecuted {
            vault: vault.key(),
            id: pending.id,
            amount: pending.amount,
            expedited: false,
        });
        Ok(())
    }

    /// Owner and a guardian together release a pending withdrawal before its delay ends.
    pub fn expedite_withdrawal(ctx: Context<ExpediteWithdrawal>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let vault = &ctx.accounts.vault;
        let pending = &ctx.accounts.pending;
        require!(vault.is_guardian(&ctx.accounts.guardian.key()), VaultError::NotGuardian);
        vault.require_open(now)?;
        require!(pending.epoch == vault.epoch, VaultError::VoidedByLockdown);

        pay_out(
            vault,
            pending.mint,
            pending.amount,
            &ctx.accounts.destination.to_account_info(),
            &ctx.accounts.mint,
            &ctx.accounts.vault_token,
            &ctx.accounts.token_program,
        )?;

        emit!(WithdrawalExecuted {
            vault: vault.key(),
            id: pending.id,
            amount: pending.amount,
            expedited: true,
        });
        Ok(())
    }

    /// Owner, any guardian, or the sentinel can cancel. Rent returns to the vault.
    pub fn cancel_withdrawal(ctx: Context<CancelWithdrawal>) -> Result<()> {
        let by = ctx.accounts.authority.key();
        let role = ctx.accounts.vault.role_of(&by).ok_or(VaultError::Unauthorized)?;
        emit!(WithdrawalCancelled {
            vault: ctx.accounts.vault.key(),
            id: ctx.accounts.pending.id,
            by,
            role,
        });
        Ok(())
    }

    /// Immediate transfer, but only to an address on the safe list and never in lockdown.
    /// For SPL the destination token account must be owned by a safe address.
    pub fn instant_withdraw(ctx: Context<InstantWithdraw>, mint: Pubkey, amount: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let vault = &ctx.accounts.vault;
        vault.require_open(now)?;

        let destination = ctx.accounts.destination.to_account_info();
        let safe_owner = if mint == NATIVE_SOL {
            destination.key()
        } else {
            let token_program = ctx
                .accounts
                .token_program
                .as_ref()
                .ok_or(VaultError::MissingTokenAccounts)?;
            require_keys_eq!(*destination.owner, token_program.key(), VaultError::DestinationMismatch);
            let data = destination.try_borrow_data()?;
            let account = TokenAccount::try_deserialize(&mut &data[..])?;
            require_keys_eq!(account.mint, mint, VaultError::MintMismatch);
            account.owner
        };
        require!(vault.safe_list.contains(&safe_owner), VaultError::NotSafeAddress);

        pay_out(
            vault,
            mint,
            amount,
            &destination,
            &ctx.accounts.mint,
            &ctx.accounts.vault_token,
            &ctx.accounts.token_program,
        )?;

        emit!(InstantWithdrawal {
            vault: vault.key(),
            mint,
            amount,
            destination: destination.key(),
        });
        Ok(())
    }

    /// Freezes the vault for `lockdown_secs` and voids every pending request.
    /// Callable by the owner, any guardian, or the sentinel (the duress PIN path).
    pub fn lockdown(ctx: Context<Lockdown>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let by = ctx.accounts.authority.key();
        let vault = &mut ctx.accounts.vault;
        let role = vault.role_of(&by).ok_or(VaultError::Unauthorized)?;

        let until = now.checked_add(vault.lockdown_secs).ok_or(VaultError::Overflow)?;
        vault.lockdown_until = vault.lockdown_until.max(until);
        vault.epoch = vault.epoch.checked_add(1).ok_or(VaultError::Overflow)?;

        emit!(LockdownTriggered {
            vault: vault.key(),
            by,
            role,
            until: vault.lockdown_until,
            epoch: vault.epoch,
        });
        Ok(())
    }

    /// Ends a lockdown early. Needs the owner and a guardian together, so a coerced
    /// owner alone cannot undo it.
    pub fn lift_lockdown(ctx: Context<LiftLockdown>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let vault = &mut ctx.accounts.vault;
        require!(vault.is_guardian(&ctx.accounts.guardian.key()), VaultError::NotGuardian);
        require!(vault.in_lockdown(now), VaultError::NotInLockdown);

        vault.lockdown_until = now;
        vault.epoch = vault.epoch.checked_add(1).ok_or(VaultError::Overflow)?;

        emit!(LockdownLifted {
            vault: vault.key(),
            guardian: ctx.accounts.guardian.key(),
            epoch: vault.epoch,
        });
        Ok(())
    }

    /// Any settings change after creation waits the full delay, like a withdrawal.
    pub fn propose_config(ctx: Context<ProposeConfig>, params: VaultParams) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let vault = &ctx.accounts.vault;
        vault.require_open(now)?;
        params.validate(&vault.owner)?;

        let apply_at = now.checked_add(vault.delay_secs).ok_or(VaultError::Overflow)?;
        let pending = &mut ctx.accounts.pending_config;
        pending.vault = vault.key();
        pending.params = params;
        pending.proposed_at = now;
        pending.apply_at = apply_at;
        pending.epoch = vault.epoch;
        pending.bump = ctx.bumps.pending_config;

        emit!(ConfigProposed { vault: vault.key(), apply_at });
        Ok(())
    }

    /// Applies a matured settings change. Permissionless.
    pub fn apply_config(ctx: Context<ApplyConfig>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let pending = &ctx.accounts.pending_config;
        let vault = &mut ctx.accounts.vault;
        vault.require_open(now)?;
        require!(pending.epoch == vault.epoch, VaultError::VoidedByLockdown);
        require!(now >= pending.apply_at, VaultError::ConfigStillLocked);

        vault.apply_params(&pending.params, now);
        emit!(ConfigApplied { vault: vault.key() });
        Ok(())
    }

    pub fn cancel_config(ctx: Context<CancelConfig>) -> Result<()> {
        let by = ctx.accounts.authority.key();
        let role = ctx.accounts.vault.role_of(&by).ok_or(VaultError::Unauthorized)?;
        emit!(ConfigCancelled { vault: ctx.accounts.vault.key(), by, role });
        Ok(())
    }

    /// Guardians check in so the owner (and Phase 5 SKR stipends) can see they are reachable.
    pub fn guardian_heartbeat(ctx: Context<GuardianHeartbeat>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let guardian = ctx.accounts.guardian.key();
        let vault = &mut ctx.accounts.vault;
        let index = vault
            .guardians
            .iter()
            .position(|g| *g == guardian)
            .ok_or(VaultError::NotGuardian)?;
        vault.guardian_last_seen[index] = now;
        emit!(GuardianCheckedIn { vault: vault.key(), guardian, at: now });
        Ok(())
    }
}

/// Moves SOL or SPL tokens out of the vault. SOL keeps the vault rent-exempt.
fn pay_out<'info>(
    vault: &Account<'info, Vault>,
    mint_key: Pubkey,
    amount: u64,
    destination: &AccountInfo<'info>,
    mint: &Option<InterfaceAccount<'info, Mint>>,
    vault_token: &Option<InterfaceAccount<'info, TokenAccount>>,
    token_program: &Option<Interface<'info, TokenInterface>>,
) -> Result<()> {
    require!(amount > 0, VaultError::ZeroAmount);

    if mint_key == NATIVE_SOL {
        let vault_info = vault.to_account_info();
        let rent_floor = Rent::get()?.minimum_balance(vault_info.data_len());
        let available = vault_info.lamports().saturating_sub(rent_floor);
        require!(available >= amount, VaultError::InsufficientFunds);

        let new_vault = vault_info.lamports() - amount;
        let new_dest = destination
            .lamports()
            .checked_add(amount)
            .ok_or(VaultError::Overflow)?;
        **vault_info.try_borrow_mut_lamports()? = new_vault;
        **destination.try_borrow_mut_lamports()? = new_dest;
        return Ok(());
    }

    let (Some(mint), Some(vault_token), Some(token_program)) = (mint, vault_token, token_program)
    else {
        return err!(VaultError::MissingTokenAccounts);
    };
    require_keys_eq!(mint.key(), mint_key, VaultError::MintMismatch);
    require_keys_eq!(vault_token.mint, mint_key, VaultError::MintMismatch);
    require_keys_eq!(vault_token.owner, vault.key(), VaultError::Unauthorized);
    require!(vault_token.amount >= amount, VaultError::InsufficientFunds);

    let owner = vault.owner;
    let seeds: &[&[u8]] = &[VAULT_SEED, owner.as_ref(), &[vault.bump]];
    transfer_checked(
        CpiContext::new_with_signer(
            token_program.key(),
            TransferChecked {
                from: vault_token.to_account_info(),
                mint: mint.to_account_info(),
                to: destination.clone(),
                authority: vault.to_account_info(),
            },
            &[seeds],
        ),
        amount,
        mint.decimals,
    )
}

#[derive(Accounts)]
pub struct InitVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + Vault::INIT_SPACE,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED, vault.owner.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositToken<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(seeds = [VAULT_SEED, vault.owner.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    #[account(mint::token_program = token_program)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = depositor,
        token::token_program = token_program
    )]
    pub depositor_token: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program
    )]
    pub vault_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestWithdrawal<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        payer = owner,
        space = 8 + PendingWithdrawal::INIT_SPACE,
        seeds = [WITHDRAWAL_SEED, vault.key().as_ref(), &vault.next_withdrawal_id.to_le_bytes()],
        bump
    )]
    pub pending: Account<'info, PendingWithdrawal>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteWithdrawal<'info> {
    #[account(mut, seeds = [VAULT_SEED, vault.owner.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    #[account(mut, has_one = vault, close = vault)]
    pub pending: Account<'info, PendingWithdrawal>,
    /// CHECK: pinned to the destination fixed in the request.
    #[account(mut, address = pending.destination @ VaultError::DestinationMismatch)]
    pub destination: UncheckedAccount<'info>,
    pub mint: Option<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub vault_token: Option<InterfaceAccount<'info, TokenAccount>>,
    pub token_program: Option<Interface<'info, TokenInterface>>,
}

#[derive(Accounts)]
pub struct ExpediteWithdrawal<'info> {
    pub owner: Signer<'info>,
    pub guardian: Signer<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut, has_one = vault, close = vault)]
    pub pending: Account<'info, PendingWithdrawal>,
    /// CHECK: pinned to the destination fixed in the request.
    #[account(mut, address = pending.destination @ VaultError::DestinationMismatch)]
    pub destination: UncheckedAccount<'info>,
    pub mint: Option<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub vault_token: Option<InterfaceAccount<'info, TokenAccount>>,
    pub token_program: Option<Interface<'info, TokenInterface>>,
}

#[derive(Accounts)]
pub struct CancelWithdrawal<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED, vault.owner.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    #[account(mut, has_one = vault, close = vault)]
    pub pending: Account<'info, PendingWithdrawal>,
}

#[derive(Accounts)]
pub struct InstantWithdraw<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner
    )]
    pub vault: Account<'info, Vault>,
    /// CHECK: checked against the safe list in the handler.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    pub mint: Option<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub vault_token: Option<InterfaceAccount<'info, TokenAccount>>,
    pub token_program: Option<Interface<'info, TokenInterface>>,
}

#[derive(Accounts)]
pub struct Lockdown<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED, vault.owner.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct LiftLockdown<'info> {
    pub owner: Signer<'info>,
    pub guardian: Signer<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner
    )]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct ProposeConfig<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        payer = owner,
        space = 8 + PendingConfig::INIT_SPACE,
        seeds = [CONFIG_SEED, vault.key().as_ref()],
        bump
    )]
    pub pending_config: Account<'info, PendingConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApplyConfig<'info> {
    #[account(mut, seeds = [VAULT_SEED, vault.owner.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        seeds = [CONFIG_SEED, vault.key().as_ref()],
        bump = pending_config.bump,
        has_one = vault,
        close = vault
    )]
    pub pending_config: Account<'info, PendingConfig>,
}

#[derive(Accounts)]
pub struct CancelConfig<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED, vault.owner.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        seeds = [CONFIG_SEED, vault.key().as_ref()],
        bump = pending_config.bump,
        has_one = vault,
        close = vault
    )]
    pub pending_config: Account<'info, PendingConfig>,
}

#[derive(Accounts)]
pub struct GuardianHeartbeat<'info> {
    pub guardian: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED, vault.owner.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
}
