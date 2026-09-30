//! Nest Finance vault program tests.
//!
//! The central claim: someone holding the owner's real key still cannot move savings
//! faster than the delay, and a guardian or the sentinel can stop them in that window.
//! `attacker_with_owner_key_cannot_take_funds_early` is the test that proves it.

use {
    anchor_lang::{
        prelude::{Clock, Pubkey},
        solana_program::{instruction::Instruction, system_instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    anchor_spl::token::spl_token,
    nest_vault::{
        errors::VaultError,
        state::{PendingWithdrawal, Vault, VaultParams, NATIVE_SOL},
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

const SOL: u64 = 1_000_000_000;
const DELAY: i64 = 48 * 60 * 60;
const LOCKDOWN: i64 = 7 * 24 * 60 * 60;

type TxResult = Result<(), String>;

struct Env {
    svm: LiteSVM,
    owner: Keypair,
    guardian: Keypair,
    sentinel: Keypair,
    attacker: Keypair,
    safe: Keypair,
    vault: Pubkey,
}

fn program_id() -> Pubkey {
    nest_vault::id()
}

fn vault_pda(owner: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"vault", owner.as_ref()], &program_id()).0
}

fn pending_pda(vault: &Pubkey, id: u64) -> Pubkey {
    Pubkey::find_program_address(&[b"withdrawal", vault.as_ref(), &id.to_le_bytes()], &program_id()).0
}

fn config_pda(vault: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"config", vault.as_ref()], &program_id()).0
}

fn ata(wallet: &Pubkey, mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[wallet.as_ref(), spl_token::ID.as_ref(), mint.as_ref()],
        &anchor_spl::associated_token::ID,
    )
    .0
}

fn ix(data: impl InstructionData, accounts: impl ToAccountMetas) -> Instruction {
    Instruction::new_with_bytes(program_id(), &data.data(), accounts.to_account_metas(None))
}

fn send(svm: &mut LiteSVM, ixs: &[Instruction], payer: &Keypair, others: &[&Keypair]) -> TxResult {
    let mut signers: Vec<&Keypair> = vec![payer];
    for k in others {
        if !signers.iter().any(|s| s.pubkey() == k.pubkey()) {
            signers.push(k);
        }
    }
    let msg = Message::new_with_blockhash(ixs, Some(&payer.pubkey()), &svm.latest_blockhash());
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &signers).unwrap();
    let res = svm.send_transaction(tx);
    svm.expire_blockhash();
    res.map(|_| ()).map_err(|e| format!("{:?} | logs: {:?}", e.err, e.meta.logs))
}

fn expect_err(res: TxResult, err: VaultError) {
    let code = anchor_lang::error::ERROR_CODE_OFFSET + err as u32;
    match res {
        Ok(()) => panic!("expected error {code}, transaction succeeded"),
        Err(e) => assert!(e.contains(&format!("Custom({code})")), "expected Custom({code}), got {e}"),
    }
}

fn warp(svm: &mut LiteSVM, secs: i64) {
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp += secs;
    clock.slot += 1;
    svm.set_sysvar::<Clock>(&clock);
}

fn now(svm: &LiteSVM) -> i64 {
    svm.get_sysvar::<Clock>().unix_timestamp
}

fn balance(svm: &LiteSVM, key: &Pubkey) -> u64 {
    svm.get_account(key).map(|a| a.lamports).unwrap_or(0)
}

fn token_balance(svm: &LiteSVM, key: &Pubkey) -> u64 {
    let data = svm.get_account(key).unwrap().data;
    u64::from_le_bytes(data[64..72].try_into().unwrap())
}

fn vault_state(svm: &LiteSVM, vault: &Pubkey) -> Vault {
    let acc = svm.get_account(vault).unwrap();
    Vault::try_deserialize(&mut acc.data.as_slice()).unwrap()
}

fn params(env_guardian: &Pubkey, sentinel: &Pubkey, safe: &Pubkey) -> VaultParams {
    VaultParams {
        sentinel: *sentinel,
        guardians: vec![*env_guardian],
        safe_list: vec![*safe],
        delay_secs: DELAY,
        lockdown_secs: LOCKDOWN,
    }
}

fn init_vault_ix(owner: &Pubkey, p: VaultParams) -> Instruction {
    ix(
        nest_vault::instruction::InitVault { params: p },
        nest_vault::accounts::InitVault {
            owner: *owner,
            vault: vault_pda(owner),
            system_program: system_program::ID,
        },
    )
}

/// Owner with 10 SOL in the spending wallet and 5 SOL in the vault.
fn setup() -> Env {
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/nest_vault.so"));
    svm.add_program(program_id(), bytes).unwrap();

    let owner = Keypair::new();
    let guardian = Keypair::new();
    let sentinel = Keypair::new();
    let attacker = Keypair::new();
    let safe = Keypair::new();
    for k in [&owner, &guardian, &sentinel, &attacker, &safe] {
        svm.airdrop(&k.pubkey(), 10 * SOL).unwrap();
    }
    // Start the clock somewhere realistic.
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = 1_790_000_000;
    svm.set_sysvar::<Clock>(&clock);

    let vault = vault_pda(&owner.pubkey());
    let p = params(&guardian.pubkey(), &sentinel.pubkey(), &safe.pubkey());
    send(&mut svm, &[init_vault_ix(&owner.pubkey(), p)], &owner, &[]).unwrap();

    let mut env = Env { svm, owner, guardian, sentinel, attacker, safe, vault };
    deposit_sol(&mut env, 5 * SOL).unwrap();
    env
}

