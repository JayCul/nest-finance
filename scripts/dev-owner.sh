#!/usr/bin/env bash
# Creates the dev "owner" keypair used by the mock MWA wallet on the emulator and funds it on devnet.
# Prints the base58 secret key for mock-mwa-wallet/local.properties. Dev key only, never real funds.
set -e
KEY=~/.config/solana/nest-dev-owner.json
[ -f "$KEY" ] || solana-keygen new --no-bip39-passphrase --silent -o "$KEY"
OWNER=$(solana-keygen pubkey "$KEY")
echo "owner: $OWNER"
if [ "$(solana balance "$OWNER" -u devnet | cut -d' ' -f1 | cut -d. -f1)" -lt 1 ]; then
  solana transfer "$OWNER" 1 --allow-unfunded-recipient -u devnet --with-compute-unit-price 10000 >/dev/null
fi
echo "owner balance: $(solana balance "$OWNER" -u devnet)"
node -e '
const bytes = Buffer.from(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")));
const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
let n = BigInt("0x" + bytes.toString("hex")), s = "";
while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; }
for (const b of bytes) { if (b === 0) s = "1" + s; else break; }
console.log("privateKey=" + s);
' "$KEY"
