# Glow for the light pass: particles over black, plus bloom, soft star streaks and a light column
# from the box mouth. Output is additive (meant for mix-blend-mode: screen). PIL only.
from PIL import Image, ImageFilter, ImageChops, ImageDraw, ImageEnhance, ImageOps

def _scale(im, k):
    return ImageEnhance.Brightness(im).enhance(k)

def glow(path, frame, mouth=(292, 352)):
    im = Image.open(path).convert("RGBA")
    base = Image.new("RGB", im.size, 0); base.paste(im, (0, 0), im)   # over black; the box is black
    out = base
    for r, k in ((3, 1.0), (10, 0.8), (28, 0.6)):                    # bloom
        out = ImageChops.screen(out, _scale(base.filter(ImageFilter.GaussianBlur(r)), k * 1.6))
    hot = base.convert("L").point(lambda v: max(0, min(255, (v - 150) * 3)))
    for w, h in ((14, 600), (600, 20)):                                # four-point flares on the brightest beads
        st = hot.resize((w, h), Image.BILINEAR).resize((600, 600), Image.BILINEAR)
        out = ImageChops.screen(out, ImageOps.colorize(_scale(st, 1.4), (0, 0, 0), (255, 224, 160)))
    t = frame - 124                                                    # light column: rises with the flaps, settles
    k = 0 if t < 0 else min(1, t / 5) * (1 - 0.55 * min(1, max(0, t - 6) / 12))
    if k > 0:
        col = Image.new("L", (600, 600), 0); cx, cy = mouth
        ImageDraw.Draw(col).polygon([(cx - 150, cy), (cx + 150, cy), (cx + 70, cy - 300), (cx - 70, cy - 300)], fill=255)
        col = _scale(col.filter(ImageFilter.GaussianBlur(38)), 0.42 * k)
        out = ImageChops.screen(out, ImageOps.colorize(col, (0, 0, 0), (255, 214, 140)))
    return out
