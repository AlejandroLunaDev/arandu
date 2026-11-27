"""Build Sophia's theme kit, the things she stands with on a chapter of the Caminho tower, in the open Blender scene.

Run it inside Blender, for example through the Blender MCP:
    import runpy; runpy.run_path("<repo>/blender/sophia/kit.py", run_name="__main__")

One object per thing, "Kit<Name>", in the "SophiaKit" collection, rebuilt on every run. They share the cat's scale
(Sophia sits about 0.45 tall), Z is up, their front faces -Y and their origin is the centre of their base on Z = 0.
The mesh helpers and the material maker are the room props' (../props/build.py). The six she wears (coat,
stethoscope, goggles, hard hat, tie, gown) are rigged to her skeleton elsewhere; these twenty-nine stand beside her.
"""

import importlib.util
import math
import os

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("sophia_props", os.path.join(HERE, "..", "props", "build.py"))
P = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)
Part, blob, add_box, add_lathe, tube, spline, srgb = P.Part, P.blob, P.add_box, P.add_lathe, P.tube, P.spline, P.srgb

COLL = "SophiaKit"
P.MATERIALS.update({  # name: (color, roughness, metallic)
    "KitBone": (srgb("#F1EBDD"), 0.6, 0.0),
    "KitTooth": (srgb("#FBF8F1"), 0.2, 0.0),
    "KitGum": (srgb("#E59AA2"), 0.5, 0.0),
    "KitIron": (srgb("#3A3645"), 0.35, 0.7),
    "KitRubber": (srgb("#15131B"), 0.6, 0.0),
    "KitPorcelain": (srgb("#F1EBDD"), 0.25, 0.0),
    "KitApple": (srgb("#D9453F"), 0.35, 0.0),
    "KitBanana": (srgb("#F2C94C"), 0.5, 0.0),
    "KitOrange": (srgb("#F0902F"), 0.5, 0.0),
    "KitGrape": (srgb("#7B4FB0"), 0.3, 0.0),
    "KitAmberGlass": (srgb("#C97A1E"), 0.15, 0.0),
    "KitPillRed": (srgb("#EF5D6C"), 0.3, 0.0),
    "KitWhite": (srgb("#FBF8F1"), 0.4, 0.0),
    "KitGlass": (srgb("#CFE8F0"), 0.08, 0.0),
    "KitPotion": (srgb("#3DBE8B"), 0.2, 0.0),
    "KitPotionViolet": (srgb("#9B72CF"), 0.2, 0.0),
    "KitSteel": (srgb("#A9A2B4"), 0.3, 0.8),
    "KitBoard": (srgb("#24443A"), 0.85, 0.0),
    "KitWood": (srgb("#9A6A2A"), 0.55, 0.0),
    "KitDarkWood": (srgb("#5C3B14"), 0.5, 0.0),
    "KitChalk": (srgb("#FBF8F1"), 0.95, 0.0),
    "KitViolet": (srgb("#9B72CF"), 0.45, 0.0),
    "KitAmber": (srgb("#E0A845"), 0.45, 0.0),
    "KitGreen": (srgb("#3D8B5A"), 0.5, 0.0),
    "KitInk": (srgb("#2E2A38"), 0.45, 0.0),
    "KitLcd": (srgb("#A7C9A0"), 0.3, 0.0),
    "KitBlueprint": (srgb("#2F5D9E"), 0.8, 0.0),
    "KitBrick": (srgb("#B5553C"), 0.85, 0.0),
    "KitMortar": (srgb("#DDD3C0"), 0.95, 0.0),
    "KitTape": (srgb("#F2C94C"), 0.4, 0.0),
    "KitGold": (srgb("#E0A845"), 0.3, 0.85),
    "KitLawRed": (srgb("#8E2A2A"), 0.55, 0.0),
    "KitPig": (srgb("#F2A7B3"), 0.45, 0.0),
    "KitCoral": (srgb("#EF5D6C"), 0.4, 0.0),

    "KitVelvet": (srgb("#6B3FA0"), 0.9, 0.0),
    "KitRoof": (srgb("#B5553C"), 0.6, 0.0),
    "KitGlow": (srgb("#5ED0E6"), 0.2, 0.0),
    "KitPcb": (srgb("#2B6544"), 0.5, 0.0),
    "KitDisc": (srgb("#6F6880"), 0.3, 0.6),
})