fn deposit_sol(env: &mut Env, amount: u64) -> TxResult {
    let i = ix(
        nest_vault::instruction::DepositSol { amount },
        nest_vault::accounts::DepositSol {
            depositor: env.owner.pubkey(),
            vault: env.vault,
            system_program: system_program::ID,
        },
    );
    send(&mut env.svm, &[i], &env.owner, &[])
}

/// Signs as the owner, which is exactly what a coerced owner or a drainer can do.
fn request_sol(env: &mut Env, amount: u64, destination: Pubkey) -> (TxResult, Pubkey) {
    let id = vault_state(&env.svm, &env.vault).next_withdrawal_id;
    let pending = pending_pda(&env.vault, id);
    let i = ix(
        nest_vault::instruction::RequestWithdrawal { mint: NATIVE_SOL, amount, destination },
        nest_vault::accounts::RequestWithdrawal {
            owner: env.owner.pubkey(),
            vault: env.vault,
            pending,
            system_program: system_program::ID,
        },
    );
    (send(&mut env.svm, &[i], &env.owner, &[]), pending)
}

fn execute_sol(env: &mut Env, pending: Pubkey, destination: Pubkey, payer: &Keypair) -> TxResult {
    let i = ix(
        nest_vault::instruction::ExecuteWithdrawal {},
        nest_vault::accounts::ExecuteWithdrawal {
            vault: env.vault,
            pending,
            destination,
            mint: None,
            vault_token: None,
            token_program: None,
        },
    );
    send(&mut env.svm, &[i], payer, &[])
}

fn cancel(env: &mut Env, pending: Pubkey, authority: &Keypair) -> TxResult {
    let i = ix(
        nest_vault::instruction::CancelWithdrawal {},
        nest_vault::accounts::CancelWithdrawal {
            authority: authority.pubkey(),
            vault: env.vault,
            pending,
        },
    );
    send(&mut env.svm, &[i], authority, &[])
}

fn lockdown(env: &mut Env, authority: &Keypair) -> TxResult {
    let i = ix(
        nest_vault::instruction::Lockdown {},
        nest_vault::accounts::Lockdown { authority: authority.pubkey(), vault: env.vault },
    );
    send(&mut env.svm, &[i], authority, &[])
}

fn instant_sol(env: &mut Env, amount: u64, destination: Pubkey) -> TxResult {
    let i = ix(
        nest_vault::instruction::InstantWithdraw { mint: NATIVE_SOL, amount },
        nest_vault::accounts::InstantWithdraw {
            owner: env.owner.pubkey(),
            vault: env.vault,
            destination,
            mint: None,
            vault_token: None,
            token_program: None,
        },
    );
    send(&mut env.svm, &[i], &env.owner, &[])
}

fn expedite_sol(env: &mut Env, pending: Pubkey, destination: Pubkey, guardian: &Keypair) -> TxResult {
    let i = ix(
        nest_vault::instruction::ExpediteWithdrawal {},
        nest_vault::accounts::ExpediteWithdrawal {
            owner: env.owner.pubkey(),
            guardian: guardian.pubkey(),
            vault: env.vault,
            pending,
            destination,
            mint: None,
            vault_token: None,
            token_program: None,
        },
    );
    send(&mut env.svm, &[i], &env.owner, &[guardian])
}

fn lift_lockdown(env: &mut Env, guardian: &Keypair) -> TxResult {
    let i = ix(
        nest_vault::instruction::LiftLockdown {},
        nest_vault::accounts::LiftLockdown {
            owner: env.owner.pubkey(),
            guardian: guardian.pubkey(),
            vault: env.vault,
        },
    );
    send(&mut env.svm, &[i], &env.owner, &[guardian])
}

fn propose(env: &mut Env, p: VaultParams) -> TxResult {
    let i = ix(
        nest_vault::instruction::ProposeConfig { params: p },
        nest_vault::accounts::ProposeConfig {
            owner: env.owner.pubkey(),
            vault: env.vault,
            pending_config: config_pda(&env.vault),
            system_program: system_program::ID,
        },
    );
    send(&mut env.svm, &[i], &env.owner, &[])
}

fn apply(env: &mut Env, payer: &Keypair) -> TxResult {
    let i = ix(
        nest_vault::instruction::ApplyConfig {},
        nest_vault::accounts::ApplyConfig { vault: env.vault, pending_config: config_pda(&env.vault) },
    );
    send(&mut env.svm, &[i], payer, &[])
}

