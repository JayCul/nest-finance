#!/usr/bin/env bash
# Runs a command inside WSL with the Solana, Anchor, Rust and Node toolchains on PATH.
# Usage (from Windows): wsl -d Ubuntu -e bash scripts/wsl-run.sh <command...>
set -e
[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null
export PATH="$HOME/.local/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd "$(dirname "$0")/.."
exec "$@"
