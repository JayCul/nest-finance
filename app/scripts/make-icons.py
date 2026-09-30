"""Builds every app icon and logo asset from the master Nest Finance logo.

Usage: python scripts/make-icons.py <logo.png|webp>
Writes to assets/images/. The master is a rounded square on black; Android masks icons
itself, so the black corners are replaced with the logo's own background gradient.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

src = Image.open(sys.argv[1]).convert("RGB")
out = Path(__file__).resolve().parent.parent / "assets" / "images"
W, H = src.size


def gradient(size):
    """Vertical gradient matching the logo background (sampled top and bottom)."""
    top, bottom = (17, 199, 240), (6, 165, 227)
    g = Image.new("RGB", (1, 256))
    for y in range(256):
        t = y / 255
        g.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    return g.resize(size, Image.BICUBIC)


# 1. Full-bleed square: logo inside its rounded square, gradient outside it. The mask comes
#    from the image itself (anything not near-black), eroded to drop the dark anti-aliased rim.
mask = src.convert("L").point(lambda v: 255 if v > 40 else 0)
mask = mask.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(2))
full = gradient((W, H))
full.paste(src, (0, 0), mask)

full.resize((1024, 1024), Image.LANCZOS).save(out / "icon.png")
full.resize((48, 48), Image.LANCZOS).save(out / "favicon.png")

# 2. Adaptive icon: content scaled into the 66/108 safe zone over the plain gradient.
bg = gradient((1024, 1024))
bg.save(out / "android-icon-background.png")
scale = 0.86
inner = full.resize((round(1024 * scale),) * 2, Image.LANCZOS)
fg = gradient((1024, 1024))
off = (1024 - inner.width) // 2
fg.paste(inner, (off, off))
fg.save(out / "android-icon-foreground.png")

# 3. Alpha from "whiteness": the background is saturated blue (min channel < 20), the mark
#    and wordmark are white to light cyan (min channel 50-255).
def whiteness_alpha(img):
    px = img.load()
    a = Image.new("L", img.size)
    ap = a.load()
    for y in range(img.height):
        for x in range(img.width):
            m = min(px[x, y])
            ap[x, y] = max(0, min(255, round((m - 22) * 255 / 60)))
    return a


alpha = whiteness_alpha(src)

# Monochrome (themed icons): white silhouette, content inside the safe zone.
mono = Image.new("RGBA", (W, H), (255, 255, 255, 0))
mono.putalpha(alpha)
mono_canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
m_inner = mono.resize((round(1024 * scale),) * 2, Image.LANCZOS)
mono_canvas.paste(m_inner, ((1024 - m_inner.width) // 2,) * 2, m_inner)
mono_canvas.save(out / "android-icon-monochrome.png")

# 4. Splash: the logo's own colors on transparent, shown over the cyan splash background.
splash = src.convert("RGBA")
splash.putalpha(alpha)
box = (330, 190, 925, 1060)  # mark + wordmark
splash.crop(box).resize((476, 696), Image.LANCZOS).save(out / "splash-icon.png")

# 5. In-app logo mark: the house-and-leaf on its gradient, as a square tile.
mark = full.crop((335, 180, 915, 760)).resize((256, 256), Image.LANCZOS)
mark.save(out / "logo-mark.png")

# 6. Notification small icon: the mark alone (no wordmark), white on transparent.
m_alpha = mono_canvas.split()[3].crop((0, 0, 1024, 590))
strong = m_alpha.point(lambda v: 255 if v > 150 else 0).filter(ImageFilter.MinFilter(5))
bx = strong.getbbox()
m_alpha = m_alpha.point(lambda v: 0 if v < 60 else min(255, int(v * 1.3)))
m_alpha = m_alpha.crop((bx[0] - 6, bx[1] - 6, bx[2] + 6, bx[3] + 6))
side = max(m_alpha.size)
sq = Image.new("L", (side, side), 0)
sq.paste(m_alpha, ((side - m_alpha.width) // 2, (side - m_alpha.height) // 2))
n_alpha = Image.new("L", (96, 96), 0)
n_alpha.paste(sq.resize((84, 84), Image.LANCZOS), (6, 6))
notif = Image.new("RGBA", (96, 96), (255, 255, 255, 0))
notif.putalpha(n_alpha)
notif.save(out / "notification-icon.png")

# 7. Wallet icon: what wallet approval sheets show (AppConfig.identity). Wallets draw it as is,
# so round the corners here, drawn at 4x and scaled down for smooth edges.
size, scale = 256, 4
round_mask = Image.new("L", (size * scale,) * 2, 0)
ImageDraw.Draw(round_mask).rounded_rectangle((0, 0, size * scale - 1, size * scale - 1), radius=int(size * scale * 0.225), fill=255)
wallet = full.resize((size, size), Image.LANCZOS).convert("RGBA")
wallet.putalpha(round_mask.resize((size, size), Image.LANCZOS))
wallet.save(out / "wallet-icon.png")

print("wrote icon, favicon, adaptive fg/bg/monochrome, splash-icon, logo-mark, notification-icon, wallet-icon to", out)