fn cancel_config(env: &mut Env, authority: &Keypair) -> TxResult {
    let i = ix(
        nest_vault::instruction::CancelConfig {},
        nest_vault::accounts::CancelConfig {
            authority: authority.pubkey(),
            vault: env.vault,
            pending_config: config_pda(&env.vault),
        },
    );
    send(&mut env.svm, &[i], authority, &[])
}

// ---------------------------------------------------------------------------------------
// Creation and deposits
// ---------------------------------------------------------------------------------------

#[test]
fn creates_vault_and_accepts_deposits() {
    let mut env = setup();
    let v = vault_state(&env.svm, &env.vault);
    assert_eq!(v.owner, env.owner.pubkey());
    assert_eq!(v.guardians, vec![env.guardian.pubkey()]);
    assert_eq!(v.sentinel, env.sentinel.pubkey());
    assert_eq!(v.delay_secs, DELAY);
    assert_eq!(v.lockdown_until, 0);

    let before = balance(&env.svm, &env.vault);
    deposit_sol(&mut env, SOL).unwrap();
    assert_eq!(balance(&env.svm, &env.vault), before + SOL);
}

#[test]
fn rejects_bad_settings() {
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/nest_vault.so"));
    svm.add_program(program_id(), bytes).unwrap();
    let owner = Keypair::new();
    svm.airdrop(&owner.pubkey(), 10 * SOL).unwrap();
    let g = Pubkey::new_unique();
    let s = Pubkey::new_unique();

    let mut p = params(&g, &s, &Pubkey::new_unique());
    p.delay_secs = 10;
    expect_err(send(&mut svm, &[init_vault_ix(&owner.pubkey(), p)], &owner, &[]), VaultError::WindowOutOfRange);

    let mut p = params(&g, &s, &Pubkey::new_unique());
    p.sentinel = owner.pubkey();
    expect_err(send(&mut svm, &[init_vault_ix(&owner.pubkey(), p)], &owner, &[]), VaultError::InvalidSentinel);

    let mut p = params(&g, &s, &Pubkey::new_unique());
    p.guardians = vec![g, g];
    expect_err(send(&mut svm, &[init_vault_ix(&owner.pubkey(), p)], &owner, &[]), VaultError::DuplicateKey);

    let mut p = params(&g, &s, &Pubkey::new_unique());
    p.guardians = vec![owner.pubkey()];
    expect_err(send(&mut svm, &[init_vault_ix(&owner.pubkey(), p)], &owner, &[]), VaultError::DuplicateKey);

    let mut p = params(&g, &s, &Pubkey::new_unique());
    p.guardians = (0..4).map(|_| Pubkey::new_unique()).collect();
    expect_err(send(&mut svm, &[init_vault_ix(&owner.pubkey(), p)], &owner, &[]), VaultError::TooManyGuardians);
}

// ---------------------------------------------------------------------------------------
// Delayed withdrawals
// ---------------------------------------------------------------------------------------

#[test]
fn withdrawal_waits_for_the_delay() {
    let mut env = setup();
    let dest = Pubkey::new_unique();
    let (res, pending) = request_sol(&mut env, SOL, dest);
    res.unwrap();

    let p = PendingWithdrawal::try_deserialize(&mut env.svm.get_account(&pending).unwrap().data.as_slice()).unwrap();
    assert_eq!(p.unlock_at, now(&env.svm) + DELAY);

    let payer = Keypair::new();
    env.svm.airdrop(&payer.pubkey(), SOL).unwrap();
    expect_err(execute_sol(&mut env, pending, dest, &payer), VaultError::StillLocked);
    warp(&mut env.svm, DELAY - 1);
    expect_err(execute_sol(&mut env, pending, dest, &payer), VaultError::StillLocked);
    warp(&mut env.svm, 1);

    // Permissionless: a third party can execute, but only to the stored destination.
    let vault_before = balance(&env.svm, &env.vault);
    execute_sol(&mut env, pending, dest, &payer).unwrap();
    assert_eq!(balance(&env.svm, &dest), SOL);
    assert!(env.svm.get_account(&pending).map(|a| a.lamports == 0).unwrap_or(true));
    // Pending account rent went back into the vault.
    assert!(balance(&env.svm, &env.vault) > vault_before - SOL);
}

#[test]
fn execute_only_pays_the_stored_destination() {
    let mut env = setup();
    let dest = Pubkey::new_unique();
    let (res, pending) = request_sol(&mut env, SOL, dest);
    res.unwrap();
    warp(&mut env.svm, DELAY);
    let attacker = env.attacker.insecure_clone();
    expect_err(
        execute_sol(&mut env, pending, attacker.pubkey(), &attacker),
        VaultError::DestinationMismatch,
    );
}

#[test]
fn cannot_withdraw_below_rent_floor() {
    let mut env = setup();
    let dest = Pubkey::new_unique();
    let everything = balance(&env.svm, &env.vault);
    let (res, pending) = request_sol(&mut env, everything, dest);
    res.unwrap();
    warp(&mut env.svm, DELAY);
    let owner = env.owner.insecure_clone();
    expect_err(execute_sol(&mut env, pending, dest, &owner), VaultError::InsufficientFunds);
}

