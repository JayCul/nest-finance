#!/usr/bin/env bash
# Helpers for scripted, recorded demo walkthroughs on the emulator (Git Bash on Windows).
export MSYS_NO_PATHCONV=1
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="${DEMO_OUT:-$ROOT/demo-recordings}"
mkdir -p "$OUT"

pause() { sleep "${1:-1.5}"; }
tap() { adb shell input tap "$1" "$2"; pause "${3:-1.2}"; }
tap_text() {
  local xy; xy=$(bash "$ROOT/scripts/ui.sh" find "$1")
  if [ -z "$xy" ]; then echo "  (not found: $1)"; else pause 0.6; adb shell input tap $xy; LAST_TAP="$xy"; fi
  pause "${2:-1.5}"
}
swipe_up() { adb shell input swipe 540 1700 540 ${1:-800} 450; pause 1.2; }
swipe_down() { adb shell input swipe 540 700 540 1700 450; pause 1.2; }
type_text() { adb shell input text "$1"; adb shell input keyevent 111; pause 1; }
back() { adb shell input keyevent 4; pause 1.2; }
tab() { # Home Activity People Settings
  case "$1" in Home) tap 125 2268 ;; Activity) tap 335 2268 ;; People) tap 745 2268 ;; Settings) tap 954 2268 ;; esac
  pause 1
}
# Mock wallet approval sheet: Approve / Connect button. Taps made right after a uiautomator
# dump are sometimes dropped, so wait for the wallet to come up and retry the trigger once.
wallet_up() { adb shell dumpsys activity activities | grep -q "topResumedActivity.*mwallet"; }
approve() {
  for i in $(seq 1 30); do wallet_up && break; sleep 1; done
  if ! wallet_up && [ -n "$LAST_TAP" ]; then adb shell input tap $LAST_TAP; for i in $(seq 1 30); do wallet_up && break; sleep 1; done; fi
  # Fixed spot: uiautomator can't read the wallet sheet. The pause lets the app icon load on camera.
  pause 5; tap 814 2190; pause "${1:-12}"
}
pin() { bash "$ROOT/scripts/pin.sh" "$1" "${2:-109}"; pause 3; }

# Authenticate the mock wallet (valid 15 minutes) before a segment that signs.
wallet_auth() {
  adb shell monkey -p com.solana.mwallet -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1; pause 2.5
  tap 540 1392 1.5; adb shell input text 1111; adb shell input keyevent 66; pause 1.5
  adb shell monkey -p com.nestfinance.app -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1; pause 2
}

rec_start() {
  REC="$1"
  adb shell rm -f "/sdcard/$REC.mp4" >/dev/null 2>&1
  adb shell screenrecord --bit-rate 8000000 --time-limit 180 "/sdcard/$REC.mp4" &
  REC_PID=$!
  pause 1.5
  echo "recording $REC"
}

rec_stop() {
  pause 1.5
  adb shell pkill -2 screenrecord >/dev/null 2>&1
  wait "$REC_PID" 2>/dev/null
  pause 2
  adb pull "/sdcard/$REC.mp4" "$(cygpath -w "$OUT/$REC.mp4")" >/dev/null && echo "saved $OUT/$REC.mp4"
}
