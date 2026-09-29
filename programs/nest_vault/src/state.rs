use anchor_lang::prelude::*;

use crate::errors::VaultError;

pub const VAULT_SEED: &[u8] = b"vault";
pub const WITHDRAWAL_SEED: &[u8] = b"withdrawal";
pub const CONFIG_SEED: &[u8] = b"config";
pub const STIPEND_SEED: &[u8] = b"stipend";

pub const WEEK_SECS: i64 = 7 * 24 * 60 * 60;
/// A guardian can collect at most this much time per claim, so missing weekly
/// check-ins forfeits the missed weeks.
pub const STIPEND_MAX_ACCRUAL_SECS: i64 = 8 * 24 * 60 * 60;

pub const MAX_GUARDIANS: usize = 3;
pub const MAX_SAFE_ADDRESSES: usize = 5;

/// The program accepts short windows so devnet demos can run in minutes.
/// The app only offers 24h and up outside its demo mode.
pub const MIN_WINDOW_SECS: i64 = 60;
pub const MAX_WINDOW_SECS: i64 = 30 * 24 * 60 * 60;

/// `Pubkey::default()` in a mint field means native SOL.
pub const NATIVE_SOL: Pubkey = Pubkey::new_from_array([0u8; 32]);

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub struct VaultParams {
    /// App-held key that can only tighten: cancel and lock down, never move funds.
    pub sentinel: Pubkey,
    #[max_len(MAX_GUARDIANS)]
    pub guardians: Vec<Pubkey>,
    /// Destinations that skip the delay (the owner's own cold wallet, for example).
    #[max_len(MAX_SAFE_ADDRESSES)]
    pub safe_list: Vec<Pubkey>,
    pub delay_secs: i64,
    pub lockdown_secs: i64,
}

impl VaultParams {
    pub fn validate(&self, owner: &Pubkey) -> Result<()> {
        require!(self.guardians.len() <= MAX_GUARDIANS, VaultError::TooManyGuardians);
        require!(self.safe_list.len() <= MAX_SAFE_ADDRESSES, VaultError::TooManySafeAddresses);
        require!(
            (MIN_WINDOW_SECS..=MAX_WINDOW_SECS).contains(&self.delay_secs),
            VaultError::WindowOutOfRange
        );
        require!(
            (MIN_WINDOW_SECS..=MAX_WINDOW_SECS).contains(&self.lockdown_secs),
            VaultError::WindowOutOfRange
        );
        require!(
            self.sentinel != Pubkey::default() && self.sentinel != *owner,
            VaultError::InvalidSentinel
        );

        let mut roles: Vec<&Pubkey> = self.guardians.iter().collect();
        roles.push(&self.sentinel);
        roles.push(owner);
        for (i, a) in roles.iter().enumerate() {
            require!(**a != Pubkey::default(), VaultError::InvalidKey);
            require!(!roles[i + 1..].contains(a), VaultError::DuplicateKey);
        }
        for (i, a) in self.safe_list.iter().enumerate() {
            require!(*a != Pubkey::default(), VaultError::InvalidKey);
            require!(!self.safe_list[i + 1..].contains(a), VaultError::DuplicateKey);
        }
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub owner: Pubkey,
    pub sentinel: Pubkey,
    #[max_len(MAX_GUARDIANS)]
    pub guardians: Vec<Pubkey>,
    /// Parallel to `guardians`: last heartbeat per guardian.
    #[max_len(MAX_GUARDIANS)]
    pub guardian_last_seen: Vec<i64>,
    #[max_len(MAX_SAFE_ADDRESSES)]
    pub safe_list: Vec<Pubkey>,
    pub delay_secs: i64,
    pub lockdown_secs: i64,
    /// Outgoing transfers are frozen until this timestamp.
    pub lockdown_until: i64,
    /// Bumped by every lockdown change. Pending items from an older epoch are void.
    pub epoch: u64,
    pub next_withdrawal_id: u64,
    pub bump: u8,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug, AnchorSerialize, AnchorDeserialize)]
pub enum Role {
    Owner,
    Guardian,
    Sentinel,
}

impl Vault {
    pub fn apply_params(&mut self, params: &VaultParams, now: i64) {
        self.sentinel = params.sentinel;
        self.guardians = params.guardians.clone();
        self.guardian_last_seen = vec![now; params.guardians.len()];
        self.safe_list = params.safe_list.clone();
        self.delay_secs = params.delay_secs;
        self.lockdown_secs = params.lockdown_secs;
    }

    pub fn role_of(&self, key: &Pubkey) -> Option<Role> {
        if *key == self.owner {
            Some(Role::Owner)
        } else if self.guardians.contains(key) {
            Some(Role::Guardian)
        } else if *key == self.sentinel {
            Some(Role::Sentinel)
        } else {
            None
        }
    }

    pub fn is_guardian(&self, key: &Pubkey) -> bool {
        self.guardians.contains(key)
    }

    pub fn in_lockdown(&self, now: i64) -> bool {
        now < self.lockdown_until
    }

    pub fn require_open(&self, now: i64) -> Result<()> {
        require!(!self.in_lockdown(now), VaultError::InLockdown);
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct PendingWithdrawal {
    pub vault: Pubkey,
    pub id: u64,
    /// `NATIVE_SOL` or an SPL mint.
    pub mint: Pubkey,
    pub amount: u64,
    /// A system account for SOL, a token account for SPL.
    pub destination: Pubkey,
    pub requested_at: i64,
    pub unlock_at: i64,
    pub epoch: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub struct GuardianClaim {
    pub guardian: Pubkey,
    pub last_claim: i64,
}

/// SKR (or any SPL token) the owner sets aside to pay guardians for staying reachable.
/// Separate from savings: its token account is owned by this PDA, not the vault.
#[account]
#[derive(InitSpace)]
pub struct StipendPool {
    pub vault: Pubkey,
    pub mint: Pubkey,
    pub rate_per_week: u64,
    #[max_len(MAX_GUARDIANS)]
    pub claims: Vec<GuardianClaim>,
    pub bump: u8,
}

impl StipendPool {
    /// Amount accrued since the guardian's last claim, capped at `STIPEND_MAX_ACCRUAL_SECS`.
    /// A first claim counts as one week so a new guardian is paid on their first check-in.
    pub fn accrued(&self, guardian: &Pubkey, now: i64) -> u64 {
        let elapsed = match self.claims.iter().find(|c| c.guardian == *guardian) {
            Some(c) => (now - c.last_claim).clamp(0, STIPEND_MAX_ACCRUAL_SECS),
            None => WEEK_SECS,
        };
        ((self.rate_per_week as u128) * (elapsed as u128) / (WEEK_SECS as u128)) as u64
    }

    pub fn record_claim(&mut self, guardian: Pubkey, now: i64) {
        match self.claims.iter_mut().find(|c| c.guardian == guardian) {
            Some(c) => c.last_claim = now,
            None => {
                // Drop entries for people who are no longer guardians to make room.
                if self.claims.len() >= MAX_GUARDIANS {
                    self.claims.remove(0);
                }
                self.claims.push(GuardianClaim { guardian, last_claim: now });
            }
        }
    }
}

#[account]
#[derive(InitSpace)]
pub struct PendingConfig {
    pub vault: Pubkey,
    pub params: VaultParams,
    pub proposed_at: i64,
    pub apply_at: i64,
    pub epoch: u64,
    pub bump: u8,
}
