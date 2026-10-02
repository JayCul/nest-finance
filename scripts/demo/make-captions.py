"""Captions for the demo video, from the voiceover script and its start times.

    python scripts/demo/make-captions.py
Writes docs/demo-captions.srt (upload it to YouTube as subtitles) and
demo-recordings/nest-finance-demo-captioned.mp4: the recording framed in 1080x1920 (9:16, for Shorts)
with the captions in a band under the phone, so they never cover the app. place-voiceover.py voices it.
"""
import importlib.util
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("pv", Path(__file__).with_name("place-voiceover.py"))
pv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pv)

WPS = 2.6  # narration pace, words a second
# Written for the narrator, shown as figures.
SHOWN = {"S K R": "SKR", "sixty out of a hundred": "60 out of 100", "ninety-one percent": "91%"}
lines = [l.strip() for l in pv.SCRIPT.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("<")]
assert len(lines) == len(pv.START)
plain = pv.OUT / "nest-finance-demo.mp4"
video_len = pv.ffprobe_duration(plain)


def ts(t):
    ms = round(t * 1000)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def chunks(text, limit=40):
    """Split a line into caption cards of at most two lines of about `limit` characters."""
    for spoken, shown in SHOWN.items():
        text = text.replace(spoken, shown)
    words, cards, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > limit * 2 and cur:
            cards.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    cards.append(cur)
    return cards


# Captions with no voiceover line: the real-phone segment at the end (08-phone).
EXTRA = [
    (165.0, 168.0, "The same APK on a real Android phone (POCO F6). PINs are set up first."),
    (168.0, 170.5, "Phantom signs over Mobile Wallet Adapter."),
    (170.5, 173.5, "Nest Intelligence explains the withdrawal before it is requested."),
    (173.5, 176.0, "Backup PIN: a plain wallet opens while the phone's key freezes the savings."),
    (176.0, 180.0, "Seconds later, the emergency contact gets the text. Location blurred here."),
]

srt, n = [], 0
for k, (start, line) in enumerate(zip(pv.START, lines)):
    end = min(start + len(line.split()) / WPS + 0.6, pv.START[k + 1] if k + 1 < len(pv.START) else video_len)
    cards = chunks(line)
    total = sum(len(c) for c in cards)
    t = start
    for c in cards:
        d = (end - start) * len(c) / total
        n += 1
        srt += [str(n), f"{ts(t)} --> {ts(t + d)}", c, ""]
        t += d
for start, end, text in EXTRA:
    n += 1
    srt += [str(n), f"{ts(start)} --> {ts(end)}", text, ""]
out = ROOT / "docs" / "demo-captions.srt"
out.write_text("\n".join(srt), encoding="utf-8")
print(f"{n} captions -> {out}")

# ASS file at the output's own resolution so sizes are in real pixels.
W, H, PHONE_H, TOP = 1080, 1920, 1620, 30
def ass_t(t):
    cs = round(t * 100)
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"
events = []
for i in range(0, len(srt), 4):
    a, b = srt[i + 1].split(" --> ")
    to_s = lambda x: int(x[:2]) * 3600 + int(x[3:5]) * 60 + int(x[6:8]) + int(x[9:]) / 1000
    events.append(f"Dialogue: 0,{ass_t(to_s(a))},{ass_t(to_s(b))},Cap,,0,0,0,,{srt[i + 2]}")
ass = ROOT / "demo-recordings" / "captions.ass"
ass.write_text(f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Arial,46,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,0,2,60,60,{(H - TOP - PHONE_H - 120) // 2 + 20},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(events) + "\n", encoding="utf-8")
ass_arg = str(ass).replace("\\", "/").replace(":", "\\:")
vf = (f"scale=-2:{PHONE_H},pad={W}:{H}:(ow-iw)/2:{TOP}:color=0x0b2230,ass='{ass_arg}'")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(plain), "-vf", vf, "-c:v", "libx264", "-preset", "medium",
                "-crf", "20", "-pix_fmt", "yuv420p", "-an", str(pv.OUT / "nest-finance-demo-captioned.mp4")], check=True)
print("wrote", pv.OUT / "nest-finance-demo-captioned.mp4")
