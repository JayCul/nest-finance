//! Events the owner app and guardian app subscribe to.

use anchor_lang::prelude::*;

use crate::state::Role;

#[event]
pub struct VaultCreated {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub delay_secs: i64,
}

#[event]
pub struct Deposited {
    pub vault: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub from: Pubkey,
}

#[event]
pub struct WithdrawalRequested {
    pub vault: Pubkey,
    pub pending: Pubkey,
    pub id: u64,
    pub mint: Pubkey,
    pub amount: u64,
    pub destination: Pubkey,
    pub unlock_at: i64,
}

#[event]
pub struct WithdrawalExecuted {
    pub vault: Pubkey,
    pub id: u64,
    pub amount: u64,
    pub expedited: bool,
}

#[event]
pub struct WithdrawalCancelled {
    pub vault: Pubkey,
    pub id: u64,
    pub by: Pubkey,
    pub role: Role,
}

#[event]
pub struct InstantWithdrawal {
    pub vault: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub destination: Pubkey,
}

#[event]
pub struct LockdownTriggered {
    pub vault: Pubkey,
    pub by: Pubkey,
    pub role: Role,
    pub until: i64,
    pub epoch: u64,
}

#[event]
pub struct LockdownLifted {
    pub vault: Pubkey,
    pub guardian: Pubkey,
    pub epoch: u64,
}

#[event]
pub struct ConfigProposed {
    pub vault: Pubkey,
    pub apply_at: i64,
}

#[event]
pub struct ConfigApplied {
    pub vault: Pubkey,
}

#[event]
pub struct ConfigCancelled {
    pub vault: Pubkey,
    pub by: Pubkey,
    pub role: Role,
}

#[event]
pub struct GuardianCheckedIn {
    pub vault: Pubkey,
    pub guardian: Pubkey,
    pub at: i64,
}
