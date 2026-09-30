#!/usr/bin/env bash
# Segment 5 (owner connected, AI model already downloaded): "Why is this frozen?"
# Off camera, the backup PIN freezes the savings. On camera, the owner unlocks with the real PIN,
# opens the freeze report, and the on-device AI explains it.
source "$(dirname "$0")/lib.sh"

# Off camera: a fresh location, then the backup PIN freezes the vault (SKIP_FREEZE=1 if already frozen).
if [ "${SKIP_FREEZE:-0}" != 1 ]; then
adb shell appops set com.android.shell android:mock_location allow
adb shell cmd location providers add-test-provider gps >/dev/null 2>&1
adb shell cmd location providers set-test-provider-enabled gps true
adb shell cmd location providers set-test-provider-location gps --location 6.5244,3.3792 --accuracy 8
adb shell am force-stop com.nestfinance.app
adb shell monkey -p com.nestfinance.app -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1; pause 5
pin 9999 109
pause 25                                  # freeze + SMS in the background
fi
adb shell am force-stop com.nestfinance.app; adb shell input keyevent 3; pause 1

rec_start 05-freeze-report
pause 1.5
adb shell monkey -p com.nestfinance.app -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
pause 4
pin 1234 109
pause 4                                   # Home: frozen, "Tap to see why"
tap 540 1060 4                            # the frozen notice: opens the freeze report
swipe_up 900; pause 3                     # the phone's state at the backup PIN
swipe_up 700; pause 1
tap_text "Explain with on-device AI" 1
pause 35                                  # the model loads, then the answer streams in
swipe_up 700; pause 25
swipe_up 700; pause 25
swipe_up 700; pause 8
rec_stop
