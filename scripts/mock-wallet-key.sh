#!/usr/bin/env bash
# Prints `privateKey=<base58>` for a Solana keypair file, for mock-mwa-wallet/local.properties.
# Dev keys only. Usage: bash scripts/mock-wallet-key.sh ~/.config/solana/nest-dev-guardian.json
node -e '
const bytes = Buffer.from(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")));
const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
let n = BigInt("0x" + bytes.toString("hex")), s = "";
while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; }
for (const b of bytes) { if (b === 0) s = "1" + s; else break; }
console.log("privateKey=" + s);
' "$1"
