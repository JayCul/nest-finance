#!/usr/bin/env bash
# Tops up the deployer from the dev test wallets, then upgrades nest_vault on devnet.
set -e
solana config set --url devnet >/dev/null
DEPLOYER=$(solana address)
top_up() { solana transfer --from "$1" "$DEPLOYER" "$2" --fee-payer "$1" -u devnet --with-compute-unit-price 10000 >/dev/null && echo "moved $2 SOL from $(solana-keygen pubkey "$1")"; }
top_up ~/.config/solana/nest-dev-owner.json 0.6
top_up ~/.config/solana/nest-dev-guardian.json 0.15
echo "deployer: $(solana balance)"
solana program deploy target/deploy/nest_vault.so \
  --program-id target/deploy/nest_vault-keypair.json \
  --with-compute-unit-price 10000
solana program show "$(solana-keygen pubkey target/deploy/nest_vault-keypair.json)" | grep -E "Data Length|Last Deployed"
echo "deployer after: $(solana balance)"