#[test]
fn owner_guardian_and_sentinel_can_cancel_strangers_cannot() {
    let mut env = setup();
    let dest = Pubkey::new_unique();
    let guardian = env.guardian.insecure_clone();
    let sentinel = env.sentinel.insecure_clone();
    let owner = env.owner.insecure_clone();
    let attacker = env.attacker.insecure_clone();

    let (res, p1) = request_sol(&mut env, SOL, dest);
    res.unwrap();
    expect_err(cancel(&mut env, p1, &attacker), VaultError::Unauthorized);
    cancel(&mut env, p1, &guardian).unwrap();

    let (res, p2) = request_sol(&mut env, SOL, dest);
    res.unwrap();
    cancel(&mut env, p2, &sentinel).unwrap();

    let (res, p3) = request_sol(&mut env, SOL, dest);
    res.unwrap();
    cancel(&mut env, p3, &owner).unwrap();

    for p in [p1, p2, p3] {
        assert!(env.svm.get_account(&p).map(|a| a.lamports == 0).unwrap_or(true));
    }
}

// ---------------------------------------------------------------------------------------
// The core guarantee
// ---------------------------------------------------------------------------------------

/// An attacker forces the owner to sign anything they want. Every route to the savings
/// before the delay fails, and the guardian cancels inside the window.
#[test]
fn attacker_with_owner_key_cannot_take_funds_early() {
    let mut env = setup();
    let attacker = env.attacker.insecure_clone();
    let guardian = env.guardian.insecure_clone();
    let owner = env.owner.insecure_clone();
    let savings = balance(&env.svm, &env.vault);

    // 1. Queue a withdrawal to the attacker and try to run it now.
    let (res, pending) = request_sol(&mut env, 4 * SOL, attacker.pubkey());
    res.unwrap();
    expect_err(execute_sol(&mut env, pending, attacker.pubkey(), &attacker), VaultError::StillLocked);

    // 2. Instant withdrawal straight to the attacker.
    expect_err(instant_sol(&mut env, 4 * SOL, attacker.pubkey()), VaultError::NotSafeAddress);

    // 3. Add the attacker to the safe list, zero the delay, make them a guardian.
    let mut evil = params(&attacker.pubkey(), &env.sentinel.pubkey(), &attacker.pubkey());
    evil.delay_secs = 60;
    propose(&mut env, evil).unwrap();
    expect_err(apply(&mut env, &attacker), VaultError::ConfigStillLocked);

    // 4. Use the attacker as the "guardian" for an early release or to lift a lockdown.
    expect_err(expedite_sol(&mut env, pending, attacker.pubkey(), &attacker), VaultError::NotGuardian);

    // 5. Nothing moved.
    assert!(balance(&env.svm, &env.vault) >= savings);
    assert_eq!(vault_state(&env.svm, &env.vault).safe_list, vec![env.safe.pubkey()]);

    // The guardian cancels both inside the window.
    cancel(&mut env, pending, &guardian).unwrap();
    cancel_config(&mut env, &guardian).unwrap();

    // Long after the delay there is nothing left to execute.
    warp(&mut env.svm, DELAY * 2);
    assert!(execute_sol(&mut env, pending, attacker.pubkey(), &attacker).is_err());
    assert!(apply(&mut env, &attacker).is_err());
    assert!(balance(&env.svm, &env.vault) >= savings);
    let _ = owner;
}

// ---------------------------------------------------------------------------------------
// Lockdown (the duress PIN path)
// ---------------------------------------------------------------------------------------

#[test]
fn sentinel_lockdown_freezes_and_voids_everything() {
    let mut env = setup();
    let sentinel = env.sentinel.insecure_clone();
    let attacker = env.attacker.insecure_clone();

    let (res, pending) = request_sol(&mut env, SOL, attacker.pubkey());
    res.unwrap();
    let mut p = params(&env.guardian.pubkey(), &env.sentinel.pubkey(), &attacker.pubkey());
    p.delay_secs = 60;
    propose(&mut env, p).unwrap();

    lockdown(&mut env, &sentinel).unwrap();
    let v = vault_state(&env.svm, &env.vault);
    assert_eq!(v.lockdown_until, now(&env.svm) + LOCKDOWN);
    assert_eq!(v.epoch, 1);

    // During lockdown: nothing leaves, nothing new can be queued.
    warp(&mut env.svm, DELAY);
    expect_err(execute_sol(&mut env, pending, attacker.pubkey(), &attacker), VaultError::InLockdown);
    expect_err(apply(&mut env, &attacker), VaultError::InLockdown);
    expect_err(request_sol(&mut env, SOL, attacker.pubkey()).0, VaultError::InLockdown);
    let safe = env.safe.pubkey();
    expect_err(instant_sol(&mut env, SOL, safe), VaultError::InLockdown);

    // After lockdown ends, requests from before it stay void.
    warp(&mut env.svm, LOCKDOWN);
    expect_err(execute_sol(&mut env, pending, attacker.pubkey(), &attacker), VaultError::VoidedByLockdown);
    expect_err(apply(&mut env, &attacker), VaultError::VoidedByLockdown);

    // Void requests can still be cleaned up.
    cancel(&mut env, pending, &sentinel).unwrap();
    cancel_config(&mut env, &sentinel).unwrap();
}

