#!/usr/bin/env bash
# Segment 6 (guardian wallet connected, app unlocked on Home): Nest Intelligence for a guardian.
# A large withdrawal to a never-used address hits the owner's vault; the alert carries the risk
# level, the guardian view shows the computed signals and the AI briefing, and the guardian cancels.
# Set SHOTS=<dir> to also save stills of the alert, the request and the briefing.
source "$(dirname "$0")/lib.sh"
OWNER_KEY='\\wsl.localhost\Ubuntu\home\jaycul\.config\solana\nest-dev-owner.json'
DEST="${DEST:-2By2LAtc5svduLucxFQgwqoGmbMQstZEAVSgnrDuvy1c}"   # never used by the demo vault
AMOUNT="${AMOUNT:-0.6}"
shot() { [ -n "$SHOTS" ] && adb exec-out screencap -p > "$SHOTS/$1.png"; }

wallet_auth
adb shell am start -a android.intent.action.VIEW -d "nestfinance://" com.nestfinance.app >/dev/null 2>&1; pause 2
adb shell cmd statusbar expand-notifications; pause 1.5
bash "$ROOT/scripts/ui.sh" tap "Clear all notifications" >/dev/null 2>&1; pause 1
adb shell cmd statusbar collapse; pause 1
rec_start 06-guardian-ai
pause 3

( cd "$ROOT/app" && node scripts/owner-request.mjs "$OWNER_KEY" "$AMOUNT" "$DEST" >/dev/null ) &
for i in $(seq 1 45); do adb shell dumpsys notification --noredact 2>/dev/null | grep -q "Withdrawal requested" && break; sleep 2; done
pause 2
adb shell cmd statusbar expand-notifications; pause 3
shot alert
tap 400 731 5                             # the alert: opens the guarded vault
pause 3
shot guarded
swipe_up 1000; pause 6                    # computed signals, then the AI briefing
shot briefing
pause 6
swipe_down; pause 2
LAST_TAP="540 1090"; tap 540 1090 0.5     # Cancel this withdrawal
approve 10
pause 3
rec_stop
