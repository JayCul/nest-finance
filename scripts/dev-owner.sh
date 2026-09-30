#!/usr/bin/env bash
# Creates the dev "owner" keypair used by the mock MWA wallet on the emulator and funds it on devnet.
# scripts/mock-wallet-key.sh then loads it into the mock wallet. Dev key only, never real funds.
set -e
KEY=~/.config/solana/nest-dev-owner.json
[ -f "$KEY" ] || solana-keygen new --no-bip39-passphrase --silent -o "$KEY"
OWNER=$(solana-keygen pubkey "$KEY")
echo "owner: $OWNER"
if [ "$(solana balance "$OWNER" -u devnet | cut -d' ' -f1 | cut -d. -f1)" -lt 1 ]; then
  solana transfer "$OWNER" 1 --allow-unfunded-recipient -u devnet --with-compute-unit-price 10000 >/dev/null
fi
echo "owner balance: $(solana balance "$OWNER" -u devnet)"
echo "to sign as this key on the emulator: bash scripts/mock-wallet-key.sh $KEY <mock-mwa-wallet/local.properties>"
