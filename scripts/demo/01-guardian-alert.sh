#!/usr/bin/env bash
# Segment 1 (guardian wallet connected, app unlocked on Home):
# an outside withdrawal hits the owner's vault; the guardian is alerted and cancels it.
source "$(dirname "$0")/lib.sh"
OWNER_KEY='\\wsl.localhost\Ubuntu\home\jaycul\.config\solana\nest-dev-owner.json'

wallet_auth
adb shell am start -a android.intent.action.VIEW -d "nestfinance://" com.nestfinance.app >/dev/null 2>&1; pause 2   # start on Home
# Clear old alerts so the new one sits at the top of the shade.
adb shell cmd statusbar expand-notifications; pause 1.5
bash "$ROOT/scripts/ui.sh" tap "Clear all notifications" >/dev/null 2>&1; pause 1
adb shell cmd statusbar collapse; pause 1
rec_start 01-guardian-alert
pause 3                                   # guardian's Home: people they protect
tab People; pause 2; tab Home; pause 1

# The "attack": a withdrawal requested with the owner's key from somewhere else.
( cd "$ROOT/app" && node scripts/owner-request.mjs "$OWNER_KEY" 0.02 9SbxyobGDKzh6CDYV3eMHTyNnhymMoGbsanNFPC9ASmp >/dev/null ) &
for i in $(seq 1 45); do adb shell dumpsys notification --noredact 2>/dev/null | grep -q "Withdrawal requested" && break; sleep 2; done
pause 2                                   # heads-up alert on screen
adb shell cmd statusbar expand-notifications; pause 3
tap 400 731 5                             # the alert (top of the shade): opens the guarded vault
pause 3
pause 4                                   # live countdown on the request
# The countdown re-renders every second, so uiautomator can't dump this screen: tap by position.
LAST_TAP="540 1090"; tap 540 1090 0.5     # Cancel this withdrawal
approve 10                                # cancel confirms in a few seconds
pause 3                                   # "No open requests"
rec_stop