Y = lambda deg: Matrix.Rotation(math.radians(deg), 4, "Y")
X = lambda deg: Matrix.Rotation(math.radians(deg), 4, "X")
Z = lambda deg: Matrix.Rotation(math.radians(deg), 4, "Z")
T = Matrix.Translation


def cyl(part, r, h, at, mat, m=Matrix(), seg=32):
    """A closed cylinder standing on `at`, turned by m about its base."""
    x, y, z = at
    add_lathe(part, [(0, 0), (r, 0), (r, h), (0, h)], mat, T((x, y, z)) @ m, seg=seg)


def text(coll, body, size, mat, m):
    """Flat lettering, a mesh in the display face, turned by m (it lies in XY, facing +Z)."""
    curve = bpy.data.curves.new("KitText", "FONT")
    curve.body = body
    curve.size = size
    curve.align_x, curve.align_y = "CENTER", "CENTER"
    curve.extrude = size * 0.03
    if os.path.exists(P.FONT):
        curve.font = bpy.data.fonts.load(P.FONT, check_existing=True)
    obj = bpy.data.objects.new("KitText", curve)
    coll.objects.link(obj)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    bpy.data.objects.remove(obj)
    bpy.data.curves.remove(curve)
    verts = [tuple(m @ v.co) for v in me.vertices]
    faces = [tuple(p.vertices) for p in me.polygons]
    bpy.data.meshes.remove(me)
    return verts, faces


# ---------------------------------------------------------------- saúde


def skeleton(coll):
    """A little anatomy skeleton on a stand: skull, spine, ribs, pelvis and limbs in bone."""
    p = Part()
    cyl(p, 0.05, 0.012, (0, 0, 0), "KitDarkWood")
    cyl(p, 0.006, 0.08, (0, 0.02, 0.012), "KitSteel")
    blob(p, (0, 0, 0.27), (0.038, 0.034, 0.04), "KitBone")  # skull
    blob(p, (0, -0.012, 0.245), (0.026, 0.024, 0.02), "KitBone")  # jaw
    for x in (-0.014, 0.014):
        blob(p, (x, -0.03, 0.275), (0.009, 0.006, 0.01), "KitRubber")  # eye sockets
    p.add(*tube([(0, 0.004, 0.23), (0, 0.006, 0.17), (0, 0.004, 0.115)], 0.007, sides=10), "KitBone")
    for k in range(4):  # ribs
        z = 0.212 - k * 0.016
        w = 0.034 - k * 0.002
        p.add(*tube(spline([(-w, 0.004, z), (-w * 0.8, -0.022, z - 0.004), (0, -0.026, z - 0.006),
                            (w * 0.8, -0.022, z - 0.004), (w, 0.004, z)], 16), 0.0035, sides=6), "KitBone")
    blob(p, (0, 0, 0.11), (0.03, 0.018, 0.016), "KitBone")  # pelvis
    for s in (-1, 1):
        p.add(*tube([(s * 0.03, 0, 0.215), (s * 0.044, -0.004, 0.17), (s * 0.05, -0.012, 0.125)], 0.005, sides=8), "KitBone")
        p.add(*tube([(s * 0.018, 0, 0.1), (s * 0.02, -0.004, 0.06), (s * 0.02, 0, 0.02)], 0.006, sides=8), "KitBone")
        blob(p, (s * 0.02, -0.01, 0.016), (0.008, 0.014, 0.005), "KitBone")
    return p.build("KitSkeleton", coll)


def tooth(coll):
    """A big shiny molar, two roots, a smile of gum at its foot."""
    p = Part()
    blob(p, (0, 0, 0.12), (0.07, 0.055, 0.05), "KitTooth")
    for x in (-0.03, 0.03):
        blob(p, (x, 0, 0.065), (0.024, 0.024, 0.06), "KitTooth", Y(-12 if x < 0 else 12))
        blob(p, (x, 0, 0.165), (0.03, 0.03, 0.018), "KitTooth")
    blob(p, (0, 0, 0.012), (0.08, 0.06, 0.014), "KitGum")
    return p.build("KitTooth", coll)


