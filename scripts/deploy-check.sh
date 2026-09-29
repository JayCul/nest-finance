#!/usr/bin/env bash
# Shows what a devnet upgrade will cost against the deployer's balance.
S=$(stat -c %s target/deploy/nest_vault.so)
P=$(solana-keygen pubkey target/deploy/nest_vault-keypair.json)
echo "new program size: $S bytes"
solana program show "$P" -u devnet | grep -E "Data Length|Balance"
echo "buffer rent needed: $(solana rent "$S" -u devnet | head -1)"
echo "deployer balance: $(solana balance -u devnet)"
