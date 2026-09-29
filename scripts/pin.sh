#!/usr/bin/env bash
# Types a PIN on the app's keypad (setup and lock screens share the same layout).
# Usage: bash scripts/pin.sh 1234
export MSYS_NO_PATHCONV=1
declare -A X=([1]=261 [2]=539 [3]=818 [4]=261 [5]=539 [6]=818 [7]=261 [8]=539 [9]=818 [0]=539)
declare -A Y=([1]=1167 [2]=1167 [3]=1167 [4]=1372 [5]=1372 [6]=1372 [7]=1577 [8]=1577 [9]=1577 [0]=1781)
# Lock screen keypad sits lower than the setup keypad; pass an offset as $2 if needed.
off=${2:-0}
for ((i = 0; i < ${#1}; i++)); do
  d=${1:i:1}
  adb shell input tap "${X[$d]}" "$(( ${Y[$d]} + off ))"
  sleep 0.25
done