def dumbbell(coll):
    """A hand weight lying on its side."""
    p = Part()
    p.add(*tube([(-0.08, 0, 0.035), (0.08, 0, 0.035)], 0.011, sides=16), "KitSteel")
    for x in (-0.07, -0.05, 0.05, 0.07):
        r = 0.035 if abs(x) < 0.06 else 0.028
        add_lathe(p, [(0, -0.008), (r, -0.008), (r, 0.008), (0, 0.008)], "KitIron", T((x, 0, 0.035)) @ Y(90), seg=32)
    return p.build("KitDumbbell", coll)


def fruit_plate(coll):
    """A plate with an apple, an orange, a banana and grapes."""
    p = Part()
    add_lathe(p, [(0, 0), (0.07, 0), (0.1, 0.018), (0.104, 0.022), (0.098, 0.022), (0.068, 0.006), (0, 0.006)], "KitPorcelain", seg=48)
    blob(p, (-0.035, 0.01, 0.045), (0.034, 0.034, 0.032), "KitApple")
    p.add(*tube([(-0.035, 0.01, 0.075), (-0.032, 0.01, 0.09)], 0.003), "KitDarkWood")
    blob(p, (-0.025, 0.01, 0.092), (0.012, 0.004, 0.006), "KitGreen", Y(-30))
    blob(p, (0.03, 0.025, 0.042), (0.03, 0.03, 0.03), "KitOrange")
    p.add(*tube(spline([(-0.06, -0.04, 0.02), (0, -0.055, 0.03), (0.06, -0.035, 0.022)], 16), [0.012] * 16, sides=10), "KitBanana")
    for k, (x, y, z) in enumerate([(0.045, -0.02, 0.022), (0.06, -0.01, 0.022), (0.05, -0.005, 0.038), (0.065, 0.005, 0.03)]):
        blob(p, (x, y, z), (0.011, 0.011, 0.011), "KitGrape")
    return p.build("KitFruitPlate", coll)


def pills(coll):
    """An amber pharmacy bottle with a white cap and two capsules beside it."""
    p = Part()
    add_lathe(p, [(0, 0), (0.035, 0), (0.037, 0.004), (0.037, 0.1), (0.03, 0.106), (0, 0.106)], "KitAmberGlass", seg=40)
    add_box(p, (0.072, 0.002, 0.05), (0, -0.0365, 0.05), "KitWhite", 0.001)  # the label
    add_lathe(p, [(0, 0.104), (0.04, 0.104), (0.04, 0.13), (0, 0.13)], "KitWhite", seg=40)
    for x, deg in ((0.065, 20), (0.06, -50)):
        m = T((x, -0.02 if deg > 0 else 0.02, 0.009)) @ Z(deg) @ Y(90)
        for (a, b), mat in (((-0.012, 0.0), "KitPillRed"), ((0.0, 0.012), "KitWhite")):
            verts, faces = tube([(0, 0, a), (0, 0, b)], 0.009, sides=12)
            p.add(P.moved(verts, m), faces, mat)
    return p.build("KitPills", coll)


def bone(coll):
    """A dog bone, the vet's."""
    p = Part()
    p.add(*tube([(-0.06, 0, 0.022), (0.06, 0, 0.022)], 0.014, sides=16), "KitBone")
    for x in (-0.068, 0.068):
        for y in (-0.016, 0.016):
            blob(p, (x, y, 0.022), (0.02, 0.02, 0.02), "KitBone")
    return p.build("KitBone", coll)


# ---------------------------------------------------------------- ciências


def flask(coll):
    """An Erlenmeyer with green liquid and a test tube of violet leaning on it."""
    p = Part()
    add_lathe(p, [(0, 0), (0.06, 0), (0.062, 0.006), (0.02, 0.1), (0.02, 0.13), (0.024, 0.134), (0, 0.134)], "KitGlass", seg=40)
    add_lathe(p, [(0, 0.004), (0.057, 0.004), (0.042, 0.045), (0, 0.045)], "KitPotion", seg=40)
    m = T((0.075, 0, 0)) @ Y(-14)
    add_lathe(p, [(0, 0.012), (0.012, 0.004), (0.014, 0.01), (0.014, 0.14), (0, 0.14)], "KitGlass", m, seg=24)
    add_lathe(p, [(0, 0.012), (0.011, 0.006), (0.012, 0.012), (0.012, 0.07), (0, 0.07)], "KitPotionViolet", m, seg=24)
    return p.build("KitFlask", coll)


