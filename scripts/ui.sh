#!/usr/bin/env bash
# Emulator UI helpers for testing the app over adb (Git Bash on Windows).
#   bash scripts/ui.sh find "Create protected savings"   -> prints centre x y of the first match
#   bash scripts/ui.sh tap  "Create protected savings"   -> taps it
#   bash scripts/ui.sh list                               -> lists visible texts/hints with centres
#   bash scripts/ui.sh shot out.png                       -> screenshot
set -e
export MSYS_NO_PATHCONV=1
dump() {
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  adb exec-out cat /sdcard/ui.xml
}
nodes() {
  dump | tr '>' '\n' | grep -oE '(text|content-desc|hint)="[^"]+"[^/]*bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' |
    sed -E 's/^(text|content-desc|hint)="([^"]+)".*bounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]"/\2|\3|\4|\5|\6/' |
    awk -F'|' '{ printf "%s|%d|%d\n", $1, ($2+$4)/2, ($3+$5)/2 }'
}
case "$1" in
  list) nodes ;;
  find) nodes | grep -F -- "$2" | head -1 | awk -F'|' '{print $2, $3}' ;;
  tap)
    xy=$(nodes | grep -F -- "$2" | head -1 | awk -F'|' '{print $2, $3}')
    [ -z "$xy" ] && { echo "not found: $2" >&2; exit 1; }
    adb shell input tap $xy && echo "tapped $2 at $xy" ;;
  shot) adb exec-out screencap -p > "$2" ;;
esac