#[test]
fn repeated_lockdown_extends_never_shortens() {
    let mut env = setup();
    let guardian = env.guardian.insecure_clone();
    let owner = env.owner.insecure_clone();
    lockdown(&mut env, &guardian).unwrap();
    let first = vault_state(&env.svm, &env.vault).lockdown_until;
    warp(&mut env.svm, 3600);
    lockdown(&mut env, &owner).unwrap();
    let second = vault_state(&env.svm, &env.vault).lockdown_until;
    assert_eq!(second, first + 3600);
}

#[test]
fn strangers_cannot_lock_down() {
    let mut env = setup();
    let attacker = env.attacker.insecure_clone();
    expect_err(lockdown(&mut env, &attacker), VaultError::Unauthorized);
}

#[test]
fn lifting_lockdown_needs_owner_and_real_guardian() {
    let mut env = setup();
    let sentinel = env.sentinel.insecure_clone();
    let attacker = env.attacker.insecure_clone();
    let guardian = env.guardian.insecure_clone();

    let (res, pending) = request_sol(&mut env, SOL, attacker.pubkey());
    res.unwrap();
    lockdown(&mut env, &sentinel).unwrap();

    expect_err(lift_lockdown(&mut env, &attacker), VaultError::NotGuardian);
    lift_lockdown(&mut env, &guardian).unwrap();
    assert_eq!(vault_state(&env.svm, &env.vault).lockdown_until, now(&env.svm));

    // The coerced request is still void after the lift.
    warp(&mut env.svm, DELAY);
    expect_err(execute_sol(&mut env, pending, attacker.pubkey(), &attacker), VaultError::VoidedByLockdown);

    // Normal service resumes.
    let dest = Pubkey::new_unique();
    let (res, fresh) = request_sol(&mut env, SOL, dest);
    res.unwrap();
    warp(&mut env.svm, DELAY);
    execute_sol(&mut env, fresh, dest, &guardian).unwrap();
    assert_eq!(balance(&env.svm, &dest), SOL);
}

#[test]
fn sentinel_cannot_move_funds() {
    let mut env = setup();
    let sentinel = env.sentinel.insecure_clone();
    let vault = env.vault;
    let i = ix(
        nest_vault::instruction::RequestWithdrawal {
            mint: NATIVE_SOL,
            amount: SOL,
            destination: sentinel.pubkey(),
        },
        nest_vault::accounts::RequestWithdrawal {
            owner: sentinel.pubkey(),
            vault,
            pending: pending_pda(&vault, 0),
            system_program: system_program::ID,
        },
    );
    assert!(send(&mut env.svm, &[i], &sentinel, &[]).is_err());

    let i = ix(
        nest_vault::instruction::InstantWithdraw { mint: NATIVE_SOL, amount: SOL },
        nest_vault::accounts::InstantWithdraw {
            owner: sentinel.pubkey(),
            vault,
            destination: sentinel.pubkey(),
            mint: None,
            vault_token: None,
            token_program: None,
        },
    );
    assert!(send(&mut env.svm, &[i], &sentinel, &[]).is_err());
}

// ---------------------------------------------------------------------------------------
// Fast paths that stay safe
// ---------------------------------------------------------------------------------------

#[test]
fn safe_list_is_instant_everything_else_is_not() {
    let mut env = setup();
    let safe = env.safe.pubkey();
    let before = balance(&env.svm, &safe);
    instant_sol(&mut env, 2 * SOL, safe).unwrap();
    assert_eq!(balance(&env.svm, &safe), before + 2 * SOL);
    expect_err(instant_sol(&mut env, SOL, Pubkey::new_unique()), VaultError::NotSafeAddress);
}

#[test]
fn owner_and_guardian_can_expedite() {
    let mut env = setup();
    let guardian = env.guardian.insecure_clone();
    let dest = Pubkey::new_unique();
    let (res, pending) = request_sol(&mut env, SOL, dest);
    res.unwrap();
    expedite_sol(&mut env, pending, dest, &guardian).unwrap();
    assert_eq!(balance(&env.svm, &dest), SOL);
}

// ---------------------------------------------------------------------------------------
// Settings changes
// ---------------------------------------------------------------------------------------

#[test]
fn settings_change_waits_and_can_be_cancelled() {
    let mut env = setup();
    let guardian = env.guardian.insecure_clone();
    let owner = env.owner.insecure_clone();
    let new_guardian = Pubkey::new_unique();

    let mut p = params(&new_guardian, &env.sentinel.pubkey(), &env.safe.pubkey());
    p.delay_secs = 24 * 60 * 60;
    propose(&mut env, p.clone()).unwrap();
    expect_err(apply(&mut env, &owner), VaultError::ConfigStillLocked);
    cancel_config(&mut env, &guardian).unwrap();

    propose(&mut env, p).unwrap();
    warp(&mut env.svm, DELAY);
    apply(&mut env, &owner).unwrap();
    let v = vault_state(&env.svm, &env.vault);
    assert_eq!(v.delay_secs, 24 * 60 * 60);
    assert_eq!(v.guardians, vec![new_guardian]);
    assert_eq!(v.guardian_last_seen, vec![now(&env.svm)]);
}