def microscope(coll):
    """A school microscope: foot, arm, stage, tube with its eyepiece and objective."""
    p = Part()
    add_box(p, (0.1, 0.12, 0.02), (0, 0.01, 0.01), "KitInk", 0.008)
    p.add(*tube(spline([(0, 0.05, 0.02), (0, 0.06, 0.1), (0, 0.035, 0.18)], 12), 0.014, sides=12), "KitInk")
    add_box(p, (0.08, 0.07, 0.008), (0, -0.01, 0.08), "KitIron", 0.002)
    m = T((0, -0.01, 0.1)) @ X(-20)
    add_lathe(p, [(0, 0), (0.008, 0), (0.012, 0.02), (0.018, 0.03), (0.018, 0.12), (0.013, 0.125), (0.013, 0.15), (0, 0.15)],
              "KitSteel", m, seg=28)
    cyl(p, 0.016, 0.01, (0.0, 0.055, 0.11), "KitSteel", Y(90))
    return p.build("KitMicroscope", coll)


def dna(coll):
    """A double helix standing on a small base, the rungs in amber and violet."""
    p = Part()
    cyl(p, 0.045, 0.012, (0, 0, 0), "KitInk")
    n, h, r = 48, 0.26, 0.032
    for phase, mat in ((0, "KitViolet"), (math.pi, "KitAmber")):
        pts = [(r * math.cos(2.4 * math.pi * i / n + phase), r * math.sin(2.4 * math.pi * i / n + phase), 0.02 + h * i / n) for i in range(n + 1)]
        p.add(*tube(pts, 0.006, sides=10), mat)
    for i in range(2, n, 4):
        a = 2.4 * math.pi * i / n
        z = 0.02 + h * i / n
        p.add(*tube([(r * math.cos(a), r * math.sin(a), z), (-r * math.cos(a), -r * math.sin(a), z)], 0.0035, sides=6), "KitWhite")
    return p.build("KitDna", coll)


# ---------------------------------------------------------------- exatas


def chalkboard(coll, formula="f(x) = x²"):
    """A small chalkboard on an easel, with a formula in chalk and a stick of chalk on its ledge."""
    p = Part()
    add_box(p, (0.26, 0.016, 0.18), (0, 0, 0.19), "KitWood", 0.004)
    add_box(p, (0.236, 0.004, 0.156), (0, -0.008, 0.19), "KitBoard", 0.001, seg=1)
    add_box(p, (0.24, 0.02, 0.008), (0, -0.012, 0.098), "KitWood", 0.002)
    add_box(p, (0.03, 0.006, 0.006), (0.07, -0.016, 0.105), "KitChalk", 0.002, seg=1)
    for x in (-0.1, 0.1):
        p.add(*tube([(x, -0.03, 0), (x * 0.9, 0.0, 0.29)], 0.006, sides=8), "KitWood")
    p.add(*tube([(0, 0.08, 0), (0, 0.012, 0.25)], 0.005, sides=8), "KitWood")
    p.add(*text(coll, formula, 0.045, "KitChalk", T((0, -0.0105, 0.2)) @ X(90)), "KitChalk")
    return p.build("KitChalkboard", coll)


def chart(coll):
    """A bar chart on a card stand, a curve across the bars."""
    p = Part()
    add_box(p, (0.22, 0.012, 0.16), (0, 0, 0.1), "KitWhite", 0.006)
    add_box(p, (0.12, 0.08, 0.01), (0, 0.03, 0.005), "KitInk", 0.003)
    for k, (h, mat) in enumerate(((0.04, "KitViolet"), (0.075, "KitAmber"), (0.1, "KitGreen"), (0.06, "KitViolet"))):
        add_box(p, (0.03, 0.006, h), (-0.06 + k * 0.04, -0.008, 0.035 + h / 2), mat, 0.002, seg=1)
    curve = [(-0.08 + 0.16 * i / 20, -0.012, 0.05 + 0.08 * math.exp(-((i - 11) / 5) ** 2)) for i in range(21)]
    p.add(*tube(curve, 0.003, sides=6), "KitCoral")
    return p.build("KitChart", coll)


