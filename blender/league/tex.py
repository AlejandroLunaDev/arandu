# Paints the garment textures (color + gold mask + height) for the rank outfits. Run with `python -I`.
import math, os, random
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tex")
os.makedirs(OUT, exist_ok=True)
SS = 3  # supersampling for smooth embroidery edges
PLUM = (58, 17, 66)
KNIT = (64, 20, 74)
GOLD = (226, 176, 74)
WHITE = (240, 234, 220)

def canvas(w, h, base):
    return Image.new("RGB", (w * SS, h * SS), base), Image.new("L", (w * SS, h * SS), 0)

def save(name, col, mask, height=None):
    w, h = col.size[0] // SS, col.size[1] // SS
    col = col.resize((w, h), Image.LANCZOS); mask = mask.resize((w, h), Image.LANCZOS)
    col.save(os.path.join(OUT, f"{name}.png")); mask.save(os.path.join(OUT, f"{name}_m.png"))
    (height.resize((w, h), Image.LANCZOS) if height else mask.filter(ImageFilter.GaussianBlur(1.2))).save(os.path.join(OUT, f"{name}_h.png"))

def gold(dc, dm, fn, *a, **k):
    getattr(dc, fn)(*a, fill=GOLD, **k); getattr(dm, fn)(*a, fill=255, **k)

def vine(dc, dm, x0, x1, yc, amp, period, width, vertical=False):
    """Baroque scroll: a waving stem with curls and leaves, like gold embroidery."""
    P = lambda x, y: (y, x) if vertical else (x, y)
    pts = [P(x, yc + amp * math.sin(2 * math.pi * x / period)) for x in range(x0, x1, 2)]
    gold(dc, dm, "line", pts, width=width, joint="curve")
    for k in range(int(x0 / (period / 2)) - 1, int(x1 / (period / 2)) + 2):
        xp = k * period / 2 + period / 4
        if not x0 <= xp <= x1:
            continue
        side = 1 if k % 2 else -1
        cx, cy = xp + period * 0.08, yc + side * amp * 0.25
        for t in range(0, 300, 10):   # a spiral curl
            r = amp * 0.75 * (1 - t / 330)
            a = math.radians(t) * side
            x, y = cx + r * math.cos(a), cy + side * r * math.sin(a)
            gold(dc, dm, "ellipse", [P(x - width * 0.45, y - width * 0.45)[0], P(x - width * 0.45, y - width * 0.45)[1],
                                     P(x + width * 0.45, y + width * 0.45)[0], P(x + width * 0.45, y + width * 0.45)[1]])
        for j in (-1, 1):   # two leaves off the stem
            lx, ly = xp - period * 0.12 * j, yc + amp * math.sin(2 * math.pi * (xp - period * 0.12 * j) / period)
            for t in range(10):
                f = t / 9
                x = lx + j * f * period * 0.06
                y = ly - side * f * amp * 0.9
                rr = width * 1.1 * math.sin(math.pi * f) + 1
                a, b = P(x - rr, y - rr), P(x + rr, y + rr)
                gold(dc, dm, "ellipse", [min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])])

def velvet_noise(col, strength=6):
    px = col.load(); w, h = col.size
    rnd = random.Random(3)
    for y in range(0, h, SS):
        for x in range(0, w, SS):
            d = rnd.randint(-strength, strength)
            c = px[x, y]
            if c[0] < 120:
                for yy in range(y, min(y + SS, h)):
                    for xx in range(x, min(x + SS, w)):
                        px[xx, yy] = tuple(max(0, min(255, v + d)) for v in c)

