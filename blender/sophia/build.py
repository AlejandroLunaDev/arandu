"""Build Sophia, Arandu's companion, in the open Blender scene.

Run it inside Blender, for example through the Blender MCP:
    import runpy; runpy.run_path("<repo>/blender/sophia/build.py", run_name="__main__")

She is built by Arandu's own script (../arandu/build.py) with her own proportions and coat, so she has his
skeleton, bone for bone, and his clips (../arandu/animate.py) fit her. She is a short-haired brown tabby with
lynx points, from the owner's own cat: a fine, feminine face with big ears and blue almond eyes on a rounder,
heavier body. Everything lives in the "Sophia" collection, and her materials are Sophia<Part>.
"""

import importlib.util
import math
import os

import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))


def arandu(name):
    """A fresh copy of one of Arandu's scripts, whose settings this file can change without touching his."""
    spec = importlib.util.spec_from_file_location("sophia_" + name, os.path.join(HERE, "..", "arandu", name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


cat = arandu("build")
smooth, mix, srgb = cat.smooth, cat.mix, cat.srgb

cat.NAME = cat.COLL = "Sophia"
cat.BODY_TRIS = 22000  # her stripes are vertex colours: a finer surface keeps them crisp

# ---------------------------------------------------------------- palette

GROUND = srgb("#DDD0BA")  # cream, between the stripes
BACK = srgb("#C9B596")  # a little darker along the back
STRIPE = srgb("#6E4B31")  # brown
CREAM = srgb("#F1E6D2")  # muzzle, chin, chest, belly
POINT = srgb("#CDB99C")  # the face's mask
EAR_OUT = srgb("#8C6A4C")
cat.EAR_IN = srgb("#E9AEB5")
cat.NOSE = srgb("#E59AA2")
cat.AMBER = srgb("#A9D3EE")  # her eyes: the names are his, the blue is hers
cat.AMBER_LOW = srgb("#D2EAF7")
cat.AMBER_TOP = srgb("#7FAED3")
cat.PUPIL = srgb("#0D0B0A")
cat.FUR = srgb("#6E4B31")  # the lids: a darker line round the eyes
cat.WHISKER = srgb("#F4EFE6")

# ---------------------------------------------------------------- a fine face, big ears

cat.HEAD_R = (0.128, 0.150, 0.132)  # smaller and narrower than his
cat.EAR_H, cat.EAR_W = 0.152, 0.13
cat.BUMPS = [
    (Vector((1, 0, -0.32)).normalized(), 0.013, 0.26),  # a small muzzle
    (Vector((1, 0.2, -0.40)).normalized(), 0.006, 0.13),
    (Vector((1, -0.2, -0.40)).normalized(), 0.006, 0.13),
    (Vector((1, 0, -0.75)).normalized(), 0.006, 0.14),  # a little chin
]


def head_offset(n):
    """His head, with less flat a face, slim cheeks and a jaw that narrows to the chin."""
    a, b, c = cat.HEAD_R
    p = Vector((a * n.x, b * n.y, c * n.z))
    if n.x > 0:
        p.x *= 1 - 0.05 * smooth(0.35, 1.0, n.x)
    if n.z > 0.55:
        p.z -= 0.012 * smooth(0.55, 1.0, n.z)
    p.y *= 1 + 0.02 * smooth(0.25, 0.85, abs(n.y)) * math.exp(-((n.z + 0.25) / 0.35) ** 2)
    p.y *= 1 - 0.14 * smooth(0.1, 0.8, n.x) * smooth(0.0, -0.7, n.z)
    for d, height, spread in cat.BUMPS:
        ang = math.acos(max(-1.0, min(1.0, n.dot(d))))
        p += n * height * math.exp(-((ang / spread) ** 2))
    return p


def shape_head(shape):
    """Short hair: no cheek ruff and no ear tufts, the head and the ears alone."""
    shape.add("head", cat.sphere_grid(64, 40, lambda th, ph: cat.head_point(cat.unit(th, ph))))
    for side, tag in ((1, "L"), (-1, "R")):
        shape.add("ear" + tag, cat.ear_shell(side))


# ---------------------------------------------------------------- a round body

BELLY = ((-0.03, 0, 0.165), (0.155, 0.128, 0.108))


def torso_radius(t):
    return 0.118 + 0.006 * smooth(0.0, 0.6, t)


def tail_radius(t):
    """Slimmer than his plume: short hair."""
    return (0.02 + 0.012 * math.sin(math.pi * (0.1 + 0.8 * t))) * (1 - 0.55 * smooth(0.6, 1.0, t))


def shape_body(shape):
    """His body without the long-hair tufts, rounder in the middle and wider at the hips."""
    hips, chest = (Vector(c) for c in cat.SPINE)
    ts = [i / 30 for i in range(31)]
    shape.add("body", cat.sweep([hips.lerp(chest, t) for t in ts], [torso_radius(t) for t in ts]))
    shape.add("body", cat.ellipsoid(*BELLY))
    shape.add("body", cat.ellipsoid(*cat.NECK))
    for s in (1, -1):
        y = 0.062 * s
        shape.add("body", cat.sweep([Vector((0.10 + 0.012 * t, y, 0.15 - 0.115 * t)) for t in (i / 7 for i in range(8))],
                                    [0.036] * 8))
        shape.add("body", cat.ellipsoid((0.124, y, 0.026), (0.046, 0.038, 0.027)))
        y = 0.074 * s
        shape.add("body", cat.ellipsoid((-0.125, y, 0.155), (0.076, 0.056, 0.086)))
        shape.add("body", cat.sweep([Vector((-0.14 + 0.005 * t, y, 0.09 - 0.05 * t)) for t in (i / 5 for i in range(6))],
                                    [0.034] * 6))
        shape.add("body", cat.ellipsoid((-0.112, y, 0.026), (0.054, 0.039, 0.027)))
    ts = [i / 40 for i in range(41)]
    shape.add("body", cat.sweep([cat.bezier(cat.TAIL_CTRL, t) for t in ts], [tail_radius(t) for t in ts]))


MAX_EDGE = 0.012  # m: the decimation leaves big faces where the back is flat, and a stripe smears over them


arandu_fused = cat.fused_mesh


def fused_mesh(coll, shape):
    """His fused surface, with every edge longer than MAX_EDGE split, so the stripes have vertices to land on."""
    body = arandu_fused(coll, shape)
    bm = bmesh.new()
    bm.from_mesh(body.data)
    for _ in range(4):
        long = [e for e in bm.edges if e.calc_length() > MAX_EDGE]
        if not long:
            break
        bmesh.ops.subdivide_edges(bm, edges=long, cuts=1)
        bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(body.data)
    bm.free()
    return body


arandu_fur = cat.fur_data


def fur_data(p, n, head, ear_inside, on_ear):
    length, comb = arandu_fur(p, n, head, ear_inside, on_ear)
    return length * 0.35, comb


# ---------------------------------------------------------------- the tabby coat


def stripe(x, period, width=0.3):
    """1 on a stripe, 0 between: stripes `period` apart, `width` of the period wide."""
    s = 0.5 + 0.5 * math.cos(2 * math.pi * x / period)
    return smooth(1 - width, 1 - width * 0.35, s)


def body_coat(p, n):
    col = mix(GROUND, BACK, smooth(0.2, 0.9, n.z))
    t, dist = min(((t, (p - q).length) for t, q in cat.TAIL_SAMPLES), key=lambda x: x[1])
    on_tail = smooth(0.05, 0.035, dist) * smooth(-0.17, -0.21, p.x)
    on_legs = smooth(0.13, 0.10, p.z)
    # Mackerel stripes run down the sides; rings go round the legs and the tail, whose tip is dark.
    sides = stripe(p.x + 0.006 * math.sin(p.z * 40 + p.y * 25), 0.056, 0.4) * smooth(-0.35, 0.2, n.z)
    legs = stripe(p.z, 0.03, 0.36) * smooth(0.6, 0.2, n.x)
    tail = max(stripe(t, 1 / 7, 0.35), smooth(0.86, 0.92, t))
    dark = max(sides * (1 - on_legs) * (1 - on_tail), legs * on_legs * (1 - on_tail), tail * on_tail)
    col = mix(col, STRIPE, dark)
    belly = smooth(-0.35, -0.7, n.z) * (1 - on_tail)
    chest = smooth(0.3, 0.7, n.x) * smooth(0.07, 0.11, p.x) * smooth(0.12, 0.17, p.z)
    paws = smooth(0.03, 0.015, p.z)
    return mix(col, CREAM, max(belly, chest, paws * 0.6))


def head_coat(p):
    hn = (p - cat.HEAD_C).normalized()
    if p.z > cat.HEAD_C.z + cat.HEAD_R[2] * 0.93:
        return EAR_OUT
    col = mix(POINT, BACK, smooth(0.2, 0.7, hn.z))
    # The "M" and the crown: lines over the forehead, front to back.
    crown = stripe(hn.y + 0.06 * hn.x, 0.16, 0.34) * smooth(0.3, 0.5, hn.z)
    # Two lines from each eye's outer corner back over the cheek.
    cheek = stripe(hn.z + 0.08, 0.11, 0.3) * smooth(0.55, 0.72, abs(hn.y)) * smooth(0.12, -0.02, hn.z) * smooth(-0.4, -0.2, hn.z)
    col = mix(col, STRIPE, max(crown, cheek))
    # Cream round the muzzle and the chin, and round the eyes.
    muzzle = smooth(0.74, 0.86, hn.dot(Vector((1, 0, -0.42)).normalized())) + smooth(-0.35, -0.6, hn.z) * smooth(0.0, 0.4, hn.x)
    goggles = 0.0
    for side in (1, -1):
        d = (p - cat.eye_layout(side)[0]).length
        goggles = max(goggles, smooth(cat.EYE_R * 1.55, cat.EYE_R * 1.25, d))
    return mix(col, CREAM, min(1.0, max(muzzle, goggles * 0.7)))


def coat(p, n, head, inside):
    return mix(mix(body_coat(p, n), head_coat(p), head), cat.EAR_IN, inside)


for name in ("head_offset", "shape_head", "fused_mesh", "torso_radius", "tail_radius", "shape_body", "fur_data", "coat"):
    setattr(cat, name, globals()[name])
build = cat.build

if __name__ == "__main__":
    build()
