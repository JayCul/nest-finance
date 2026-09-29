use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("Signer has no role on this vault")]
    Unauthorized,
    #[msg("Signer is not a guardian of this vault")]
    NotGuardian,
    #[msg("Vault is in lockdown")]
    InLockdown,
    #[msg("Vault is not in lockdown")]
    NotInLockdown,
    #[msg("Withdrawal is still inside its protection window")]
    StillLocked,
    #[msg("Configuration change is still inside its protection window")]
    ConfigStillLocked,
    #[msg("Request was voided by a lockdown")]
    VoidedByLockdown,
    #[msg("Destination is not on the safe list")]
    NotSafeAddress,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Vault balance is too low")]
    InsufficientFunds,
    #[msg("Token accounts are required for SPL withdrawals")]
    MissingTokenAccounts,
    #[msg("Mint does not match the request")]
    MintMismatch,
    #[msg("Destination does not match the request")]
    DestinationMismatch,
    #[msg("Destination cannot be the vault itself")]
    DestinationIsVault,
    #[msg("Too many guardians")]
    TooManyGuardians,
    #[msg("Too many safe addresses")]
    TooManySafeAddresses,
    #[msg("Window must be between 60 seconds and 30 days")]
    WindowOutOfRange,
    #[msg("Sentinel must be a distinct, non-empty key")]
    InvalidSentinel,
    #[msg("Empty key not allowed")]
    InvalidKey,
    #[msg("A key appears in more than one role")]
    DuplicateKey,
    #[msg("Arithmetic overflow")]
    Overflow,
}
