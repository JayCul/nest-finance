#!/usr/bin/env bash
# Segment 2 (owner wallet connected, app closed): launch, unlock, tour, deposit.
source "$(dirname "$0")/lib.sh"

wallet_auth
adb shell am force-stop com.nestfinance.app; adb shell input keyevent 3; pause 1
rec_start 02-owner-tour
pause 2
adb shell monkey -p com.nestfinance.app -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1   # icon launch
pause 4                                   # splash, then lock screen
pin 1234
pause 3                                   # Home: protected balance, accounts
swipe_up 700; pause 2.5                   # protection card with safety score
tap_text "Safety score" 3
swipe_up 900; pause 2
back; pause 1
swipe_down; swipe_down; pause 1           # back to the top of Home

# Deposit 0.1 SOL into protected savings
tap 299 791 2                             # Deposit (card pill)
tap 216 880 0.8; type_text 0.1; pause 1.5
tap_text "Move to savings"
approve 16
pause 6                                   # back on Home with the new protected balance
rec_stop
