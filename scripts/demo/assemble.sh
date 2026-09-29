#!/usr/bin/env bash
# Trims the recorded segments and joins them into one demo video, in narration order
# (docs/demo-video-script.md). Each line: clip, then the start-end ranges (seconds) to keep.
source "$(dirname "$0")/lib.sh"
cd "$OUT"

CUTS=(
  "02-owner-tour ${T02:-0-999}"
  "03-protected-withdrawal ${T03:-0-999}"
  "04-duress ${T04:-0-999}"
  "01-guardian-alert ${T01:-0-999}"
)

list=parts.txt; : > "$list"; n=0
for c in "${CUTS[@]}"; do
  read -r name ranges <<< "$c"
  for r in $ranges; do
    n=$((n + 1)); part=$(printf 'part-%02d.mp4' "$n")
    # Re-encode each part to the same size, rate and codec so the concat is seamless.
    start=${r%-*}; dur=$(awk "BEGIN { print ${r#*-} - $start }")
    ffmpeg -v error -y -ss "$start" -i "$name.mp4" -t "$dur" \
      -vf "scale=1080:2400:force_original_aspect_ratio=decrease,pad=1080:2400:(ow-iw)/2:(oh-ih)/2,fps=30" \
      -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -an "$part"
    echo "file '$part'" >> "$list"
  done
done
ffmpeg -v error -y -f concat -safe 0 -i "$list" -c copy nest-finance-demo.mp4
rm -f part-*.mp4 "$list"
echo "wrote $OUT/nest-finance-demo.mp4 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 nest-finance-demo.mp4)s)"