def calculator(coll):
    """A pocket calculator propped up, its display reading 42."""
    p = Part()
    m = T((0, 0, 0.0)) @ X(-62)
    add_box(p, (0.1, 0.016, 0.15), (0, 0, 0.075), "KitInk", 0.008, m=m)
    add_box(p, (0.08, 0.004, 0.03), (0, -0.009, 0.125), "KitLcd", 0.002, m=m, seg=1)
    for r in range(4):
        for c in range(4):
            mat = "KitAmber" if c == 3 else "KitSteel"
            add_box(p, (0.016, 0.006, 0.014), (-0.03 + c * 0.02, -0.009, 0.085 - r * 0.02), mat, 0.003, m=m, seg=1)
    p.add(*text(coll, "42", 0.02, "KitInk", m @ T((0.02, -0.0115, 0.125)) @ X(90)), "KitInk")
    add_box(p, (0.1, 0.012, 0.06), (0, 0.06, 0.03), "KitInk", 0.005)  # the stand behind it
    return p.build("KitCalculator", coll)


# ---------------------------------------------------------------- engenharia e arquitetura


def blueprint(coll):
    """A rolled blueprint lying down, a set square leaning on it."""
    p = Part()
    p.add(*tube([(-0.11, 0, 0.03), (0.11, 0, 0.03)], 0.03, sides=24), "KitBlueprint")
    for x in (-0.11, 0.11):
        cyl(p, 0.018, 0.003, (x, 0, 0.03), "KitWhite", Y(90 if x > 0 else -90))
    outline = [(0, 0), (0.12, 0), (0, 0.12)]
    verts, faces = P.prism(outline, -0.003, 0.003)
    p.add(P.moved(verts, T((-0.05, -0.04, 0.0)) @ X(90) @ Y(0)), faces, "KitAmber")
    return p.build("KitBlueprint", coll)