#[test]
fn guardian_heartbeat_records_check_in() {
    let mut env = setup();
    let guardian = env.guardian.insecure_clone();
    let attacker = env.attacker.insecure_clone();
    warp(&mut env.svm, 3600);

    let beat = |who: &Keypair, vault: Pubkey| {
        ix(
            nest_vault::instruction::GuardianHeartbeat {},
            nest_vault::accounts::GuardianHeartbeat { guardian: who.pubkey(), vault },
        )
    };
    let vault = env.vault;
    send(&mut env.svm, &[beat(&guardian, vault)], &guardian, &[]).unwrap();
    assert_eq!(vault_state(&env.svm, &env.vault).guardian_last_seen, vec![now(&env.svm)]);
    expect_err(send(&mut env.svm, &[beat(&attacker, vault)], &attacker, &[]), VaultError::NotGuardian);
}

// ---------------------------------------------------------------------------------------
// SPL tokens (SKR, USDC and friends)
// ---------------------------------------------------------------------------------------

fn create_mint(svm: &mut LiteSVM, payer: &Keypair) -> Pubkey {
    let mint = Keypair::new();
    let rent = svm.minimum_balance_for_rent_exemption(82);
    let create = system_instruction::create_account(&payer.pubkey(), &mint.pubkey(), rent, 82, &spl_token::ID);
    let init = spl_token::instruction::initialize_mint2(&spl_token::ID, &mint.pubkey(), &payer.pubkey(), None, 6).unwrap();
    send(svm, &[create, init], payer, &[&mint]).unwrap();
    mint.pubkey()
}

fn create_token_account(svm: &mut LiteSVM, payer: &Keypair, mint: &Pubkey, owner: &Pubkey) -> Pubkey {
    let account = Keypair::new();
    let rent = svm.minimum_balance_for_rent_exemption(165);
    let create = system_instruction::create_account(&payer.pubkey(), &account.pubkey(), rent, 165, &spl_token::ID);
    let init = spl_token::instruction::initialize_account3(&spl_token::ID, &account.pubkey(), mint, owner).unwrap();
    send(svm, &[create, init], payer, &[&account]).unwrap();
    account.pubkey()
}

#[test]
fn spl_tokens_follow_the_same_rules() {
    let mut env = setup();
    let owner = env.owner.insecure_clone();
    let attacker = env.attacker.insecure_clone();
    let sentinel = env.sentinel.insecure_clone();
    let mint = create_mint(&mut env.svm, &owner);

    let owner_token = create_token_account(&mut env.svm, &owner, &mint, &owner.pubkey());
    let mint_to = spl_token::instruction::mint_to(&spl_token::ID, &mint, &owner_token, &owner.pubkey(), &[], 1_000_000).unwrap();
    send(&mut env.svm, &[mint_to], &owner, &[]).unwrap();

    // Deposit creates the vault's associated token account.
    let vault_token = ata(&env.vault, &mint);
    let deposit = ix(
        nest_vault::instruction::DepositToken { amount: 600_000 },
        nest_vault::accounts::DepositToken {
            depositor: owner.pubkey(),
            vault: env.vault,
            mint,
            depositor_token: owner_token,
            vault_token,
            token_program: spl_token::ID,
            associated_token_program: anchor_spl::associated_token::ID,
            system_program: system_program::ID,
        },
    );
    send(&mut env.svm, &[deposit], &owner, &[]).unwrap();
    assert_eq!(token_balance(&env.svm, &vault_token), 600_000);

    // Delayed withdrawal to the owner's token account.
    let id = vault_state(&env.svm, &env.vault).next_withdrawal_id;
    let pending = pending_pda(&env.vault, id);
    let request = ix(
        nest_vault::instruction::RequestWithdrawal { mint, amount: 100_000, destination: owner_token },
        nest_vault::accounts::RequestWithdrawal {
            owner: owner.pubkey(),
            vault: env.vault,
            pending,
            system_program: system_program::ID,
        },
    );
    send(&mut env.svm, &[request], &owner, &[]).unwrap();

    let execute = |vault: Pubkey| {
        ix(
            nest_vault::instruction::ExecuteWithdrawal {},
            nest_vault::accounts::ExecuteWithdrawal {
                vault,
                pending,
                destination: owner_token,
                mint: Some(mint),
                vault_token: Some(vault_token),
                token_program: Some(spl_token::ID),
            },
        )
    };
    expect_err(send(&mut env.svm, &[execute(env.vault)], &owner, &[]), VaultError::StillLocked);
    warp(&mut env.svm, DELAY);
    send(&mut env.svm, &[execute(env.vault)], &owner, &[]).unwrap();
    assert_eq!(token_balance(&env.svm, &vault_token), 500_000);
    assert_eq!(token_balance(&env.svm, &owner_token), 500_000);

    // Instant path: safe owner's token account works, attacker's does not.
    let safe_token = create_token_account(&mut env.svm, &owner, &mint, &env.safe.pubkey());
    let attacker_token = create_token_account(&mut env.svm, &owner, &mint, &attacker.pubkey());
    let instant = |vault: Pubkey, destination: Pubkey| {
        ix(
            nest_vault::instruction::InstantWithdraw { mint, amount: 50_000 },
            nest_vault::accounts::InstantWithdraw {
                owner: owner.pubkey(),
                vault,
                destination,
                mint: Some(mint),
                vault_token: Some(vault_token),
                token_program: Some(spl_token::ID),
            },
        )
    };
    send(&mut env.svm, &[instant(env.vault, safe_token)], &owner, &[]).unwrap();
    assert_eq!(token_balance(&env.svm, &safe_token), 50_000);
    expect_err(
        send(&mut env.svm, &[instant(env.vault, attacker_token)], &owner, &[]),
        VaultError::NotSafeAddress,
    );

    // Lockdown freezes tokens too.
    lockdown(&mut env, &sentinel).unwrap();
    expect_err(send(&mut env.svm, &[instant(env.vault, safe_token)], &owner, &[]), VaultError::InLockdown);
}

