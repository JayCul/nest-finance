#!/usr/bin/env bash
# Segment 7 (owner wallet connected, app unlocked on Home): Nest Intelligence for the owner.
# The transaction explainer before signing, then the What-if simulator: summary, one attack
# walked through, and a free-form question.
source "$(dirname "$0")/lib.sh"
shot() { [ -n "$SHOTS" ] && adb exec-out screencap -p > "$SHOTS/$1.png"; }

adb shell am start -a android.intent.action.VIEW -d "nestfinance://" com.nestfinance.app >/dev/null 2>&1; pause 2
rec_start 07-owner-ai
pause 2

# 1. Transaction explainer
tap 814 791 3                             # Withdraw
tap 486 753 1; adb shell input text 0.3; adb shell input keyevent 111; pause 2
swipe_up 900; pause 2                     # score and signals, computed by the app
tap_text "Explain this transaction" 9     # Groq words it
shot explainer
pause 4
back; pause 2

# 2. What-if simulator
swipe_up 900
tap_text "Test your setup" 8              # summary + the AI's top fix
shot whatif-summary
pause 3
tap_text "steals my wallet key" 3
swipe_up 1000; pause 1.5
tap_text "Walk me through it" 9
swipe_up 1100; pause 5

# 3. Ask your own
for i in 1 2 3 4; do swipe_up 500; done
tap_text "What if my guardian is travelling" 1
type_text "What%sif%ssomeone%ssteals%smy%sphone%swhile%sit%sis%sunlocked\?"
xy=$(bash "$ROOT/scripts/ui.sh" list | grep "^Ask|" | head -1 | cut -d"|" -f2,3 | tr "|" " ")
adb shell input tap $xy; pause 10   # the Ask button, not the "Ask your own what-if" title
swipe_up 900; pause 6
shot whatif-ask
rec_stop
