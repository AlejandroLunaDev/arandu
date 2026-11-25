# Packs the box opening into the sprite strips the canvas L4 board uses. Run with `python -I` (PIL only)
# after box_anim.py and box_fx.py rendered frames 100-150 into out/boxanim/.
# Writes out/box-anim-strip.webp (box pass, 51 cells of 320x222, transparent), out/box-fx-strip.webp
# (glowed light pass, 51 cells of 320x312 on black, bottom-aligned, for mix-blend-mode: screen),
# out/box-anim-cat.webp (Arandu in the open box) and out/box-anim-closed.webp.
# WebP is capped at 16383 px wide, which is why the cells are 320 px.
import os
import sys
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)  # `python -I` leaves the script's folder off the path, and glow.py lives here
from glow import glow
D = os.path.join(HERE, "out", "boxanim")
O = os.path.join(HERE, "out")
FRAMES = range(100, 151)
CROP = (48, 138, 538, 478)  # union of the box's bounds over every frame and the cat still, plus 6 px

box = [Image.open(os.path.join(D, f"b_{f:04d}.png")).convert("RGBA") for f in FRAMES]
cat = Image.open(os.path.join(D, "cat.png")).convert("RGBA")
W = 320
sc = W / (CROP[2] - CROP[0])
H = round((CROP[3] - CROP[1]) * sc)
FXCROP = (CROP[0], 0, CROP[2], CROP[3])  # the light rises above the box, so keep everything above it
FH = round(CROP[3] * sc)

strip = Image.new("RGBA", (W * len(box), H))
fx = Image.new("RGB", (W * len(box), FH))
for i, f in enumerate(FRAMES):
    strip.paste(box[i].crop(CROP).resize((W, H), Image.LANCZOS), (i * W, 0))
    fx.paste(glow(os.path.join(D, f"x_{f:04d}.png"), f).crop(FXCROP).resize((W, FH), Image.LANCZOS), (i * W, 0))
strip.save(os.path.join(O, "box-anim-strip.webp"), quality=82, method=6)
fx.save(os.path.join(O, "box-fx-strip.webp"), quality=78, method=6)
cat.crop(CROP).resize((W, H), Image.LANCZOS).save(os.path.join(O, "box-anim-cat.webp"), quality=88, method=6)
box[0].crop(CROP).resize((W, H), Image.LANCZOS).save(os.path.join(O, "box-anim-closed.webp"), quality=88, method=6)

# A preview of both passes composited at five moments, to check the look before uploading.
pv = Image.new("RGB", (W * 5, FH), (20, 17, 25))
for j, i in enumerate((22, 27, 31, 36, 50)):
    t = Image.new("RGB", (W, FH), (20, 17, 25))
    b = strip.crop((i * W, 0, i * W + W, H))
    t.paste(b, (0, FH - H), b)
    pv.paste(ImageChops.screen(t, fx.crop((i * W, 0, i * W + W, FH))), (j * W, 0))
pv.save(os.path.join(O, "fx-preview.png"))
print("cells", W, H, "fx cells", W, FH)