// ---------------------------------------------------------------------------------------
// SKR stipend for guardians
// ---------------------------------------------------------------------------------------

fn stipend_pda(vault: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"stipend", vault.as_ref()], &program_id()).0
}

/// Owner with a vault, a mint (standing in for SKR) and a funded stipend paying `rate` per week.
fn setup_stipend(rate: u64, fund: u64) -> (Env, Pubkey) {
    let mut env = setup();
    let owner = env.owner.insecure_clone();
    let mint = create_mint(&mut env.svm, &owner);
    let owner_token = create_token_account(&mut env.svm, &owner, &mint, &owner.pubkey());
    let mint_to = spl_token::instruction::mint_to(&spl_token::ID, &mint, &owner_token, &owner.pubkey(), &[], fund).unwrap();
    send(&mut env.svm, &[mint_to], &owner, &[]).unwrap();

    let pool = stipend_pda(&env.vault);
    let pool_token = ata(&pool, &mint);
    let init = ix(
        nest_vault::instruction::SetupStipend { rate_per_week: rate },
        nest_vault::accounts::SetupStipend {
            owner: owner.pubkey(),
            vault: env.vault,
            pool,
            mint,
            pool_token,
            token_program: spl_token::ID,
            associated_token_program: anchor_spl::associated_token::ID,
            system_program: system_program::ID,
        },
    );
    let fund_ix = ix(
        nest_vault::instruction::FundStipend { amount: fund },
        nest_vault::accounts::FundStipend {
            funder: owner.pubkey(),
            pool,
            mint,
            funder_token: owner_token,
            pool_token,
            token_program: spl_token::ID,
        },
    );
    send(&mut env.svm, &[init, fund_ix], &owner, &[]).unwrap();
    assert_eq!(token_balance(&env.svm, &pool_token), fund);
    (env, mint)
}

fn claim(env: &mut Env, mint: Pubkey, who: &Keypair) -> TxResult {
    let pool = stipend_pda(&env.vault);
    let i = ix(
        nest_vault::instruction::ClaimStipend {},
        nest_vault::accounts::ClaimStipend {
            guardian: who.pubkey(),
            vault: env.vault,
            pool,
            mint,
            pool_token: ata(&pool, &mint),
            guardian_token: ata(&who.pubkey(), &mint),
            token_program: spl_token::ID,
            associated_token_program: anchor_spl::associated_token::ID,
            system_program: system_program::ID,
        },
    );
    send(&mut env.svm, &[i], who, &[])
}

const WEEK: i64 = 7 * 24 * 60 * 60;
const DAY: i64 = 24 * 60 * 60;

#[test]
fn guardian_first_claim_pays_a_week_and_counts_as_check_in() {
    let (mut env, mint) = setup_stipend(700_000, 10_000_000);
    let guardian = env.guardian.insecure_clone();
    warp(&mut env.svm, DAY);
    claim(&mut env, mint, &guardian).unwrap();
    assert_eq!(token_balance(&env.svm, &ata(&guardian.pubkey(), &mint)), 700_000);
    assert_eq!(vault_state(&env.svm, &env.vault).guardian_last_seen, vec![now(&env.svm)]);
}

#[test]
fn stipend_accrues_pro_rata_and_caps_at_eight_days() {
    let (mut env, mint) = setup_stipend(700_000, 10_000_000);
    let guardian = env.guardian.insecure_clone();
    let g_token = ata(&guardian.pubkey(), &mint);
    claim(&mut env, mint, &guardian).unwrap(); // first claim: one week
    assert_eq!(token_balance(&env.svm, &g_token), 700_000);

    warp(&mut env.svm, 3 * DAY);
    claim(&mut env, mint, &guardian).unwrap(); // three days: 3/7 of a week
    assert_eq!(token_balance(&env.svm, &g_token), 700_000 + 300_000);

    warp(&mut env.svm, 30 * DAY);
    claim(&mut env, mint, &guardian).unwrap(); // a month away: capped at 8 days
    assert_eq!(token_balance(&env.svm, &g_token), 700_000 + 300_000 + 800_000);
    let _ = WEEK;
}

