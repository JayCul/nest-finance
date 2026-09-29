#!/usr/bin/env bash
# Creates a devnet deployer wallet (if missing), points the CLI at devnet and requests faucet SOL.
# Usage: wsl -d Ubuntu -e bash scripts/wsl-run.sh bash scripts/devnet-setup.sh
set -u
if [ ! -f ~/.config/solana/id.json ]; then
  solana-keygen new --no-bip39-passphrase --silent -o ~/.config/solana/id.json
fi
solana config set --url devnet >/dev/null
echo "deployer: $(solana address)"
echo "program size: $(stat -c %s target/deploy/nest_vault.so) bytes"
echo "deploy cost estimate: $(solana rent $(( $(stat -c %s target/deploy/nest_vault.so) * 2 )) | head -1)"
for i in 1 2; do solana airdrop 2 2>&1 | tail -1; sleep 3; done
echo "balance: $(solana balance)"
