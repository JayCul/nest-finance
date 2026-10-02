#!/usr/bin/env bash
# Segment 4 (owner connected, vault not frozen): the backup PIN. Someone makes you open the app;
# the backup PIN shows an ordinary wallet while the savings freeze and a text goes out, then the
# real PIN shows what happened.
source "$(dirname "$0")/lib.sh"
shot() { [ -n "$SHOTS" ] && adb exec-out screencap -p > "$SHOTS/$1.png"; }

# Fresh location for the text. The emulator's GPS ignores `geo fix` while nothing is listening,
# so set it through Android's test provider (emulator only).
adb shell appops set com.android.shell android:mock_location allow
adb shell cmd location providers add-test-provider gps >/dev/null 2>&1
adb shell cmd location providers set-test-provider-enabled gps true
adb shell cmd location providers set-test-provider-location gps --location 6.5244,3.3792 --accuracy 8
adb shell am force-stop com.nestfinance.app; adb shell input keyevent 3; pause 1
rec_start 04-duress
pause 1.5
adb shell monkey -p com.nestfinance.app -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
pause 4                                   # lock screen
pin 9999 109                              # backup PIN
pause 3                                   # ordinary wallet: spending only
shot decoy
tab Activity; pause 2.5
tab People; pause 2
tab Settings; pause 2
tab Home; pause 10                        # freeze + SMS happen in the background

# What the emergency contact received
adb shell monkey -p com.google.android.apps.messaging -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
pause 3
tap 540 400 4                             # open the conversation
pause 3

# Later, back in with the real PIN
adb shell am force-stop com.nestfinance.app
adb shell monkey -p com.nestfinance.app -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
pause 4
pin 1234 109
pause 4                                   # savings frozen
tab Settings; pause 5                     # "Backup PIN was used" record
tab Home; pause 2
rec_stop