#[test]
fn only_guardians_can_claim() {
    let (mut env, mint) = setup_stipend(700_000, 10_000_000);
    let attacker = env.attacker.insecure_clone();
    let owner = env.owner.insecure_clone();
    expect_err(claim(&mut env, mint, &attacker), VaultError::NotGuardian);
    expect_err(claim(&mut env, mint, &owner), VaultError::NotGuardian);
}

#[test]
fn empty_pool_still_records_the_check_in() {
    let (mut env, mint) = setup_stipend(700_000, 100_000);
    let guardian = env.guardian.insecure_clone();
    claim(&mut env, mint, &guardian).unwrap(); // pays out the 100_000 that's there
    assert_eq!(token_balance(&env.svm, &ata(&guardian.pubkey(), &mint)), 100_000);
    warp(&mut env.svm, DAY);
    claim(&mut env, mint, &guardian).unwrap(); // nothing left, but the heartbeat lands
    assert_eq!(vault_state(&env.svm, &env.vault).guardian_last_seen, vec![now(&env.svm)]);
}

// ---------------------------------------------------------------------------------------
// Mainnet SKR
// ---------------------------------------------------------------------------------------

/// The real SKR mint account from mainnet (tests/fixtures/README.md says how it was read).
const SKR_MINT: &str = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const SKR_MINT_DATA: &[u8] = include_bytes!("fixtures/skr-mint-mainnet.bin");

/// Puts SKR's real mint account at its real address, and gives `owner` a token account holding
/// `amount` SKR. SKR's mint authority is not ours, so the balance is written directly.
fn load_mainnet_skr(env: &mut Env, amount: u64) -> (Pubkey, Pubkey) {
    let skr: Pubkey = SKR_MINT.parse().unwrap();
    let owner = env.owner.insecure_clone();
    // Borrow a real Token-program account shape from a scratch mint, then swap in SKR's data.
    let scratch = create_mint(&mut env.svm, &owner);
    let mut mint_account = env.svm.get_account(&scratch).unwrap();
    mint_account.data = SKR_MINT_DATA.to_vec();
    env.svm.set_account(skr, mint_account).unwrap();

    let holder = create_token_account(&mut env.svm, &owner, &scratch, &owner.pubkey());
    let mut token_account = env.svm.get_account(&holder).unwrap();
    token_account.data[0..32].copy_from_slice(skr.as_ref()); // mint
    token_account.data[64..72].copy_from_slice(&amount.to_le_bytes()); // amount
    env.svm.set_account(holder, token_account).unwrap();
    (skr, holder)
}

#[test]
fn guardian_rewards_work_with_mainnet_skr() {
    let mut env = setup();
    let (skr, owner_skr) = load_mainnet_skr(&mut env, 100_000_000); // 100 SKR
    assert_eq!(SKR_MINT_DATA[44], 6, "SKR has 6 decimals");
    let owner = env.owner.insecure_clone();
    let guardian = env.guardian.insecure_clone();

    // Setup and funding exactly as the app sends them: 10 SKR a week, funded with 50 SKR.
    let pool = stipend_pda(&env.vault);
    let pool_token = ata(&pool, &skr);
    let setup_ix = ix(
        nest_vault::instruction::SetupStipend { rate_per_week: 10_000_000 },
        nest_vault::accounts::SetupStipend {
            owner: owner.pubkey(),
            vault: env.vault,
            pool,
            mint: skr,
            pool_token,
            token_program: spl_token::ID,
            associated_token_program: anchor_spl::associated_token::ID,
            system_program: system_program::ID,
        },
    );
    let fund_ix = ix(
        nest_vault::instruction::FundStipend { amount: 50_000_000 },
        nest_vault::accounts::FundStipend {
            funder: owner.pubkey(),
            pool,
            mint: skr,
            funder_token: owner_skr,
            pool_token,
            token_program: spl_token::ID,
        },
    );
    send(&mut env.svm, &[setup_ix, fund_ix], &owner, &[]).unwrap();
    assert_eq!(token_balance(&env.svm, &pool_token), 50_000_000);
    assert_eq!(token_balance(&env.svm, &owner_skr), 50_000_000);

    // The guardian checks in and collects a week of SKR; the check-in is recorded.
    claim(&mut env, skr, &guardian).unwrap();
    assert_eq!(token_balance(&env.svm, &ata(&guardian.pubkey(), &skr)), 10_000_000);
    assert_eq!(token_balance(&env.svm, &pool_token), 40_000_000);
    assert_eq!(vault_state(&env.svm, &env.vault).guardian_last_seen, vec![now(&env.svm)]);

    // Missed weeks are forfeited on SKR too: a month away pays 8 days.
    warp(&mut env.svm, 30 * DAY);
    claim(&mut env, skr, &guardian).unwrap();
    assert_eq!(token_balance(&env.svm, &ata(&guardian.pubkey(), &skr)), 10_000_000 + 10_000_000 * 8 / 7);
}