def stole():  # mantle: neckline at the top, embroidered hem band at the bottom
    W, H = 1024, 512
    col, m = canvas(W, H, PLUM); dc, dm = ImageDraw.Draw(col), ImageDraw.Draw(m)
    gold(dc, dm, "rectangle", [0, 0, W * SS, 10 * SS])
    for y0, y1 in ((360, 372), (382, 386), (486, 490), (498, 512)):
        gold(dc, dm, "rectangle", [0, y0 * SS, W * SS, y1 * SS])
    vine(dc, dm, 0, W * SS, 436 * SS, 30 * SS, 256 * SS, 6 * SS)
    vine(dc, dm, 0, W * SS, 436 * SS, -30 * SS, 256 * SS, 4 * SS)
    for x in range(0, W, 16):   # a beaded cord under the neckline
        gold(dc, dm, "ellipse", [x * SS, 16 * SS, (x + 9) * SS, 25 * SS])
    velvet_noise(col)
    save("stole", col, m)

def stole_end():  # hanging end: embroidered borders down both long edges, a cord at the bottom
    W, H = 256, 1024
    col, m = canvas(W, H, PLUM); dc, dm = ImageDraw.Draw(col), ImageDraw.Draw(m)
    for x0, x1 in ((0, 8), (54, 58), (198, 202), (248, 256)):
        gold(dc, dm, "rectangle", [x0 * SS, 0, x1 * SS, H * SS])
    for xc in (31, 225):
        vine(dc, dm, 0, H * SS, xc * SS, 14 * SS, 160 * SS, 4 * SS, vertical=True)
    gold(dc, dm, "rectangle", [0, (H - 18) * SS, W * SS, H * SS])
    velvet_noise(col)
    save("stoleend", col, m)

def knit(name, W, H, along_x, stripes):
    """Ribbed knit: rows of V stitches running along the scarf, gold stripes knitted in."""
    col, m = canvas(W, H, KNIT); hgt = Image.new("L", col.size, 0)
    dc, dm, dh = ImageDraw.Draw(col), ImageDraw.Draw(m), ImageDraw.Draw(hgt)
    rib, st = 16 * SS, 10 * SS
    L, A = (W, H) if along_x else (H, W)
    for a in range(0, A * SS, rib):
        for l in range(0, L * SS, st):
            g = any(s0 * SS <= a + rib / 2 <= s1 * SS for s0, s1 in stripes)
            c = GOLD if g else tuple(v + 14 for v in KNIT)
            for side in (-1, 1):   # one V stitch = two slanted loops
                p0 = (l, a + rib / 2); p1 = (l + st, a + rib / 2 + side * rib * 0.42)
                if not along_x:
                    p0, p1 = p0[::-1], p1[::-1]
                dc.line([p0, p1], fill=c, width=int(rib * 0.34)); dh.line([p0, p1], fill=255, width=int(rib * 0.34))
                if g:
                    dm.line([p0, p1], fill=255, width=int(rib * 0.34))
    save(name, col, m, hgt.filter(ImageFilter.GaussianBlur(SS)))

def toga():  # white wool, two gold lines along the hem
    W, H = 1024, 256
    col, m = canvas(W, H, WHITE); dc, dm = ImageDraw.Draw(col), ImageDraw.Draw(m)
    for y0, y1 in ((214, 228), (236, 256)):
        gold(dc, dm, "rectangle", [0, y0 * SS, W * SS, y1 * SS])
    save("toga", col, m)

def leaf(x, y, ang, L, Wd):
    pts = []
    for t in range(13):
        f = t / 12; w = Wd * math.sin(math.pi * f)
        pts.append((f * L - L / 2, w))
    pts += [(px, -py) for px, py in reversed(pts)]
    ca, sa = math.cos(ang), math.sin(ang)
    return [(x + px * ca - py * sa, y + px * sa + py * ca) for px, py in pts]

