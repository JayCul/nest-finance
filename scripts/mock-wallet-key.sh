#!/usr/bin/env bash
# Puts a Solana keypair into mock-mwa-wallet's local.properties as `privateKey=<base58>`, so the
# emulator's mock wallet signs as that key. The secret is written to the file, never printed.
# Dev keys only. Usage: bash scripts/mock-wallet-key.sh <keypair.json> <mock-mwa-wallet/local.properties>
set -e
[ -n "$1" ] && [ -n "$2" ] || { echo "usage: bash scripts/mock-wallet-key.sh <keypair.json> <local.properties>" >&2; exit 1; }
node -e '
const fs = require("fs");
const [keyFile, propsFile] = process.argv.slice(1);
const bytes = Buffer.from(JSON.parse(fs.readFileSync(keyFile, "utf8")));
const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const b58 = (buf) => {
  let n = BigInt("0x" + buf.toString("hex")), s = "";
  while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; }
  for (const b of buf) { if (b === 0) s = "1" + s; else break; }
  return s;
};
const lines = fs.existsSync(propsFile) ? fs.readFileSync(propsFile, "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("privateKey=")) : [];
lines.push("privateKey=" + b58(bytes));
fs.writeFileSync(propsFile, lines.join("\n") + "\n", { mode: 0o600 });
console.log("mock wallet key set to " + b58(bytes.subarray(32)) + " in " + propsFile);
' "$1" "$2"