def bricks(coll):
    """Three stacked bricks with a tape measure on top."""
    p = Part()
    for k, (x, y, deg) in enumerate(((-0.035, 0, 0), (0.04, 0.01, 6), (0.0, 0.0, -4))):
        add_box(p, (0.07, 0.045, 0.035), (0, 0, 0.0175), "KitBrick", 0.004, m=T((x, y, k // 2 * 0.037)) @ Z(deg))
    add_box(p, (0.15, 0.05, 0.003), (0, 0, 0.0365), "KitMortar", 0.001, seg=1)
    cyl(p, 0.022, 0.018, (0.0, -0.005, 0.074), "KitTape", seg=32)
    add_box(p, (0.06, 0.014, 0.002), (0.05, -0.005, 0.083), "KitTape", 0.0005, seg=1)
    return p.build("KitBricks", coll)


def maquette(coll):
    """An architecture model on a drawing board: a white house with a red roof, a little tree."""
    p = Part()
    add_box(p, (0.26, 0.2, 0.014), (0, 0, 0.007), "KitWood", 0.003)
    add_box(p, (0.22, 0.16, 0.003), (0, 0, 0.0155), "KitGreen", 0.001, seg=1)
    add_box(p, (0.12, 0.08, 0.07), (-0.02, 0.01, 0.052), "KitWhite", 0.002)
    roof = [(-0.07, 0), (0.07, 0), (0, 0.05)]
    verts, faces = P.prism(roof, -0.048, 0.048)
    p.add(P.moved(verts, T((-0.02, 0.01, 0.087)) @ X(90)), faces, "KitRoof")
    add_box(p, (0.02, 0.003, 0.035), (-0.02, -0.031, 0.035), "KitDarkWood", 0.001, seg=1)
    for x in (-0.06, 0.02):
        add_box(p, (0.018, 0.003, 0.018), (x, -0.031, 0.062), "KitGlow", 0.001, seg=1)
    p.add(*tube([(0.08, -0.04, 0.017), (0.08, -0.04, 0.05)], 0.004), "KitDarkWood")
    blob(p, (0.08, -0.04, 0.065), (0.022, 0.022, 0.026), "KitGreen")
    return p.build("KitMaquette", coll)


# ---------------------------------------------------------------- direito


def gavel(coll):
    """A judge's gavel on its sounding block."""
    p = Part()
    add_lathe(p, [(0, 0), (0.05, 0), (0.05, 0.016), (0, 0.016)], "KitDarkWood", seg=40)
    m = T((0, 0, 0.045)) @ Z(25)
    add_lathe(p, [(0, -0.04), (0.024, -0.04), (0.026, -0.032), (0.022, -0.03), (0.022, 0.03), (0.026, 0.032),
                  (0.024, 0.04), (0, 0.04)], "KitDarkWood", m @ X(90), seg=32)
    verts, faces = tube([(0.0, 0, 0.045), (0.14, 0, 0.03)], 0.007, sides=12)
    p.add(P.moved(verts, Z(25)), faces, "KitDarkWood")
    for y in (-0.024, 0.024):
        cyl(p, 0.027, 0.004, (0, y, 0.0), "KitGold", m @ X(90))
    return p.build("KitGavel", coll)


def scales(coll):
    """The scales of justice in brass: a column, a beam, two pans on chains."""
    p = Part()
    add_lathe(p, [(0, 0), (0.05, 0), (0.05, 0.01), (0.012, 0.02), (0.008, 0.24), (0, 0.24)], "KitGold", seg=32)
    blob(p, (0, 0, 0.25), (0.014, 0.014, 0.014), "KitGold")
    p.add(*tube([(-0.11, 0, 0.235), (0, 0, 0.245), (0.11, 0, 0.235)], 0.005, sides=10), "KitGold")
    for x in (-0.11, 0.11):
        for a in range(3):
            ang = 2 * math.pi * a / 3
            p.add(*tube([(x, 0, 0.235), (x + 0.035 * math.cos(ang), 0.035 * math.sin(ang), 0.12)], 0.0015, sides=4), "KitGold")
        add_lathe(p, [(0, 0.1), (0.04, 0.12), (0.042, 0.122), (0, 0.108)], "KitGold", T((x, 0, 0)), seg=32)
    return p.build("KitScales", coll)


def law_book(coll):
    """A fat red code of laws, gold bands on its spine."""
    p = Part()
    add_box(p, (0.06, 0.14, 0.19), (0, 0, 0.095), "KitLawRed", 0.006)
    add_box(p, (0.052, 0.134, 0.182), (0.006, 0.0, 0.095), "KitWhite", 0.002, seg=1)
    for z in (0.04, 0.15):
        add_box(p, (0.062, 0.004, 0.01), (0, -0.07, z), "KitGold", 0.001, seg=1)
    p.add(*text(coll, "LEI", 0.03, "KitGold", T((0, -0.0712, 0.095)) @ X(90) @ Z(90)), "KitGold")
    obj = p.build("KitLawBook", coll)
    obj.data.transform(Z(-25))
    return obj


def books(coll):
    """A stack of three books, a little askew: the kit's spare."""
    p = Part()
    z = 0.0
    for w, d, h, deg, mat in ((0.17, 0.12, 0.03, 4, "KitViolet"), (0.15, 0.11, 0.026, -6, "KitAmber"), (0.16, 0.115, 0.028, 2, "KitGreen")):
        add_box(p, (w, d, h), (0, 0, h / 2), mat, 0.004, m=T((0, 0, z)) @ Z(deg))
        add_box(p, (w - 0.01, d + 0.002, h - 0.008), (0.006, 0, h / 2), "KitWhite", 0.001, m=T((0, 0, z)) @ Z(deg), seg=1)
        z += h
    return p.build("KitBooks", coll)


# ---------------------------------------------------------------- negócios e comunicação


def piggy_bank(coll):
    """A pink piggy bank with a coin going into its slot."""
    p = Part()
    blob(p, (0, 0, 0.07), (0.085, 0.06, 0.058), "KitPig")
    add_lathe(p, [(0, 0), (0.022, 0), (0.022, 0.012), (0, 0.012)], "KitPig", T((0.088, 0, 0.065)) @ Y(90), seg=24)
    for y in (-0.006, 0.006):
        blob(p, (0.1, y, 0.071), (0.002, 0.004, 0.006), "KitRubber")
    for x in (-0.045, 0.045):
        for y in (-0.03, 0.03):
            cyl(p, 0.014, 0.025, (x, y, 0), "KitPig", seg=16)
    for y in (-0.035, 0.035):
        blob(p, (0.05, y, 0.12), (0.016, 0.006, 0.02), "KitPig", X(20 if y < 0 else -20))
        blob(p, (0.065, y * 1.3, 0.085), (0.005, 0.005, 0.005), "KitRubber")
    cyl(p, 0.02, 0.004, (0, 0, 0.13), "KitGold", X(90))
    return p.build("KitPiggyBank", coll)


def megaphone(coll):
    """A megaphone resting on its handle, the bell toward the viewer's right."""
    p = Part()
    m = T((0, 0, 0.065)) @ Y(90)
    add_lathe(p, [(0, -0.07), (0.022, -0.07), (0.026, -0.06), (0.06, 0.07), (0.064, 0.074), (0.054, 0.074), (0, -0.05)],
              "KitCoral", m, seg=40)
    add_lathe(p, [(0.03, 0.0), (0.04, 0.0), (0.04, 0.02), (0.03, 0.02)], "KitWhite", m, seg=40)
    add_box(p, (0.02, 0.024, 0.05), (-0.02, 0, 0.025), "KitInk", 0.006)
    return p.build("KitMegaphone", coll)


def microphone(coll):
    """A reporter's microphone standing on its end, a violet flag with Arandu's A."""
    p = Part()
    add_lathe(p, [(0, 0), (0.014, 0), (0.016, 0.12), (0.02, 0.15), (0, 0.15)], "KitInk", seg=28)
    blob(p, (0, 0, 0.175), (0.032, 0.032, 0.034), "KitSteel")
    add_box(p, (0.05, 0.05, 0.03), (0, 0, 0.13), "KitViolet", 0.004)
    p.add(*text(coll, "A", 0.026, "KitWhite", T((0, -0.0255, 0.13)) @ X(90)), "KitWhite")
    return p.build("KitMicrophone", coll)


# ---------------------------------------------------------------- educação, psicologia, tecnologia


def apple(coll):
    """A red apple with a leaf, and a stick of chalk beside it: the teacher's."""
    p = Part()
    add_lathe(p, [(0, 0.005), (0.02, 0.0), (0.04, 0.012), (0.046, 0.04), (0.04, 0.066), (0.018, 0.074), (0, 0.066)], "KitApple", seg=40)
    p.add(*tube([(0, 0, 0.066), (0.004, 0, 0.088)], 0.003), "KitDarkWood")
    blob(p, (0.014, 0, 0.088), (0.016, 0.004, 0.007), "KitGreen", Y(-25))
    add_box(p, (0.05, 0.01, 0.01), (0.075, -0.02, 0.005), "KitChalk", 0.003, m=Z(25))
    return p.build("KitApple", coll)


def couch(coll):
    """The analyst's couch in violet velvet, a notepad and a pencil on its seat."""
    p = Part()
    add_box(p, (0.3, 0.12, 0.05), (0, 0, 0.055), "KitVelvet", 0.016)
    add_box(p, (0.07, 0.12, 0.08), (-0.12, 0, 0.11), "KitVelvet", 0.025)
    blob(p, (-0.1, 0, 0.1), (0.04, 0.05, 0.02), "KitAmber", Y(-30))  # a cushion
    for x in (-0.13, 0.13):
        for y in (-0.045, 0.045):
            add_lathe(p, [(0, 0), (0.008, 0), (0.011, 0.03), (0, 0.03)], "KitDarkWood", T((x, y, 0)), seg=16)
    add_box(p, (0.05, 0.065, 0.006), (0.07, -0.01, 0.083), "KitWhite", 0.002)
    p.add(*tube([(0.05, -0.04, 0.088), (0.1, 0.0, 0.088)], 0.003, sides=6), "KitAmber")
    return p.build("KitCouch", coll)


def laptop(coll):
    """The room's notebook at the kit's size, its screen glowing with code."""
    obj = P.notebook(coll)
    for o in (obj, *obj.children):
        o.data.transform(Matrix.Diagonal((0.45, 0.45, 0.45, 1)))
    obj.name = "KitLaptop"
    screen = obj.children[0]
    screen.name = "KitLaptopScreen"
    return obj


def robot(coll):
    """A friendly round robot: a boxy head with two glowing eyes and an antenna, the AI's."""
    p = Part()
    add_box(p, (0.1, 0.08, 0.08), (0, 0, 0.06), "KitSteel", 0.02)
    add_box(p, (0.12, 0.09, 0.09), (0, 0, 0.155), "KitSteel", 0.025)
    add_box(p, (0.1, 0.004, 0.06), (0, -0.045, 0.155), "KitInk", 0.012, seg=2)
    for x in (-0.025, 0.025):
        blob(p, (x, -0.048, 0.16), (0.012, 0.004, 0.014), "KitGlow")
        p.add(*tube([(x * 2.6, 0, 0.09), (x * 3.2, -0.01, 0.04)], 0.008, sides=8), "KitSteel")
    p.add(*tube([(0, 0, 0.2), (0, 0, 0.235)], 0.003, sides=6), "KitInk")
    blob(p, (0, 0, 0.24), (0.009, 0.009, 0.009), "KitCoral")
    for x in (-0.025, 0.025):
        cyl(p, 0.016, 0.02, (x, 0, 0), "KitInk", seg=20)
    return p.build("KitRobot", coll)


def joystick(coll):
    """A game controller lying flat: cross pad, four buttons."""
    p = Part()
    add_box(p, (0.12, 0.065, 0.028), (0, 0, 0.018), "KitInk", 0.014)
    for x in (-0.055, 0.055):
        blob(p, (x, 0.008, 0.016), (0.026, 0.03, 0.014), "KitInk")
    add_box(p, (0.026, 0.009, 0.006), (-0.035, -0.002, 0.033), "KitRubber", 0.002, seg=1)
    add_box(p, (0.009, 0.026, 0.006), (-0.035, -0.002, 0.033), "KitRubber", 0.002, seg=1)
    for (x, y), mat in zip(((0.035, 0.009), (0.035, -0.013), (0.024, -0.002), (0.046, -0.002)), ("KitGreen", "KitCoral", "KitViolet", "KitAmber")):
        cyl(p, 0.0055, 0.005, (x, y, 0.03), mat, seg=16)
    return p.build("KitJoystick", coll)


def chip(coll):
    """A circuit board standing on its edge, a black chip with gold pins and a few traces."""
    p = Part()
    m = X(-70)
    add_box(p, (0.16, 0.006, 0.12), (0, 0, 0.06), "KitPcb", 0.003, m=m)
    add_box(p, (0.06, 0.008, 0.06), (0, -0.006, 0.06), "KitRubber", 0.003, m=m)
    for k in range(6):
        for s in (-1, 1):
            add_box(p, (0.004, 0.004, 0.012), (-0.025 + k * 0.01, -0.005, 0.06 + s * 0.035), "KitGold", m=m)
            add_box(p, (0.012, 0.004, 0.004), (s * 0.035, -0.005, 0.035 + k * 0.01), "KitGold", m=m)
    for z in (0.02, 0.1):
        add_box(p, (0.14, 0.004, 0.003), (0, -0.004, z), "KitGold", m=m)
    add_box(p, (0.12, 0.05, 0.012), (0, 0.04, 0.006), "KitInk", 0.003)  # its stand
    return p.build("KitChip", coll)


def discs(coll):
    """Three stacked drums, the database's sign, a violet band on each."""
    p = Part()
    for k in range(3):
        z = k * 0.042
        add_lathe(p, [(0, z), (0.06, z), (0.062, z + 0.004), (0.062, z + 0.034), (0.06, z + 0.038), (0, z + 0.038)], "KitDisc", seg=48)
        add_lathe(p, [(0.0625, z + 0.016), (0.0625, z + 0.022)], "KitViolet", seg=48)
        blob(p, (0.04, -0.047, z + 0.019), (0.004, 0.003, 0.004), "KitGlow")
    return p.build("KitDiscs", coll)


ITEMS = [skeleton, tooth, dumbbell, fruit_plate, pills, bone, flask, microscope, dna, chalkboard, chart, calculator,
         blueprint, bricks, maquette, gavel, scales, law_book, books, piggy_bank, megaphone, microphone, apple, couch, laptop, robot, joystick, chip, discs]


def reset_collection():
    coll = bpy.data.collections.get(COLL)
    if coll:
        for o in list(coll.objects):
            data = o.data
            bpy.data.objects.remove(o)
            if isinstance(data, bpy.types.Mesh) and data.users == 0:
                bpy.data.meshes.remove(data)
    else:
        coll = bpy.data.collections.new(COLL)
        bpy.context.scene.collection.children.link(coll)
    return coll


def build(layout=True):
    """Every thing of the kit; with layout, laid out in rows of six beside Sophia, for a look."""
    coll = reset_collection()
    out = [make(coll) for make in ITEMS]
    if layout:
        for i, obj in enumerate(out):
            obj.location = (0.6 + (i % 6) * 0.35, (i // 6) * 0.35, 0)
    print("Sophia's kit: %d things" % len(out))
    return out


if __name__ == "__main__":
    build()
