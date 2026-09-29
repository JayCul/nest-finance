#!/usr/bin/env bash
# Segment 3 (owner, app on Home): protected withdrawal, countdown, activity, SKR rewards.
source "$(dirname "$0")/lib.sh"

wallet_auth
rec_start 03-protected-withdrawal
pause 2
tap 780 792 2                             # Withdraw (card pill)
tap 486 753 0.8; type_text 0.05; pause 2  # amount; destination defaults to own wallet
tap_text "Request withdrawal"
approve 14
pause 8                                   # countdown ticking on the pending screen
back; pause 2
tab Activity; pause 4                     # open request + decoded on-chain history
tab People; pause 2
swipe_up 900; pause 3                     # guardians, SKR rewards card
tab Home; pause 2
rec_stop
