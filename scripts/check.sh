#!/usr/bin/env bash
# Builds the program and runs the tests, printing a compact summary.
# Usage (from Windows): wsl -d Ubuntu -e bash scripts/wsl-run.sh bash scripts/check.sh [build|test|all]
mode="${1:-all}"
# SBPF target. Solana CLI 4.x defaults to v3; override with NEST_ARCH to match the cluster.
arch="${NEST_ARCH:-v1}"
log=/tmp/nest-check.log
: > "$log"

if [ "$mode" = build ] || [ "$mode" = all ]; then
  anchor build --arch "$arch" >> "$log" 2>&1
  status=$?
  echo "BUILD EXIT=$status"
  if [ $status -ne 0 ]; then
    grep -nE "^error|^\s+-->|^\s+= (note|help)" "$log" | head -80
    tail -15 "$log"
    exit $status
  fi
fi

if [ "$mode" = test ] || [ "$mode" = all ]; then
  cargo test >> "$log" 2>&1
  status=$?
  echo "TEST EXIT=$status"
  grep -nE "^test |test result|panicked|^error|^\s+-->" "$log" | head -80
  exit $status
fi