def crest():  # a shield with a quill, laurel branches and three stars
    S = 512
    col, m = canvas(S, S, PLUM); dc, dm = ImageDraw.Draw(col), ImageDraw.Draw(m)
    def shield(k):
        pts = [(-1, 1), (-0.35, 0.82), (0, 1.05), (0.35, 0.82), (1, 1), (1, 0.15), (0.75, -0.45), (0, -1.1), (-0.75, -0.45), (-1, 0.15)]
        return [((x * k + 1) / 2 * S * SS, (1 - (y * k + 1.1) / 2.2) * S * SS) for x, y in pts]
    gold(dc, dm, "polygon", shield(1.0)); dc.polygon(shield(0.86), fill=PLUM); dm.polygon(shield(0.86), fill=0)
    gold(dc, dm, "line", shield(0.76) + [shield(0.76)[0]], width=3 * SS)
    c = S * SS / 2
    q0, q1 = (c - 70 * SS, c + 150 * SS), (c + 95 * SS, c - 150 * SS)   # the quill
    gold(dc, dm, "line", [q0, q1], width=6 * SS)
    for t in range(18):
        f = 0.35 + 0.6 * t / 17
        x, y = q0[0] + (q1[0] - q0[0]) * f, q0[1] + (q1[1] - q0[1]) * f
        w = 34 * SS * math.sin(math.pi * (f - 0.35) / 0.65)
        gold(dc, dm, "line", [(x, y), (x - w * 0.9, y - w * 0.15)], width=4 * SS)
        gold(dc, dm, "line", [(x, y), (x + w * 0.55, y + w * 0.45)], width=4 * SS)
    for sd in (-1, 1):   # laurel branches curving up from the shield's point
        for t in range(8):
            ang = math.radians((100 + 10 * t) if sd < 0 else (80 - 10 * t))
            x, y = c + 118 * SS * math.cos(ang), c + 10 * SS + 118 * SS * math.sin(ang)
            for k in (-1, 1):
                lx, ly = x + k * 11 * SS * math.cos(ang), y + k * 11 * SS * math.sin(ang)
                tang = ang + (math.pi / 2) * (-1 if sd < 0 else 1) + k * 0.5
                gold(dc, dm, "polygon", leaf(lx, ly, tang, 16 * SS, 6 * SS))
        pts = [(c + 118 * SS * math.cos(math.radians(g)), c + 10 * SS + 118 * SS * math.sin(math.radians(g))) for g in (range(95, 175, 5) if sd < 0 else range(5, 86, 5))]
        gold(dc, dm, "line", pts, width=4 * SS)
    for i, x in enumerate((-60, 0, 60)):   # three stars on top
        cx, cy = c + x * SS, c - 120 * SS - (12 * SS if i == 1 else 0)
        pts = [(cx + (16 if k % 2 == 0 else 7) * SS * math.sin(math.pi * k / 5), cy - (16 if k % 2 == 0 else 7) * SS * math.cos(math.pi * k / 5)) for k in range(10)]
        gold(dc, dm, "polygon", pts)
    save("crest", col, m)

stole(); stole_end(); toga(); crest()
knit("knitwrap", 1024, 256, True, ((12, 30), (226, 244)))
knit("knitend", 256, 1024, False, ())
# the hanging scarf end gets gold bands knitted across near its bottom
col = Image.open(os.path.join(OUT, "knitend.png")); m = Image.open(os.path.join(OUT, "knitend_m.png"))
dc, dm = ImageDraw.Draw(col), ImageDraw.Draw(m)
for y0, y1 in ((760, 784), (800, 824), (900, 924), (940, 964)):
    dc.rectangle([0, y0, 256, y1], fill=GOLD); dm.rectangle([0, y0, 256, y1], fill=255)
for x0 in (40, 208):
    dc.rectangle([x0, 740, x0 + 10, 990], fill=GOLD); dm.rectangle([x0, 740, x0 + 10, 990], fill=255)
col.save(os.path.join(OUT, "knitend.png")); m.save(os.path.join(OUT, "knitend_m.png"))
assert all(os.path.exists(os.path.join(OUT, f"{n}{s}.png")) for n in ("stole", "stoleend", "toga", "crest", "knitwrap", "knitend") for s in ("", "_m", "_h"))
print("textures ok")
