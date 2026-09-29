#!/usr/bin/env bash
# Builds for SBPF v1 and deploys nest_vault to devnet with the local deployer wallet.
# Usage: wsl -d Ubuntu -e bash scripts/wsl-run.sh bash scripts/deploy-devnet.sh
set -e
solana config set --url devnet >/dev/null
echo "deployer: $(solana address)  balance: $(solana balance)"
anchor build --arch v1 > /tmp/nest-deploy-build.log 2>&1 || { tail -20 /tmp/nest-deploy-build.log; exit 1; }
solana program deploy target/deploy/nest_vault.so \
  --program-id target/deploy/nest_vault-keypair.json \
  --with-compute-unit-price 10000
solana program show "$(solana-keygen pubkey target/deploy/nest_vault-keypair.json)"
echo "balance after: $(solana balance)"
