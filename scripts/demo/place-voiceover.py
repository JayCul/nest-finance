"""Times a voiceover to the demo video.

ElevenLabs' newer models ignore <break> tags, so read the whole script straight through, then run:
    python scripts/demo/place-voiceover.py <voiceover.mp3>
It finds the pauses in the audio, matches the script's sentences to the speech between them (by word
count), cuts out each line of docs/voiceover-elevenlabs.txt and places it at its start time from
START below. Writes demo-recordings/voiceover-timed.wav and nest-finance-demo-voiced.mp4.
"""
import re
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "demo-recordings"
VIDEO = OUT / "nest-finance-demo.mp4"
SCRIPT = ROOT / "docs" / "voiceover-elevenlabs.txt"
# Where each line starts in the video, in seconds (docs/demo-video-script.md).
START = [0.0, 8.5, 12.5, 20.0, 30.0, 41.0, 47.0, 56.5, 66.5, 77.0, 84.5, 95.0, 102.5, 114.0, 124.7,
         131.0, 138.0, 147.5, 155.0, 162.5, 166.0]


def ffprobe_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return float(out)


def speech_segments(audio):
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(audio), "-af", "silencedetect=noise=-38dB:d=0.2",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    marks = [float(v) for v in re.findall(r"silence_(?:start|end): ([0-9.]+)", log)]
    total = ffprobe_duration(audio)
    segs, t = [], 0.0
    for s, e in zip(marks[0::2], marks[1::2]):
        if s - t > 0.05:
            segs.append((t, s))
        t = e
    if total - t > 0.05:
        segs.append((t, total))
    return segs


def main(audio):
    lines = [l for l in SCRIPT.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("<break")]
    assert len(lines) == len(START), f"{len(lines)} lines in the script but {len(START)} start times"
    sentences = [(i, len(re.findall(r"[A-Za-z0-9'-]+", s))) for i, l in enumerate(lines) for s in re.findall(r"[^.!?]+[.!?]", l)]
    segs = speech_segments(audio)
    words = [w for _, w in sentences]
    rate = sum(words) / sum(e - s for s, e in segs)

    # Match consecutive sentences to consecutive speech segments: one sentence may span a few segments
    # (a comma pause), or one segment may hold a few short sentences.
    @lru_cache(None)
    def best(i, j):
        if i == len(words) and j == len(segs):
            return 0.0, ()
        if i == len(words) or j == len(segs):
            return float("inf"), ()
        result = (float("inf"), ())
        for a in range(1, 5):
            for b in range(1, 5):
                if (a > 1 and b > 1) or i + a > len(words) or j + b > len(segs):
                    continue
                spoken = segs[j + b - 1][1] - segs[j][0]
                cost = (spoken - sum(words[i:i + a]) / rate) ** 2 + 0.3 * (a - 1 + b - 1)
                rest = best(i + a, j + b)
                if cost + rest[0] < result[0]:
                    result = (cost + rest[0], ((i, a, j, b),) + rest[1])
        return result

    sys.setrecursionlimit(10000)
    spans = {}
    for i, a, j, b in best(0, 0)[1]:
        for k in range(i, i + a):
            line = sentences[k][0]
            s, e = spans.get(line, (segs[j][0], 0))
            spans[line] = (s, segs[j + b - 1][1])

    video_len = ffprobe_duration(VIDEO)
    parts, labels = [], []
    for k, at in enumerate(START):
        s, e = spans[k]
        s, e = max(s - 0.08, 0), e + 0.12
        nxt = START[k + 1] if k + 1 < len(START) else video_len
        flag = "  OVERLAPS the next line" if at + (e - s) > nxt + 0.05 else ""
        print(f"line {k + 1:2d}: {e - s:4.1f}s at {at:6.1f}s{flag}")
        parts.append(f"[0:a]atrim={s:.3f}:{e:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,"
                     f"afade=t=out:st={e - s - 0.04:.3f}:d=0.04,adelay={int(at * 1000)}[a{k}]")
        labels.append(f"[a{k}]")
    parts.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0,apad=whole_dur={video_len:.2f}[mix]")
    filter_file = OUT / "voiceover-filter.txt"
    filter_file.write_text(";\n".join(parts))
    wav = OUT / "voiceover-timed.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(audio), "-filter_complex_script", str(filter_file),
                    "-map", "[mix]", "-ar", "44100", "-c:a", "pcm_s16le", str(wav)], check=True)
    voiced = OUT / "nest-finance-demo-voiced.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(VIDEO), "-i", str(wav), "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(voiced)], check=True)
    filter_file.unlink()
    print(f"wrote {voiced}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
