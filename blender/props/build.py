"""Build the Arandu room props in the open Blender scene.

Run it inside Blender, for example through the Blender MCP:
    import runpy; runpy.run_path("<repo>/blender/props/build.py", run_name="__main__")

Units are metres, Z is up and the front of every prop faces -Y, toward the camera. The props share
the cat's scale: Arandu sits about 0.5 tall. Each prop is one mesh object whose origin is where the
web places it:
- The books, PlantPot, YarnBall, Ball and the table lamps: the centre of the base, on Z = 0.
- The shelves (see SHELVES): the centre of the plank's top, so whatever sits on one goes at the
  shelf's own height.
- LampPendant: the top of the shade. Its child LampPendantCord rises 1 m from there: scale it on
  Z (Y on the web) to the length the page needs.
Every lamp carries an empty named <lamp>Light where the bulb is, for the web's point light. Lamps
are built switched off: the web lights them by giving "LampBulb" and "LampShadeInner" an emissive
color.

BookOpen (see book_open) is a book in parts that open about its spine, with faces for the web to
draw pages on. The books (see BOOKS) are blanks in several proportions that the web dresses through canvas
textures. Each one stands with its spine to the front. "BookCover" maps each cover to the full 0-1
UV square, the spine at u = 0 on the front (+X) cover; "BookSpine" maps the spine with u across
it, left to right seen from the front, and v up.

The plant's vertices carry "_sway", 0 at the pot rising to 1 at the vine tips, for a wind shader.
It is made for a shelf: stand it POT_EDGE behind the shelf's front edge.
Everything the script creates lives in the "Props" collection, which it rebuilds on every run.
"""

import math
import os
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

COLL = "Props"

# ---------------------------------------------------------------- palette (ds/tokens.css)


def srgb(hex_color):
    """Brand hex (sRGB) to the linear RGBA Blender stores."""
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], 1.0)


MATERIALS = {  # name: (color, roughness, metallic)
    "BookCover": (srgb("#6B3FA0"), 0.6, 0.0),  # violet-600
    "BookSpine": (srgb("#6B3FA0"), 0.6, 0.0),
    "BookPages": (srgb("#E8E0CF"), 0.85, 0.0),  # cream-200
    "BookGilt": (srgb("#E0A845"), 0.3, 0.8),  # amber-400 gold leaf on a grand book's page edges
    "BookPage": (srgb("#FBF8F1"), 0.85, 0.0),  # cream-50: an open page, which the web draws on
    "BookLeafFront": (srgb("#FBF8F1"), 0.85, 0.0),
    "BookLeafBack": (srgb("#FBF8F1"), 0.85, 0.0),
    "ShelfWood": (srgb("#3A3645"), 0.7, 0.0),  # ink-700
    "ShelfBracket": (srgb("#6F6880"), 0.45, 0.5),  # ink-500
    "LampShade": (srgb("#DDD3C0"), 0.8, 0.0),  # cream-300
    "LampShadeInner": (srgb("#F1EBDD"), 0.9, 0.0),  # cream-100
    "LampBulb": (srgb("#3A3645"), 0.3, 0.0),  # ink-700 while off, amber-300 when lit
    "LampMetal": (srgb("#57525F"), 0.4, 0.6),  # ink-600
    "LampCord": (srgb("#6F6880"), 0.6, 0.0),
    "LampAccent": (srgb("#D99A32"), 0.35, 0.7),  # amber-500 brass
    "LampBodyViolet": (srgb("#6B3FA0"), 0.35, 0.0),
    "LampBodyAmber": (srgb("#B97F22"), 0.35, 0.0),  # amber-600
    "PotCeramic": (srgb("#6B3FA0"), 0.55, 0.0),
    "PotSoil": (srgb("#2A2018"), 0.95, 0.0),
    "Leaf": (srgb("#3D8B5A"), 0.55, 0.0),
    "LeafDark": (srgb("#2B6544"), 0.55, 0.0),
    "Stem": (srgb("#47703F"), 0.7, 0.0),
    "Yarn": (srgb("#D99A32"), 0.95, 0.0),  # amber-500, as on the landing
    "YarnDark": (srgb("#8A5A12"), 0.95, 0.0),  # amber-700
    "BallMain": (srgb("#9B72CF"), 0.4, 0.0),  # violet-400
    "BallStripe": (srgb("#F1EBDD"), 0.4, 0.0),
    # the room's furniture
    "DeskTop": (srgb("#4A320E"), 0.5, 0.0),  # amber-900, a dark walnut
    "DeskMat": (srgb("#2E1B46"), 0.9, 0.0),  # violet-900 felt
    "LaptopBody": (srgb("#A9A2B4"), 0.35, 0.7),  # ink-400 aluminium
    "LaptopKey": (srgb("#15131B"), 0.6, 0.0),  # ink-900
    "LaptopTrackpad": (srgb("#6F6880"), 0.3, 0.5),  # ink-500
    "LaptopBezel": (srgb("#09090D"), 0.2, 0.0),  # ink-950
    "LaptopHinge": (srgb("#2E2A38"), 0.4, 0.5),  # ink-800
    "NotebookScreen": (srgb("#15131B"), 0.15, 0.0),  # the display, which the web draws on
    "TvScreen": (srgb("#0B0A10"), 0.15, 0.0),  # the TV's display, which the web draws on
    "ChairLeather": (srgb("#15131B"), 0.45, 0.0),  # ink-900
    "ChairAccent": (srgb("#6B3FA0"), 0.45, 0.0),  # violet-600
    "ChairBase": (srgb("#1F1C27"), 0.4, 0.0),  # ink-850
    "ChairMetal": (srgb("#A9A2B4"), 0.25, 0.9),
    "ChairSlot": (srgb("#09090D"), 0.6, 0.0),
    "SofaFabric": (srgb("#432765"), 0.95, 0.0),  # violet-800
    "SofaCushion": (srgb("#573383"), 0.95, 0.0),  # violet-700
    "SofaPillow": (srgb("#D99A32"), 0.9, 0.0),  # amber-500
    "SofaLeg": (srgb("#8A5A12"), 0.5, 0.0),  # amber-700 wood
    "TableWood": (srgb("#8A5A12"), 0.45, 0.0),  # the side table, in the sofa legs' wood
    "Blanket": (srgb("#DDD3C0"), 1.0, 0.0),  # cream-300 knit
    "BinMetal": (srgb("#6F6880"), 0.35, 0.7),
    "Paper": (srgb("#FBF8F1"), 0.9, 0.0),  # cream-50
    "TrophyBase": (srgb("#15131B"), 0.35, 0.0),
    "TrophyPlate": (srgb("#DDD3C0"), 0.3, 0.8),
    "CapCloth": (srgb("#09090D"), 0.7, 0.0),
    "Tassel": (srgb("#E0A845"), 0.8, 0.0),  # amber-400
    "PencilAmber": (srgb("#E9B75E"), 0.5, 0.0),  # amber-300
    "PencilViolet": (srgb("#9B72CF"), 0.5, 0.0),
    "PencilWood": (srgb("#DDD3C0"), 0.8, 0.0),
    "Graphite": (srgb("#15131B"), 0.4, 0.3),
    "MugCeramic": (srgb("#F1EBDD"), 0.3, 0.0),  # cream-100
    "MugBand": (srgb("#6B3FA0"), 0.3, 0.0),
    "Coffee": (srgb("#3B2414"), 0.15, 0.0),
    "Steam": (srgb("#FBF8F1"), 1.0, 0.0),  # the web makes it a fading, rising wisp
    "FrameWood": (srgb("#9A6A2A"), 0.55, 0.0),  # warm oak, a shade lighter than the side table
    "FrameMat": (srgb("#F1EBDD"), 0.9, 0.0),
    "FrameArt": (srgb("#FBF8F1"), 0.8, 0.0),  # the picture, which the web draws on
    "PlaqueArt": (srgb("#8A5A12"), 0.6, 0.0),  # the plaque's face, which the web draws on
    "SignArt": (srgb("#8A5A12"), 0.6, 0.0),  # the motto sign's face, which the web draws on
    "Twine": (srgb("#DDD3C0"), 0.95, 0.0),  # cream-300 string
    "NailMetal": (srgb("#A9A2B4"), 0.3, 0.9),
    "NeonTube": (srgb("#F1EBDD"), 0.3, 0.0),  # cream-100, glowing white; the web makes it glow
    "NeonBorder": (srgb("#EF5D6C"), 0.3, 0.0),  # the palette's coral red, the sign's frame
    "NeonBacking": (srgb("#15131B"), 0.35, 0.0),  # smoked acrylic
    "StringBulb": (srgb("#F1EBDD"), 0.2, 0.0),  # lit by the web in amber-300
    "RugWool": (srgb("#2E1B46"), 1.0, 0.0),  # violet-900: the rug's ground
    "RugField": (srgb("#432765"), 1.0, 0.0),  # violet-800: its middle
    "RugBand": (srgb("#D99A32"), 1.0, 0.0),  # amber-500: the band between them
    "StringSocket": (srgb("#3A3645"), 0.5, 0.0),
    "TowerStone": (srgb("#DDD3C0"), 0.7, 0.0),
    "TowerWindow": (srgb("#3A3645"), 0.4, 0.0),
    "PawFur": (srgb("#18181B"), 0.6, 0.0),  # the cat's neutral black (blender/arandu FUR_TOP)
    "PawPad": (srgb("#F2B53C"), 0.35, 0.0),  # the amber of the cat's eyes
    "FishBody": (srgb("#F2B53C"), 0.3, 0.0),
    "FishFin": (srgb("#D99A32"), 0.35, 0.0),  # amber-500
    "FishEye": (srgb("#09090D"), 0.15, 0.0),  # ink-950
    "FishGlint": (srgb("#FBF8F1"), 0.2, 0.0),  # cream-50
    "MouseBody": (srgb("#F1EBDD"), 0.85, 0.0),  # cream-100: felt, light enough to show on the app's dark pages
    "MouseEar": (srgb("#B597DD"), 0.7, 0.0),  # violet-300: the inside of its ears
    "MouseTail": (srgb("#9B72CF"), 0.6, 0.0),  # violet-400: a string
    "MouseNose": (srgb("#E0A845"), 0.4, 0.0),  # amber-400
    "MouseEye": (srgb("#09090D"), 0.15, 0.0),  # ink-950
}


def material(name):
    color, roughness, metallic = MATERIALS[name]
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Emission Strength"].default_value = 0.0  # the web lights what glows; a preview's glow never ships
    return mat


# ---------------------------------------------------------------- mesh building


class Part:
    """Faces with a material each, optional UVs and "_sway", joined into one mesh object."""

    def __init__(self):
        self.v, self.f, self.m, self.uv, self.sway, self.mats = [], [], [], [], [], []

    def add(self, verts, faces, mat, uvs=None, sway=0.0):
        """mat is one material name or one per face; sway is a number or a function of the vertex."""
        base = len(self.v)
        for p in verts:
            p = Vector(p)
            self.v.append(p)
            self.sway.append(sway(p) if callable(sway) else sway)
        for i, face in enumerate(faces):
            name = mat if isinstance(mat, str) else mat[i]
            if name not in self.mats:
                self.mats.append(name)
            self.f.append(tuple(base + j for j in face))
            self.m.append(self.mats.index(name))
            self.uv.append(uvs[i] if uvs else [(0.0, 0.0)] * len(face))

    def build(self, name, coll, uv=False, sway=False):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(p) for p in self.v], [], self.f)
        me.polygons.foreach_set("material_index", self.m)
        me.polygons.foreach_set("use_smooth", [True] * len(self.f))
        if uv:
            me.uv_layers.new(name="UVMap").data.foreach_set("uv", [c for face in self.uv for corner in face for c in corner])
        if sway:
            me.attributes.new("_sway", "FLOAT", "POINT").data.foreach_set("value", self.sway)
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        for n in self.mats:
            me.materials.append(material(n))
        obj = bpy.data.objects.new(name, me)
        coll.objects.link(obj)
        # Face-area weighted normals keep flat faces flat next to their rounded edges.
        obj.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL").keep_sharp = True
        return obj


def moved(verts, m):
    return [tuple(m @ Vector(v)) for v in verts]


def lathe(profile, mats, seg=48, closed=False):
    """Revolve (r, z) points about Z; r == 0 makes a pole. mats: one name, or one per profile segment."""
    verts, faces, face_mats, rings = [], [], [], []
    for r, z in profile:
        if r < 1e-6:
            rings.append([len(verts)])
            verts.append((0.0, 0.0, z))
        else:
            rings.append(list(range(len(verts), len(verts) + seg)))
            verts.extend((r * math.cos(2 * math.pi * j / seg), r * math.sin(2 * math.pi * j / seg), z) for j in range(seg))
    pairs = list(range(len(rings) - 1)) + ([len(rings) - 1] if closed else [])
    for k in pairs:
        a, b = rings[k], rings[(k + 1) % len(rings)]
        for j in range(seg):
            j2 = (j + 1) % seg
            if len(a) == 1:
                faces.append((a[0], b[j], b[j2]))
            elif len(b) == 1:
                faces.append((a[j], a[j2], b[0]))
            else:
                faces.append((a[j], a[j2], b[j2], b[j]))
            face_mats.append(mats if isinstance(mats, str) else mats[k])
    return verts, faces, face_mats


def sphere(center, radius, lats=None, seg=32):
    lats = lats or [-90 + 180 * i / 16 for i in range(17)]
    profile = [(radius * math.cos(math.radians(a)), radius * math.sin(math.radians(a))) for a in lats]
    return profile, Matrix.Translation(center)


def tube(points, radius, sides=8, closed=False):
    """Sweep a circle along points. radius is a number or one per point."""
    pts = [Vector(p) for p in points]
    radii = radius if isinstance(radius, (list, tuple)) else [radius] * len(pts)
    count = len(pts)
    t = (pts[1] - pts[0]).normalized()
    n = t.cross(Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))).normalized()
    verts, faces = [], []
    for i, p in enumerate(pts):
        if closed:
            t = (pts[(i + 1) % count] - pts[i - 1]).normalized()
        else:
            t = (pts[min(i + 1, count - 1)] - pts[max(i - 1, 0)]).normalized()
        n = (n - t * n.dot(t)).normalized()  # carry the frame along without twisting it
        b = t.cross(n)
        for s in range(sides):
            a = 2 * math.pi * s / sides
            verts.append(tuple(p + (n * math.cos(a) + b * math.sin(a)) * radii[i]))
    for i in range(count if closed else count - 1):
        i2 = (i + 1) % count
        for s in range(sides):
            s2 = (s + 1) % sides
            faces.append((i * sides + s, i * sides + s2, i2 * sides + s2, i2 * sides + s))
    if not closed:
        for i in (0, count - 1):
            c = len(verts)
            verts.append(tuple(pts[i]))
            faces.extend((c, i * sides + s, i * sides + (s + 1) % sides) for s in range(sides))
    return verts, faces


def rbox(size, radius, center, seg=3):
    """A box with rounded edges."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + Vector(center)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=radius, segments=seg, profile=0.5, affect="EDGES", clamp_overlap=True)
    index = {v: i for i, v in enumerate(bm.verts)}
    verts = [tuple(v.co) for v in bm.verts]
    faces = [tuple(index[v] for v in f.verts) for f in bm.faces]
    bm.free()
    return verts, faces


def spline(ctrl, n):
    """n points on a Catmull-Rom curve through ctrl."""
    p = [Vector(c) for c in ctrl]
    p = [2 * p[0] - p[1]] + p + [2 * p[-1] - p[-2]]
    spans = len(ctrl) - 1
    out = []
    for i in range(n):
        t = i / (n - 1) * spans
        k = min(int(t), spans - 1)
        u = t - k
        p0, p1, p2, p3 = p[k], p[k + 1], p[k + 2], p[k + 3]
        out.append(0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u ** 3))
    return out


def add_lathe(part, profile, mats, m=Matrix(), seg=48, closed=False, sway=0.0):
    verts, faces, face_mats = lathe(profile, mats, seg, closed)
    part.add(moved(verts, m), faces, face_mats, sway=sway)


def add_sphere(part, center, radius, mat, lats=None, m=Matrix()):
    profile, at = sphere(center, radius, lats)
    add_lathe(part, profile, mat, m @ at, seg=32)


def light(name, parent, at):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_size = 0.03
    parent.users_collection[0].objects.link(empty)
    empty.parent = parent
    empty.location = at
    return empty


# ---------------------------------------------------------------- props


BOOKS = {  # name: height, depth (spine to fore-edge, along Y), thickness (along X), spine corner radius,
    #         board thickness, board overhang past the pages
    "Book": (0.40, 0.28, 0.075, 0.03, 0.007, 0.008),
    "BookTall": (0.44, 0.30, 0.06, 0.026, 0.007, 0.008),
    "BookSlim": (0.38, 0.26, 0.042, 0.018, 0.005, 0.007),
    "BookThick": (0.37, 0.27, 0.11, 0.045, 0.008, 0.009),
    "BookShort": (0.30, 0.21, 0.07, 0.028, 0.006, 0.007),
    "BookPaperback": (0.33, 0.22, 0.05, 0.006, 0.0025, 0.0),  # soft cover, flush with its pages
    "BookGrand": (0.52, 0.40, 0.07, 0.03, 0.01, 0.012),  # Arandu's own books: large, gilt-edged hardcovers
}
GILT = {"BookGrand"}  # the books whose page edges are gilt


def arc(r, cx, cy, a0, a1, n):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / n), cy + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def prism(outline, z0, z1):
    """Extrude a counter-clockwise outline from z0 to z1: its sides, then the top and bottom caps."""
    n = len(outline)
    verts = [(x, y, z0) for x, y in outline] + [(x, y, z1) for x, y in outline]
    faces = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    return verts, faces + [tuple(range(n, 2 * n)), tuple(reversed(range(n)))]


def book(coll, name):
    """A blank book: two covers and a rounded spine around a page block, the block rounded to match."""
    H, D, T, RS, C, O = BOOKS[name]
    gap = max(O, 0.0015)  # how far the pages sit inside the covers, so their faces never coincide
    cy, left, right = -D / 2 + RS, -T / 2 + RS, T / 2 - RS  # centres of the spine's two rounded corners

    spine = arc(RS, left, cy, math.pi, 1.5 * math.pi, 8) + arc(RS, right, cy, 1.5 * math.pi, 2 * math.pi, 8)
    inside = arc(RS - C, right, cy, 2 * math.pi, 1.5 * math.pi, 6) + arc(RS - C, left, cy, 1.5 * math.pi, math.pi, 6)
    inner = [(T / 2 - C, D / 2)] + inside + [(-T / 2 + C, D / 2)]  # the cover's inside, a board's width in
    outline = [(-T / 2, D / 2)] + spine + [(T / 2, D / 2)] + inner  # counter-clockwise seen from +Z
    n = len(outline)
    first, last = 1, len(spine)  # outline indices where the spine starts and ends

    lengths = [0.0]
    for i in range(first, last):
        lengths.append(lengths[-1] + math.dist(outline[i], outline[i + 1]))

    flat = D - RS  # covers map their flat part, from the spine's edge to the fore-edge
    blank = (0.995, 0.005)

    def corner_uv(i, side, z):
        x, y = outline[i]
        v = z / H
        if side == "back":
            return ((D / 2 - y) / flat, v)
        if side == "front":
            return ((y + D / 2 - RS) / flat, v)
        if side == "spine":
            return (lengths[i - first] / lengths[-1], v)
        return blank

    verts, faces = prism(outline, 0.0, H)
    mats, uvs = [], []
    for i in range(n):
        j = (i + 1) % n
        side = "back" if i == 0 else "spine" if first <= i < last else "front" if i == last else "edge"
        mats.append("BookSpine" if side == "spine" else "BookCover")
        uvs.append([corner_uv(i, side, 0), corner_uv(j, side, 0), corner_uv(j, side, H), corner_uv(i, side, H)])
    mats += ["BookCover", "BookCover"]
    uvs += [[blank] * n, [blank] * n]

    r = RS - C - 0.0015
    block = arc(r, left, cy, math.pi, 1.5 * math.pi, 6) + arc(r, right, cy, 1.5 * math.pi, 2 * math.pi, 6)
    block = [(-T / 2 + C + 0.0015, D / 2 - gap)] + block + [(T / 2 - C - 0.0015, D / 2 - gap)]

    p = Part()
    p.add(verts, faces, mats, uvs)
    p.add(*prism(block, gap, H - gap), "BookGilt" if name in GILT else "BookPages")
    return p.build(name, coll, uv=True)


OPEN = (0.40, 0.28, 0.03, 0.007, 0.008)  # height, page width, pages per half, board thickness, overhang


def slab(x0, x1, y0, y1, z0, z1, front, back, rest, u_front=None, u_back=None):
    """An axis-aligned box. front (-Y) and back (+Y) get their own material and, if given, UVs that
    map them whole: u runs left to right as seen from that side, v up."""
    verts, faces = prism([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], z0, z1)
    blank = [(0.995, 0.005)] * 4
    mats = [front, rest, back, rest, rest, rest]
    uvs = [u_front or blank, blank, u_back or blank, blank, [blank[0]] * 4, [blank[0]] * 4]
    return verts, faces, mats, uvs


WHOLE = [(0, 0), (1, 0), (1, 1), (0, 1)]  # a face mapped onto the full image, corners in prism order


def book_open(coll):
    """A book that opens, for the web to fly off a shelf, open and leaf through.

    BookOpen is the spine, a half cylinder round the hinge, its origin at the hinge's foot. Its
    children turn about the hinge (Z) from there: BookOpenLeft and BookOpenRight, each a board and
    a block of pages, lie flat open at rotation 0 with their pages to the front (-Y); turning
    BookOpenRight -90 degrees and BookOpenLeft +90 shuts the book. BookOpenLeaf, one page lying on
    the right one, turns -180 degrees onto the left. Every page face ("BookPage", "BookLeafFront",
    "BookLeafBack") and the boards' outsides ("BookCover") map the full 0-1 UV square, u left to
    right as seen from that side; the spine ("BookSpine") maps u across it seen from behind.
    """
    H, D, B, C, O = OPEN
    R = B + C
    lift = 0.004  # the spine's flat face sits behind the pages, so the gutter never shows it

    a0 = math.asin(lift / R)
    curve = arc(R, 0, 0, a0, math.pi - a0, 14)
    verts, faces = prism(curve, 0.0, H)
    n = len(curve)
    mats, uvs = [], []
    for i in range(n):
        if i < n - 1:
            u0, u1 = i / (n - 1), (i + 1) / (n - 1)
            mats.append("BookSpine")
            uvs.append([(u0, 0), (u1, 0), (u1, 1), (u0, 1)])
        else:
            mats.append("BookCover")
            uvs.append([(0.995, 0.005)] * 4)
    mats += ["BookCover", "BookCover"]
    uvs += [[(0.995, 0.005)] * n] * 2
    spine = Part()
    spine.add(verts, faces, mats, uvs)
    root = spine.build("BookOpen", coll, uv=True)

    def half(name, side):
        x0, x1 = (0.0, D) if side > 0 else (-D, 0.0)
        p = Part()
        # The board behind, its outside seen from the back.
        p.add(*slab(x0, x1, B, R, 0.0, H, "BookCover", "BookCover", "BookCover", u_back=WHOLE))
        # The pages in front of it, the open page facing the front.
        px0, px1 = (0.003, D - O) if side > 0 else (-D + O, -0.003)
        p.add(*slab(px0, px1, 0.0, B, O, H - O, "BookPage", "BookPages", "BookPages", u_front=WHOLE))
        obj = p.build(name, coll, uv=True)
        obj.parent = root
        return obj

    half("BookOpenLeft", -1)
    half("BookOpenRight", 1)
    # One page, thin, its turning axis through its middle so it lies on either side alike.
    t = 0.0007
    leaf = Part()
    leaf.add(*slab(0.003, D - O, -t, t, O, H - O, "BookLeafFront", "BookLeafBack", "BookPages",
                   u_front=WHOLE, u_back=WHOLE))
    obj = leaf.build("BookOpenLeaf", coll, uv=True)
    obj.parent = root
    obj.location = (0, -2 * t, 0)
    return root


SHELVES = {"ShelfLarge": 1.6, "ShelfMedium": 1.0, "ShelfSmall": 0.55}  # name: length. All share one depth,
# deep enough for the tallest book and the plant pot.


def shelf(coll, name):
    """A wall plank on two L brackets. Its back rests on the wall at +Y."""
    L, W, TH = SHELVES[name], 0.34, 0.05
    p = Part()
    p.add(*rbox((L, W, TH), 0.008, (0, 0, -TH / 2)), "ShelfWood")
    inset = min(0.25, 0.16 * L)  # how far each bracket sits in from its end
    for x in (-L / 2 + inset, L / 2 - inset):
        p.add(*rbox((0.03, 0.022, 0.2), 0.004, (x, W / 2 - 0.011, -TH - 0.1), seg=2), "ShelfBracket")
        p.add(*rbox((0.03, W - 0.05, 0.018), 0.004, (x, 0.025, -TH - 0.009), seg=2), "ShelfBracket")
        p.add(*tube([(x, W / 2 - 0.02, -TH - 0.17), (x, -0.07, -TH - 0.016)], 0.006), "ShelfBracket")
    return p.build(name, coll)


def shade_profile(top, bottom, height, thick, n=10, flare=1.35):
    """A bell shade closed at the top, open below, hanging from z = 0. Returns profile and materials."""
    outer = [(top + (bottom - top) * (t ** flare), -height * t) for t in (i / n for i in range(n + 1))]
    inner = [(r - thick, min(z, -thick)) for r, z in reversed(outer)]
    profile = [(0.0, 0.0)] + outer + inner + [(0.0, -thick)]
    mats = ["LampShade"] * (n + 2) + ["LampShadeInner"] * (n + 1)
    return profile, mats


def lamp_pendant(coll):
    p = Part()
    add_lathe(p, *shade_profile(0.09, 0.21, 0.18, 0.006))
    add_lathe(p, [(0.0, 0.0), (0.012, 0.0), (0.012, 0.022), (0.0, 0.022)], "LampMetal", seg=24)  # collar
    add_lathe(p, [(0.0, -0.006), (0.02, -0.006), (0.02, -0.125), (0.0, -0.125)], "LampMetal", seg=24)  # socket
    add_sphere(p, (0, 0, -0.17), 0.05, "LampBulb")
    lamp = p.build("LampPendant", coll)
    cord = Part()
    cord.add(*tube([(0, 0, 0.0), (0, 0, 1.0)], 0.004), "LampCord")
    cord = cord.build("LampPendantCord", coll)
    cord.parent = lamp
    light("LampPendantLight", lamp, (0, 0, -0.15))
    return lamp


def lamp_mushroom(coll):
    """A rounded dome on a slim stem."""
    p = Part()
    add_lathe(p, [(0.0, 0.0), (0.08, 0.0), (0.088, 0.006), (0.088, 0.016), (0.08, 0.024), (0.0, 0.026)], "LampBodyViolet")
    add_lathe(p, [(0.0, 0.02), (0.016, 0.02), (0.013, 0.2), (0.0, 0.2)], "LampBodyViolet", seg=24)
    n = 12
    outer = [(0.14 * math.cos(a), 0.19 + 0.11 * math.sin(a)) for a in (math.pi / 2 * (1 - i / n) for i in range(n + 1))]
    inner = [(0.134 * math.cos(a), 0.19 + 0.104 * math.sin(a)) for a in (math.pi / 2 * i / n for i in range(n + 1))]
    add_lathe(p, outer + inner, ["LampShade"] * (n + 1) + ["LampShadeInner"] * n)
    add_sphere(p, (0, 0, 0.215), 0.03, "LampBulb")
    lamp = p.build("LampMushroom", coll)
    light("LampMushroomLight", lamp, (0, 0, 0.22))
    return lamp


def lamp_classic(coll):
    """A ceramic vase base under a tapered drum shade."""
    p = Part()
    body = spline([(0.055, 0.0), (0.07, 0.014), (0.084, 0.06), (0.084, 0.1), (0.062, 0.14), (0.036, 0.165), (0.03, 0.18)], 28)
    add_lathe(p, [(0.0, 0.0)] + [tuple(v) for v in body] + [(0.036, 0.182), (0.036, 0.19), (0.0, 0.19)], "LampBodyAmber")
    add_lathe(p, [(0.0, 0.19), (0.007, 0.19), (0.007, 0.40), (0.0, 0.40)], "LampAccent", seg=16)
    drum = [(0.15, 0.25), (0.10, 0.41), (0.095, 0.41), (0.145, 0.25)]
    add_lathe(p, drum, ["LampShade", "LampShade", "LampShadeInner", "LampShade"], closed=True)
    for k in range(3):
        a = 2 * math.pi * k / 3
        p.add(*tube([(0, 0, 0.40), (0.095 * math.cos(a), 0.095 * math.sin(a), 0.405)], 0.003, sides=6), "LampAccent")
    add_sphere(p, (0, 0, 0.31), 0.035, "LampBulb")
    add_sphere(p, (0, 0, 0.415), 0.012, "LampAccent")
    lamp = p.build("LampClassic", coll)
    light("LampClassicLight", lamp, (0, 0, 0.31))
    return lamp


def lamp_desk(coll):
    """A reading lamp: two arms with brass joints and a small bell head aimed down at +X."""
    p = Part()
    add_lathe(p, [(0.0, 0.0), (0.075, 0.0), (0.08, 0.008), (0.078, 0.02), (0.07, 0.026), (0.0, 0.028)], "LampMetal")
    foot, elbow, wrist = Vector((-0.02, 0, 0.03)), Vector((-0.05, 0, 0.22)), Vector((0.09, 0, 0.29))
    p.add(*tube([foot, elbow], 0.008), "LampMetal")
    p.add(*tube([elbow, wrist], 0.008), "LampMetal")
    for at, r in ((foot, 0.014), (elbow, 0.016), (wrist, 0.014)):
        add_sphere(p, at, r, "LampAccent")
    head = Matrix.Translation(wrist + Vector((0.01, 0, -0.005))) @ Matrix.Rotation(math.radians(-40), 4, "Y")
    profile, mats = shade_profile(0.025, 0.075, 0.09, 0.004, n=8)
    add_lathe(p, profile, [m if m != "LampShade" else "LampBodyViolet" for m in mats], head)
    add_sphere(p, (0, 0, -0.06), 0.022, "LampBulb", m=head)
    lamp = p.build("LampDesk", coll)
    light("LampDeskLight", lamp, head @ Vector((0, 0, -0.07)))
    return lamp


def leaf(p, base, axis, normal, length, width, mat, sway):
    """A pothos leaf: heart-shaped, folded along the midrib, its tip curling back."""
    x = axis.normalized()
    n = (normal - x * normal.dot(x)).normalized()
    y = n.cross(x)
    rows = 6
    verts = []
    for i in range(rows):
        t = i / rows
        w = width * math.sin(math.pi * t ** 0.75) ** 0.9
        back = 0.14 * length * (1 - t) ** 4  # the lobes reach behind the stalk
        curl = -0.12 * length * t * t
        for side in (-1, 0, 1):
            along = t * length - (back if side else 0.0)
            lift = 0.18 * w if side == 0 else 0.0
            verts.append(base + x * along + y * (side * w) + n * (lift + curl))
    verts.append(base + x * length + n * (-0.12 * length))
    faces = []
    for i in range(rows - 1):
        a, b = 3 * i, 3 * (i + 1)
        faces += [(a, a + 1, b + 1, b), (a + 1, a + 2, b + 2, b + 1)]
    tip = 3 * rows
    a = 3 * (rows - 1)
    faces += [(a, a + 1, tip), (a + 1, a + 2, tip)]
    p.add(verts, faces, mat, sway=sway)


POT_EDGE = 0.12  # the pot's centre sits this far behind the front edge of the shelf it stands on


def plant_pot(coll):
    """A pothos in a ceramic pot, made for a shelf: its long vines fall off the front edge (-Y) and the
    side ones lie on the plank. Place the pot with its centre POT_EDGE behind the shelf's front edge."""
    rng = random.Random(3)
    up = Vector((0, 0, 1))

    def sway(v):
        return min(1.0, max(0.0, (0.16 - v.z) / 0.5)) ** 1.2

    def lying(v):
        return 0.1 * sway(v)

    p = Part()
    pot = [(0.0, 0.0), (0.066, 0.0), (0.072, 0.006), (0.088, 0.125), (0.097, 0.13), (0.099, 0.15),
           (0.092, 0.155), (0.086, 0.15), (0.084, 0.14), (0.0, 0.14)]
    add_lathe(p, pot, ["PotCeramic"] * 8 + ["PotSoil"])

    # (direction in degrees, -90 is the front; how far it falls below the shelf, or None if it lies on it;
    #  how far a lying vine trails along the plank)
    vines = [(-66, 0.42, 0), (-84, 0.22, 0), (-100, 0.34, 0), (-118, 0.5, 0),
             (-14, None, 0.16), (-166, None, 0.13), (24, None, 0.1), (156, None, 0.12)]
    for phi, hang, trail in vines:
        a = math.radians(phi)
        u, side = Vector((math.cos(a), math.sin(a), 0)), Vector((-math.sin(a), math.cos(a), 0))
        ctrl = [0.04 * u + 0.14 * up, 0.085 * u + 0.175 * up, 0.112 * u + 0.165 * up, 0.125 * u + 0.12 * up]
        if hang:  # out past the edge first, then down, so the vine never cuts into the plank
            for k in range(1, 5):
                t = k / 4
                x = 0.14 * u.x + 0.022 * math.sin(4.7 * t + a)
                ctrl.append(Vector((x, -(POT_EDGE + 0.02 + 0.015 * t), 0.12 - hang * t)))
        else:  # down the pot's side and along the plank
            ctrl += [0.115 * u + 0.06 * up, 0.14 * u + 0.0035 * up]
            for k in range(1, 4):
                t = k / 3
                ctrl.append((0.14 + trail * t) * u + side * (0.02 * math.sin(5 * t + a)) + 0.0035 * up)
        pts = spline(ctrl, 28)
        vine_sway = sway if hang else lying
        p.add(*tube(pts, [0.0032 - 0.0012 * i / 27 for i in range(28)], sides=6), "Stem", sway=vine_sway)

        walked, nxt, flip = 0.0, 0.03, 1
        total = sum((pts[i + 1] - pts[i]).length for i in range(27))
        for i in range(1, 27):
            walked += (pts[i] - pts[i - 1]).length
            if walked < nxt:
                continue
            nxt += 0.03 + rng.uniform(-0.006, 0.006)
            tangent = (pts[i + 1] - pts[i - 1]).normalized()
            axis = flip * tangent.cross(u) + 0.6 * tangent + 0.3 * u + Vector([rng.uniform(-0.15, 0.15) for _ in range(3)])
            size = 0.05 * (1 - 0.45 * walked / total)
            base, normal = pts[i], u + 0.3 * up
            if pts[i].z < 0.03:  # on the plank the leaves lie flat, just above it
                axis.z = 0.1 + 0.2 * abs(axis.z)
                base, normal = pts[i] + 0.007 * up, up + 0.2 * u
            leaf(p, base, axis, normal, size, 0.62 * size, rng.choice(["Leaf", "LeafDark"]), vine_sway)
            flip = -flip

    for k in range(11):  # the crown: leaves on short stalks, arching out of the soil
        a = math.radians(360 * k / 11 + rng.uniform(-14, 14))
        u = Vector((math.cos(a), math.sin(a), 0))
        root = rng.uniform(0.0, 0.05) * u + 0.14 * up
        base = root + rng.uniform(0.015, 0.045) * u + rng.uniform(0.025, 0.07) * up
        p.add(*tube([root, base], 0.0028, sides=6), "Stem")
        axis = rng.uniform(0.5, 1.0) * u + rng.uniform(0.3, 0.9) * up + Vector([rng.uniform(-0.2, 0.2) for _ in range(3)])
        size = rng.uniform(0.05, 0.075)
        leaf(p, base, axis, up + Vector([rng.uniform(-0.3, 0.3) for _ in range(3)]), size, 0.64 * size,
             rng.choice(["Leaf", "LeafDark"]), lambda v: 0.15 * min(1.0, max(0.0, (v.z - 0.15) / 0.08)))
    return p.build("PlantPot", coll, sway=True)


def yarn_ball(coll):
    """An amber ball of yarn wound with darker strands, its loose end trailing on the floor."""
    rng = random.Random(7)
    R, c = 0.1, Vector((0, 0, 0.1))
    p = Part()
    add_sphere(p, c, R, "Yarn")
    for k in range(16):
        axis = Vector([rng.gauss(0, 1) for _ in range(3)]).normalized()
        a = axis.cross(Vector((0, 0, 1)) if abs(axis.z) < 0.9 else Vector((1, 0, 0))).normalized()
        b = axis.cross(a)
        phase = rng.uniform(0, 6.28)
        ring = [c + (R + 0.002 + 0.0015 * math.sin(3 * th + phase)) * (a * math.cos(th) + b * math.sin(th))
                for th in (2 * math.pi * i / 48 for i in range(48))]
        p.add(*tube(ring, 0.0045, sides=6, closed=True), "YarnDark" if k % 3 == 0 else "Yarn")
    start = c + R * Vector((0.6, -0.7, -0.4)).normalized()
    trail = [start, (0.12, -0.1, 0.03), (0.2, -0.13, 0.005), (0.27, -0.08, 0.005), (0.33, -0.13, 0.005), (0.38, -0.11, 0.005)]
    p.add(*tube(spline(trail, 30), 0.0045, sides=6), "Yarn")
    return p.build("YarnBall", coll)


def ball(coll):
    """A small toy ball with one cream band, tipped for a playful look."""
    band = math.degrees(math.asin(0.012 / 0.045))
    lats = sorted({-90 + 180 * i / 16 for i in range(17)} | {-band, band})
    profile, _ = sphere((0, 0, 0), 0.045, lats)
    mats = ["BallStripe" if -band <= (lats[k] + lats[k + 1]) / 2 <= band else "BallMain" for k in range(len(lats) - 1)]
    p = Part()
    add_lathe(p, profile, mats, Matrix.Translation((0, 0, 0.045)) @ Matrix.Rotation(math.radians(30), 4, "Y"), seg=32)
    return p.build("Ball", coll)


def blob(part, center, radii, mat, turn=Matrix()):
    """An ellipsoid: a unit sphere scaled by radii, turned, then moved to center."""
    add_sphere(part, (0, 0, 0), 1.0, mat, m=Matrix.Translation(center) @ turn @ Matrix.Diagonal((*radii, 1.0)))


def paw(coll):
    """Arandu's paw held up to the camera: a round black palm, four toes, amber beans and a lobed
    main pad. The week's patinhas, one per day studied. Its origin is the centre of its base."""
    p = Part()
    blob(p, (0, 0, 0.045), (0.045, 0.022, 0.042), "PawFur")
    for x, z, tilt in ((-0.04, 0.074, 0.6), (-0.015, 0.093, 0.2), (0.015, 0.093, -0.2), (0.04, 0.074, -0.6)):
        blob(p, (x, 0.004, z), (0.019, 0.017, 0.02), "PawFur")
        blob(p, (x + 0.004 * tilt, -0.012, z - 0.002), (0.013, 0.008, 0.015), "PawPad")
    blob(p, (0, -0.017, 0.031), (0.025, 0.009, 0.017), "PawPad")
    for x in (-0.017, 0.017):
        blob(p, (x, -0.015, 0.02), (0.012, 0.008, 0.011), "PawPad")
    return p.build("Paw", coll)


def fish(coll):
    """A peixinho, the coin of the shop: a round amber goldfish swimming toward +X, its side to the
    camera, with a forked tail, fins and one shiny eye. Its origin is the centre of its base."""
    p = Part()
    turn = lambda deg: Matrix.Rotation(math.radians(deg), 4, "Y")
    blob(p, (0, 0, 0.04), (0.05, 0.03, 0.035), "FishBody")
    blob(p, (-0.066, 0, 0.053), (0.026, 0.006, 0.012), "FishFin", turn(35))
    blob(p, (-0.066, 0, 0.027), (0.026, 0.006, 0.012), "FishFin", turn(-35))
    blob(p, (-0.006, 0, 0.074), (0.024, 0.005, 0.01), "FishFin", turn(-18))
    blob(p, (0.01, -0.028, 0.03), (0.015, 0.005, 0.007), "FishFin", turn(20))
    blob(p, (0.03, -0.021, 0.05), (0.007, 0.007, 0.007), "FishEye")
    blob(p, (0.032, -0.027, 0.053), (0.0022, 0.0022, 0.0022), "FishGlint")
    return p.build("Fish", coll)


def mouse(coll):
    """A toy mouse, the one Arandu catches each day the person studies: a felt body in a teardrop headed toward +X,
    its side to the camera, two round ears, a bead for an eye and a string for a tail curled over its back. Its origin
    is the centre of its base."""
    p = Part()
    turn = lambda deg: Matrix.Rotation(math.radians(deg), 4, "Y")
    blob(p, (-0.006, 0, 0.036), (0.047, 0.035, 0.036), "MouseBody")
    blob(p, (0.036, 0, 0.03), (0.034, 0.024, 0.024), "MouseBody", turn(8))  # the head, narrowing to the nose
    blob(p, (0.07, 0, 0.026), (0.007, 0.007, 0.007), "MouseNose")
    for y in (-0.021, 0.021):  # the ears: a felt disc each, tipped back, with a violet inside
        blob(p, (0.02, y, 0.071), (0.006, 0.026, 0.026), "MouseBody", turn(-18))
        blob(p, (0.0235, y, 0.0715), (0.004, 0.019, 0.019), "MouseEar", turn(-18))
    blob(p, (0.05, -0.0195, 0.038), (0.0055, 0.0055, 0.0055), "MouseEye")
    blob(p, (0.0515, -0.0238, 0.0402), (0.0018, 0.0018, 0.0018), "FishGlint")
    # Curled up over its back, not trailing behind: in the interface the mouse is a small mark, and a long tail would
    # take half of its width.
    tail = [(-0.047, 0, 0.03), (-0.066, 0, 0.034), (-0.079, -0.004, 0.05), (-0.074, -0.008, 0.07),
            (-0.057, -0.01, 0.081), (-0.042, -0.01, 0.073), (-0.045, -0.01, 0.061)]
    p.add(*tube(spline(tail, 40), 0.004, sides=8), "MouseTail")
    return p.build("Mouse", coll)


# ---------------------------------------------------------------- the room's furniture
#
# The furniture shares the cat's scale too: about 1.3 times a person's, so the cat and the books never
# look small beside it. Floor and desk pieces have their origin at the centre of their base on Z = 0.
# Wall pieces (the frames, NeonSign) have it at the centre of their back, on the wall, their front
# toward -Y; StringLights has it at its left hook.

DESK_TOP = 0.98  # the desk's top: the trophy, cap, pencil cup and mug stand here
DESK_MAT = DESK_TOP + 0.006  # the felt mat on it, where the notebook stands
FONT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "Outfit.ttf")  # the brand's display face
NEON_TEXT = ("Abra", "um livro")  # two lines: the book and the first, then the second
NEON_APP = "Baixe o app"  # the small sign under it: a phone and one line, the way into the app
FRAMES = {"FrameTall": (0.34, 0.44), "FrameSquare": (0.3, 0.3)}  # name: width, height


def add_box(part, size, center, mat, radius=0.0, m=Matrix(), seg=3):
    if radius > 0:
        verts, faces = rbox(size, radius, center, seg)
    else:
        hx, hy, hz = (s / 2 for s in size)
        cx, cy, cz = center
        verts = [(cx + x * hx, cy + y * hy, cz + z * hz) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
        faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    part.add(moved(verts, m), faces, mat)


def soft(verts, faces, radius, seg=3):
    """Round a closed mesh's edges."""
    bm = bmesh.new()
    vs = [bm.verts.new(v) for v in verts]
    for f in faces:
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=radius, segments=seg, profile=0.5, affect="EDGES", clamp_overlap=True)
    index = {v: i for i, v in enumerate(bm.verts)}
    out = [tuple(v.co) for v in bm.verts], [tuple(index[v] for v in f.verts) for f in bm.faces]
    bm.free()
    return out


def upright(outline, thick, radius, m):
    """An outline in (x, height), extruded thick toward -Y from Y = 0, its edges rounded, then moved by m."""
    verts, faces = soft(*prism(outline, 0, thick), radius)
    return moved(verts, m @ Matrix.Rotation(math.radians(90), 4, "X")), faces


def mirrored(half):
    """A symmetric outline from its right half, listed bottom to top."""
    return half + [(-x, z) for x, z in reversed(half)]


def crumple(center, radius, seed):
    """A crumpled sheet of paper: a lumpy, faceted ball."""
    rng = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=radius)
    for v in bm.verts:
        v.co = v.co * rng.uniform(0.78, 1.08) + Vector(center)
    index = {v: i for i, v in enumerate(bm.verts)}
    out = [tuple(v.co) for v in bm.verts], [tuple(index[v] for v in f.verts) for f in bm.faces]
    bm.free()
    return out


def face_front(obj, mat):
    """Part.build guesses which side a lone face shows: turn the faces of material mat toward -Y."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    index = obj.data.materials.find(mat)
    bmesh.ops.reverse_faces(bm, faces=[f for f in bm.faces if f.material_index == index and f.normal.y > 0])
    bm.to_mesh(obj.data)
    bm.free()
    return obj


def desk(coll):
    """A writing desk: a walnut top on a slim metal frame, a felt mat where the notebook goes."""
    W, D, T = 1.7, 0.78, 0.045
    p = Part()
    add_box(p, (W, D, T), (0, 0, DESK_TOP - T / 2), "DeskTop", 0.01)
    leg = DESK_TOP - T
    for sx in (-1, 1):
        x = sx * (W / 2 - 0.08)
        for sy in (-1, 1):
            add_box(p, (0.045, 0.045, leg), (x, sy * (D / 2 - 0.07), leg / 2), "LampMetal", 0.006)
        add_box(p, (0.035, D - 0.14, 0.035), (x, 0, 0.1), "LampMetal", 0.005)  # foot rail
    add_box(p, (W - 0.16, 0.03, 0.06), (0, D / 2 - 0.07, leg - 0.03), "LampMetal", 0.005)  # back rail
    add_box(p, (0.95, 0.46, 0.006), (-0.1, -0.06, DESK_TOP + 0.003), "DeskMat", 0.003, seg=2)
    return p.build("Desk", coll)


def notebook(coll):
    """A laptop open a little past upright. Its child NotebookScreen is the display, 16:10: one face mapped
    to the full 0-1 UV square, u left to right and v up seen from the front, for the web to draw on."""
    W, D, H, LID = 0.48, 0.33, 0.02, 0.31
    p = Part()
    add_box(p, (W, D, H), (0, 0, H / 2), "LaptopBody", 0.006)
    pitch, key = 0.036, 0.03
    cols = 11
    x0 = -(cols * pitch - (pitch - key)) / 2 + key / 2
    for row in range(5):
        y = -0.035 + row * pitch + key / 2
        if row == 0:  # the bottom row: three keys, the space bar, three keys
            spans = [(0, 1), (1, 2), (2, 3), (3, 8), (8, 9), (9, 10), (10, 11)]
        else:
            spans = [(c, c + 1) for c in range(cols)]
        for a, b in spans:
            width = (b - a) * pitch - (pitch - key)
            add_box(p, (width, key, 0.004), (x0 - key / 2 + a * pitch + width / 2, y, H + 0.0005), "LaptopKey", 0.0012, seg=1)
    add_box(p, (0.15, 0.09, 0.002), (0, -0.11, H), "LaptopTrackpad", 0.004, seg=1)
    hinge = Vector((0, D / 2 - 0.008, H))
    lid = Matrix.Translation(hinge) @ Matrix.Rotation(math.radians(-14), 4, "X")
    add_box(p, (W, 0.012, LID), (0, 0.006, LID / 2), "LaptopBody", 0.005, m=lid)
    add_box(p, (W - 0.006, 0.002, LID - 0.006), (0, -0.0005, LID / 2), "LaptopBezel", 0.002, m=lid, seg=1)
    add_box(p, (0.006, 0.001, 0.006), (0, -0.0018, LID - 0.009), "LaptopHinge", m=lid)  # the webcam
    p.add(*tube([(-W / 2 + 0.05, hinge.y, H), (W / 2 - 0.05, hinge.y, H)], 0.007, sides=12), "LaptopHinge")
    body = p.build("Notebook", coll)

    s = Part()
    x0, x1, z0, z1 = -W / 2 + 0.014, W / 2 - 0.014, 0.022, 0.022 + (W - 0.028) / 1.6
    corners = moved([(x0, -0.0018, z0), (x1, -0.0018, z0), (x1, -0.0018, z1), (x0, -0.0018, z1)], lid)
    s.add(corners, [(0, 1, 2, 3)], "NotebookScreen", uvs=[[(0, 0), (1, 0), (1, 1), (0, 1)]])
    screen = face_front(s.build("NotebookScreen", coll, uv=True), "NotebookScreen")
    screen.parent = body
    return body


def tv(coll):
    """A slim wall TV, 2.2 m across, on a bracket. Its child TvScreen is the display, 16:9: one face mapped
    to the full 0-1 UV square, u left to right and v up seen from the front, for the web to draw on."""
    W, D = 2.2, 0.035
    H = W * 9 / 16
    p = Part()
    add_box(p, (W, D, H), (0, -D / 2, 0), "LaptopBezel", 0.012)
    add_box(p, (0.3, 0.03, 0.18), (0, 0.0, 0), "LampMetal", 0.01)  # the wall bracket behind it
    body = p.build("Tv", coll)
    s = Part()
    x, z, y = W / 2 - 0.025, H / 2 - 0.025, -D - 0.001
    s.add([(-x, y, -z), (x, y, -z), (x, y, z), (-x, y, z)], [(0, 1, 2, 3)], "TvScreen", uvs=[[(0, 0), (1, 0), (1, 1), (0, 1)]])
    screen = face_front(s.build("TvScreen", coll, uv=True), "TvScreen")
    screen.parent = body
    return body


def chair_gamer(coll):
    """A racing-style gamer chair: a bucket seat and a winged back with belt slots, racing stripes, neck
    and lumbar pillows, T arms on a five-star base with casters. Black, its bolsters in violet."""
    p = Part()
    for i in range(5):
        a = math.radians(90 + 72 * i)
        tip = Vector((0.36 * math.cos(a), 0.36 * math.sin(a), 0.075))
        p.add(*tube([(0, 0, 0.11), tuple(tip)], [0.032, 0.022], sides=10), "ChairBase")
        add_box(p, (0.024, 0.024, 0.04), (tip.x, tip.y, 0.06), "ChairBase", 0.006, seg=1)
        wheel = Matrix.Translation((tip.x, tip.y, 0.035)) @ Matrix.Rotation(a, 4, "Z") @ Matrix.Rotation(math.radians(90), 4, "X")
        add_lathe(p, [(0.0, -0.016), (0.03, -0.016), (0.035, -0.008), (0.035, 0.008), (0.03, 0.016), (0.0, 0.016)], "ChairBase", wheel, seg=20)
    add_lathe(p, [(0.0, 0.08), (0.07, 0.08), (0.075, 0.12), (0.05, 0.16), (0.0, 0.16)], "ChairBase", seg=24)
    add_lathe(p, [(0.0, 0.15), (0.032, 0.15), (0.032, 0.33), (0.023, 0.34), (0.023, 0.52), (0.0, 0.52)], "ChairMetal", seg=20)
    add_box(p, (0.3, 0.32, 0.05), (0, 0, 0.53), "ChairBase", 0.012)
    p.add(*tube([(0.14, -0.05, 0.53), (0.24, -0.12, 0.5)], 0.008, sides=8), "ChairBase")  # height lever
    # bucket seat
    add_box(p, (0.62, 0.62, 0.11), (0, 0, 0.61), "ChairLeather", 0.045)
    for sx in (-1, 1):
        tilt = Matrix.Translation((sx * 0.28, 0, 0.65)) @ Matrix.Rotation(math.radians(-8 * sx), 4, "Y")
        add_box(p, (0.12, 0.62, 0.13), (0, 0, 0), "ChairAccent", 0.055, m=tilt)
    # winged back, reclined a little
    back = Matrix.Translation((0, 0.37, 0.62)) @ Matrix.Rotation(math.radians(-11), 4, "X")
    shell = [(0.26, 0.0), (0.286, 0.18), (0.26, 0.44), (0.35, 0.78), (0.35, 0.88), (0.22, 0.975), (0.208, 1.145), (0.156, 1.21)]
    p.add(*upright(mirrored(shell), 0.13, 0.035, back), "ChairAccent")
    panel = [(0.17, 0.04), (0.18, 0.44), (0.247, 0.78), (0.247, 0.86), (0.156, 0.94), (0.143, 1.12), (0.104, 1.16)]
    p.add(*upright(mirrored(panel), 0.17, 0.015, back), "ChairLeather")
    for sx in (-1, 1):
        add_box(p, (0.09, 0.08, 0.65), (sx * 0.28, -0.15, 0.39), "ChairAccent", 0.04, m=back)  # back bolsters
        add_box(p, (0.035, 0.006, 0.075), (sx * 0.1, -0.172, 0.99), "ChairSlot", 0.012, m=back, seg=2)  # belt slots
        add_box(p, (0.014, 0.004, 0.6), (sx * 0.075, -0.171, 0.44), "ChairAccent", 0.002, m=back, seg=1)  # stripes
    add_box(p, (0.28, 0.08, 0.12), (0, -0.2, 0.86), "ChairLeather", 0.05, m=back)  # neck pillow
    add_box(p, (0.34, 0.09, 0.17), (0, -0.2, 0.22), "ChairLeather", 0.06, m=back)  # lumbar pillow
    # T arms
    for sx in (-1, 1):
        add_box(p, (0.14, 0.05, 0.035), (sx * 0.31, 0.02, 0.55), "ChairBase", 0.008)
        add_box(p, (0.045, 0.06, 0.27), (sx * 0.38, 0.02, 0.69), "ChairBase", 0.01)
        add_box(p, (0.1, 0.34, 0.045), (sx * 0.38, -0.01, 0.84), "ChairBase", 0.018)
    return p.build("ChairGamer", coll)


def sofa(coll):
    """A two-seat sofa: deep violet cushions, an amber pillow and a cream knitted one."""
    p = Part()
    add_box(p, (2.34, 1.07, 0.31), (0, 0, 0.26), "SofaFabric", 0.06)
    add_box(p, (2.1, 0.2, 0.56), (0, 0.44, 0.62), "SofaFabric", 0.07)  # back frame
    for sx in (-1, 1):
        add_box(p, (0.99, 0.94, 0.21), (sx * 0.507, -0.05, 0.505), "SofaCushion", 0.08)
        lean = Matrix.Translation((sx * 0.507, 0.33, 0.88)) @ Matrix.Rotation(math.radians(-10), 4, "X")
        add_box(p, (0.96, 0.26, 0.6), (0, 0, 0), "SofaCushion", 0.11, m=lean)
        add_box(p, (0.21, 1.07, 0.62), (sx * 1.235, 0, 0.55), "SofaFabric", 0.09)
        for sy in (-1, 1):
            add_lathe(p, [(0.0, 0.0), (0.022, 0.0), (0.03, 0.105), (0.0, 0.105)], "SofaLeg", Matrix.Translation((sx * 1.08, sy * 0.42, 0)), seg=16)
    pillow = Matrix.Translation((-0.72, 0.12, 0.8)) @ Matrix.Rotation(math.radians(14), 4, "Z") @ Matrix.Rotation(math.radians(-14), 4, "X")
    add_box(p, (0.44, 0.15, 0.42), (0, 0, 0), "SofaPillow", 0.12, m=pillow)
    # a cream knitted pillow on the right, its ribs running down
    knit = Matrix.Translation((0.78, 0.13, 0.79)) @ Matrix.Rotation(math.radians(-10), 4, "Z") @ Matrix.Rotation(math.radians(-12), 4, "X")
    add_box(p, (0.4, 0.14, 0.38), (0, 0, 0), "Blanket", 0.11, m=knit)
    for k in range(5):
        add_box(p, (0.03, 0.15, 0.3), (-0.12 + k * 0.06, -0.004, 0), "Blanket", 0.014, m=knit, seg=2)
    return p.build("Sofa", coll)


SIDE_TABLE = (0.45, 0.55)  # top radius, height


def side_table(coll):
    """A round wooden side table on three splayed legs, for beside the sofa. A low board stands across
    the back of its top: the web stands two books on the table facing out, their backs against it."""
    R, H = SIDE_TABLE
    T = 0.035
    p = Part()
    add_lathe(p, [(0.0, H - T), (R - 0.012, H - T), (R, H - T + 0.012), (R, H - 0.008), (R - 0.008, H), (0.0, H)], "TableWood", seg=64)
    for a in (90, 210, 330):  # one leg behind, two in front
        c, s_ = math.cos(math.radians(a)), math.sin(math.radians(a))
        p.add(*tube([(0.18 * c, 0.18 * s_, H - T + 0.005), (0.34 * c, 0.34 * s_, 0.0)], [0.03, 0.018], sides=12), "TableWood")
    add_box(p, (0.8, 0.018, 0.16), (0, 0.06, H + 0.08), "TableWood", 0.004)
    return p.build("SideTable", coll)


def paper_bin(coll):
    """An office wire bin. The crumpled sheets in it are PaperBall props of their own, for the web to toss."""
    H, R0, R1 = 0.4, 0.14, 0.18
    p = Part()
    add_lathe(p, [(0.0, 0.0), (R0, 0.0), (R0, 0.006), (0.0, 0.006)], "BinMetal", seg=32)
    for i in range(28):
        a = 2 * math.pi * i / 28
        p.add(*tube([(R0 * math.cos(a), R0 * math.sin(a), 0.004), (R1 * math.cos(a), R1 * math.sin(a), H)], 0.0025, sides=5), "BinMetal")
    for z, r in ((0.008, 0.004), (H * 0.36, 0.003), (H * 0.7, 0.003), (H, 0.008)):
        rr = R0 + (R1 - R0) * z / H
        p.add(*tube([(rr * math.cos(a), rr * math.sin(a), z) for a in (2 * math.pi * i / 48 for i in range(48))], r, sides=6, closed=True), "BinMetal")
    return p.build("PaperBin", coll)


# The crumpled sheets: three sizes, each its own crumple (name: radius, seed), their origin at the bottom.
PAPER_BALLS = {"PaperBall": (0.06, 3), "PaperBallSmall": (0.048, 5), "PaperBallLarge": (0.072, 1)}


def paper_ball(coll, name):
    """A crumpled sheet of paper, a toy for the cat."""
    r, seed = PAPER_BALLS[name]
    p = Part()
    p.add(*crumple((0, 0, r * 0.85), r, seed), "Paper")
    return p.build(name, coll)


def trophy(coll):
    """A gold cup on a black base, a blank plate on its front."""
    p = Part()
    add_box(p, (0.11, 0.11, 0.055), (0, 0, 0.0275), "TrophyBase", 0.006)
    add_box(p, (0.07, 0.003, 0.028), (0, -0.0555, 0.0275), "TrophyPlate", 0.001, seg=1)
    cup = [(0.0, 0.055), (0.03, 0.055), (0.03, 0.064), (0.009, 0.076), (0.009, 0.12), (0.017, 0.134), (0.04, 0.155),
           (0.053, 0.188), (0.059, 0.235), (0.056, 0.239), (0.051, 0.235), (0.0, 0.215)]
    add_lathe(p, cup, "LampAccent")
    for sx in (-1, 1):
        loop = spline([(sx * 0.052, 0, 0.222), (sx * 0.085, 0, 0.215), (sx * 0.084, 0, 0.18), (sx * 0.05, 0, 0.165)], 14)
        p.add(*tube(loop, 0.005, sides=8), "LampAccent")
    return p.build("Trophy", coll)


def grad_cap(coll):
    """A graduation cap, its tassel hanging over a corner of the board."""
    p = Part()
    add_lathe(p, [(0.0, 0.0), (0.098, 0.0), (0.1, 0.07), (0.0, 0.075)], "CapCloth")
    board = Matrix.Rotation(math.radians(45), 4, "Z")
    add_box(p, (0.27, 0.27, 0.012), (0, 0, 0.08), "CapCloth", 0.002, m=board, seg=1)
    add_lathe(p, [(0.0, 0.086), (0.011, 0.086), (0.011, 0.092), (0.0, 0.094)], "Tassel", seg=16)
    corner = 0.27 / math.sqrt(2) - 0.008
    cord = spline([(0, 0, 0.09), (corner * 0.6, -0.004, 0.0895), (corner, 0, 0.088), (corner + 0.012, 0, 0.06), (corner + 0.014, 0, 0.035)], 16)
    p.add(*tube(cord, 0.0028, sides=6), "Tassel")
    add_lathe(p, [(0.0, 0.035), (0.005, 0.035), (0.011, 0.012), (0.012, 0.004), (0.0, 0.004)], "Tassel", Matrix.Translation((corner + 0.014, 0, 0)), seg=16)
    return p.build("GradCap", coll)


def pencil_cup(coll):
    """A violet ceramic cup, empty: its pencils are props of their own, for the web to spill."""
    p = Part()
    add_lathe(p, [(0.0, 0.0), (0.05, 0.0), (0.053, 0.13), (0.047, 0.13), (0.045, 0.008), (0.0, 0.008)], "PotCeramic", seg=32)
    return p.build("PencilCup", coll)


# The pencils (name: length of the painted body, its color), upright, their origin at the bottom.
PENCILS = {"PencilAmber": (0.2, "PencilAmber"), "PencilViolet": (0.18, "PencilViolet")}


def pencil(coll, name):
    """A hexagonal pencil, sharpened to a graphite point."""
    length, mat = PENCILS[name]
    p = Part()
    for z0, z1, r0, r1, part_mat in ((0, length, 0.0065, 0.0065, mat), (length, length + 0.02, 0.0065, 0.0022, "PencilWood"),
                                     (length + 0.02, length + 0.026, 0.0022, 0.0003, "Graphite")):
        p.add(*tube([(0, 0, z0), (0, 0, z1)], [r0, r1], sides=6), part_mat)
    return p.build(name, coll)


def mug(coll):
    """A coffee mug with a violet band, full. Its child MugSteam is three rising ribbons: UVs with v up
    the ribbon, "_sway" 0 at the coffee to 1 at the tip, for the web's steam shader."""
    p = Part()
    outer = [(0.0, 0.0), (0.045, 0.0), (0.048, 0.005), (0.0485, 0.055), (0.0487, 0.07), (0.049, 0.105),
             (0.044, 0.105), (0.043, 0.012), (0.0, 0.012)]
    add_lathe(p, outer, ["MugCeramic", "MugCeramic", "MugCeramic", "MugBand", "MugCeramic", "MugCeramic", "MugCeramic", "MugCeramic"], seg=40)
    add_lathe(p, [(0.0, 0.09), (0.0436, 0.09)], "Coffee", seg=40)
    handle = spline([(0.046, 0, 0.088), (0.074, 0, 0.083), (0.083, 0, 0.058), (0.073, 0, 0.032), (0.046, 0, 0.027)], 18)
    p.add(*tube(handle, 0.008, sides=10), "MugCeramic")
    body = p.build("Mug", coll)

    s = Part()
    rng = random.Random(7)
    for k in range(3):
        turn = Matrix.Rotation(math.radians(60 * k), 4, "Z")
        phase = rng.uniform(0, 6.28)
        spine = spline([(0.012 * math.sin(phase + 1.7 * j) + (k - 1) * 0.01, 0, 0.095 + 0.07 * j) for j in range(5)], 16)
        verts, uvs, faces = [], [], []
        for i, c in enumerate(spine):
            v = i / (len(spine) - 1)
            half = 0.02 * (1 - 0.6 * v)
            verts += [(c.x - half, c.y, c.z), (c.x + half, c.y, c.z)]
            uvs.append(v)
        for i in range(len(spine) - 1):
            faces.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
        face_uvs = [[(0, uvs[i]), (1, uvs[i]), (1, uvs[i + 1]), (0, uvs[i + 1])] for i in range(len(spine) - 1)]
        s.add(moved(verts, turn), faces, "Steam", uvs=face_uvs, sway=lambda q: min(1.0, max(0.0, (q.z - 0.095) / 0.28)))
    steam = s.build("MugSteam", coll, uv=True, sway=True)
    steam.parent = body
    return body


def frame(coll, name):
    """An oak frame with a thin cream mat. The picture is one face, material "FrameArt", mapped to the
    full 0-1 UV square, u left to right and v up, for the web to draw on."""
    W, H = FRAMES[name]
    B, DEPTH, MAT = 0.03, 0.035, 0.016
    p = Part()
    # The frame in one piece, a ring with its edges rounded, so its corners show no joins.
    ring = []
    for y in (-DEPTH, 0.0):
        for hx, hz in ((W / 2, H / 2), (W / 2 - B, H / 2 - B)):
            ring += [(-hx, y, -hz), (hx, y, -hz), (hx, y, hz), (-hx, y, hz)]
    quads = []
    for i in range(4):
        j = (i + 1) % 4
        quads += [(i, j, 4 + j, 4 + i), (8 + i, 12 + i, 12 + j, 8 + j), (i, 8 + i, 8 + j, j), (4 + i, 4 + j, 12 + j, 12 + i)]
    p.add(*soft(ring, quads, 0.006), "FrameWood")
    add_box(p, (W - 2 * B, 0.004, H - 2 * B), (0, -0.006, 0), "FrameMat")
    x, z = W / 2 - B - MAT, H / 2 - B - MAT
    p.add([(-x, -0.0085, -z), (x, -0.0085, -z), (x, -0.0085, z), (-x, -0.0085, z)], [(0, 1, 2, 3)], "FrameArt",
          uvs=[[(0, 0), (1, 0), (1, 1), (0, 1)]])
    return face_front(p.build(name, coll, uv=True), "FrameArt")


PLAQUE = (0.36, 0.15)  # width, height


def github_plaque(coll):
    """A small wooden plaque hanging on a string from a nail in the wall. Its front is one face, material
    "PlaqueArt", mapped to the full 0-1 UV square, u left to right and v up, for the web to draw the link
    to Arandu's code on. The origin is the middle of the board, its back on the wall at Y = 0."""
    W, H = PLAQUE
    D = 0.018
    p = Part()
    add_box(p, (W, D, H), (0, -D / 2, 0), "TableWood", 0.005)
    x, z = W / 2 - 0.012, H / 2 - 0.012
    p.add([(-x, -D - 0.0006, -z), (x, -D - 0.0006, -z), (x, -D - 0.0006, z), (-x, -D - 0.0006, z)], [(0, 1, 2, 3)], "PlaqueArt",
          uvs=[[(0, 0), (1, 0), (1, 1), (0, 1)]])
    nail = (0.0, -0.012, H / 2 + 0.085)
    for sx in (-1, 1):  # the string, from two eyes on the board's top to the nail
        p.add(*tube([(sx * W * 0.32, -D / 2, H / 2), nail], 0.0018, sides=6), "Twine")
    add_lathe(p, [(0.0, 0.0), (0.0025, 0.0), (0.0025, 0.016), (0.007, 0.016), (0.007, 0.019), (0.0, 0.019)], "NailMetal",
              Matrix.Translation((0, 0.0, H / 2 + 0.085)) @ Matrix.Rotation(math.radians(90), 4, "X"), seg=12)
    return face_front(p.build("GithubPlaque", coll, uv=True), "PlaqueArt")


MOTTO_SIGN = (0.74, 0.22, 0.09)  # width, height, string length


def motto_sign(coll):
    """A wooden sign hanging on two strings from the underside of a shelf, for the motto. Its front is
    one face, material "SignArt", mapped to the full 0-1 UV square, u left to right and v up, for the web
    to write on. The origin is where the strings meet the plank, at Z = 0: the sign hangs below it."""
    W, H, L = MOTTO_SIGN
    D = 0.016
    top = -L
    p = Part()
    add_box(p, (W, D, H), (0, 0, top - H / 2), "TableWood", 0.005)
    x, z0, z1, y = W / 2 - 0.012, top - H + 0.012, top - 0.012, -D / 2 - 0.0006
    p.add([(-x, y, z0), (x, y, z0), (x, y, z1), (-x, y, z1)], [(0, 1, 2, 3)], "SignArt", uvs=[[(0, 0), (1, 0), (1, 1), (0, 1)]])
    for sx in (-1, 1):  # the strings, from two eyes on the board's top straight up to two under the plank
        p.add(*tube([(sx * W * 0.4, 0, top), (sx * W * 0.4, 0, -0.004)], 0.0018, sides=6), "Twine")
        add_lathe(p, [(0.0, -0.006), (0.004, -0.006), (0.004, 0.0), (0.0, 0.0)], "NailMetal", Matrix.Translation((sx * W * 0.4, 0, 0)), seg=10)
    return face_front(p.build("MottoSign", coll, uv=True), "SignArt")


def neon_line(coll, text, size, spacing=1.0, tube_r=0.008):
    """One line of text bent in neon tube in the brand's face: its verts (left edge at X = 0, flat on
    Z = 0), faces and width. Small text needs `spacing` (between letters; words get more): the tube is as
    thick at any size, and would run its letters together; or a thinner `tube_r`, as thin for its size as the big sign's."""
    font = bpy.data.fonts.load(FONT, check_existing=True)
    cu = bpy.data.curves.new("NeonText", "FONT")
    cu.body, cu.font, cu.size = text, font, size
    cu.align_x, cu.align_y = "LEFT", "CENTER"
    cu.fill_mode, cu.bevel_depth, cu.bevel_resolution, cu.resolution_u = "NONE", tube_r, 1, 4
    cu.space_character, cu.space_word = spacing, spacing ** 2
    tmp = bpy.data.objects.new("NeonText", cu)
    coll.objects.link(tmp)
    bpy.context.view_layer.update()
    evaluated = tmp.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me = evaluated.to_mesh()
    verts, faces = [tuple(v.co) for v in me.vertices], [tuple(f.vertices) for f in me.polygons]
    evaluated.to_mesh_clear()
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    left = min(v[0] for v in verts)
    return [(x - left, y, z) for x, y, z in verts], faces, max(v[0] for v in verts) - left


def neon_panel(p, total, ph, inset, r):
    """The smoked acrylic panel a neon is bent on, held off the wall by four standoffs, and the coral
    tube framing it, `inset` in from its edge with corners of radius `r`. Centred on X = Z = 0."""
    add_box(p, (total, 0.012, ph), (0, -0.034, 0), "NeonBacking", 0.03, seg=4)
    hx, hz = total / 2 - inset, ph / 2 - inset
    border = []
    for cx, cz, a0 in ((hx - r, hz - r, 0), (-hx + r, hz - r, 90), (-hx + r, -hz + r, 180), (hx - r, -hz + r, 270)):
        border += [(cx + r * math.cos(math.radians(a0 + d)), -0.05, cz + r * math.sin(math.radians(a0 + d))) for d in range(0, 90, 10)]
    p.add(*tube(border, 0.007, sides=8, closed=True), "NeonBorder")
    for sx in (-1, 1):
        for sz in (-1, 1):
            at = Matrix.Translation((sx * (total / 2 - inset - 0.015), 0, sz * (ph / 2 - inset - 0.015))) @ Matrix.Rotation(math.radians(90), 4, "X")
            add_lathe(p, [(0.0, 0.0), (0.009, 0.0), (0.009, 0.042), (0.0, 0.042)], "LampMetal", at, seg=12)


def neon_sign(coll):
    """An open book drawn in tube and 'Abra' on the first line, 'um livro' on the second starting left of
    'Abra', bent in neon tube in the brand's face, on a smoked acrylic panel held off the wall, a coral tube
    framing it. The tubes are "NeonTube" and "NeonBorder", for the web to light."""
    (v1, f1, w1), (v2, f2, w2) = neon_line(coll, NEON_TEXT[0], 0.2), neon_line(coll, NEON_TEXT[1], 0.2)
    # The first line is the book, a gap and the first word; the second starts INDENT in, left of that word.
    # Everything is moved so the panel centres on X = 0.
    book_w, gap, pad, indent, lead = 0.17, 0.05, 0.09, 0.1, 0.115
    width = max(book_w + gap + w1, indent + w2)
    total = pad + width + pad
    x0 = -total / 2 + pad  # the content's left edge
    bx = x0 + book_w / 2  # the book's spine
    p = Part()
    up = Matrix.Rotation(math.radians(90), 4, "X")
    p.add(moved(v1, Matrix.Translation((x0 + book_w + gap, -0.05, lead)) @ up), f1, "NeonTube")
    p.add(moved(v2, Matrix.Translation((x0 + indent, -0.05, -lead)) @ up), f2, "NeonTube")
    for side in (-1, 1):
        page = [(0, -0.07), (0.04 * side, -0.055), (0.085 * side, -0.06), (0.085 * side, 0.06), (0.04 * side, 0.07), (0, 0.055)]
        p.add(*tube([(bx + c.x, -0.05, lead + c.y) for c in spline([(x, z, 0) for x, z in page], 24)], 0.008, sides=8), "NeonTube")
    p.add(*tube([(bx, -0.05, lead - 0.07), (bx, -0.05, lead + 0.055)], 0.008, sides=8), "NeonTube")
    neon_panel(p, total, 0.56, 0.035, 0.045)
    return p.build("NeonSign", coll)


def neon_app(coll):
    """The small sign that hangs under NeonSign: a phone drawn in tube and NEON_APP on one line, in the
    same tube, panel and coral frame, built small rather than scaled, so its tube is as thick as the big
    sign's. The web makes it open the ways into the app."""
    # A tube as thin for its letters as the big sign's (0.008 for 0.2), or they fill in and blur.
    v, f, w = neon_line(coll, NEON_APP, 0.12, 1.04, 0.0048)
    phone_w, phone_h, cr, gap, pad = 0.055, 0.09, 0.013, 0.035, 0.06
    total = pad + phone_w + gap + w + pad
    x0 = -total / 2 + pad
    p = Part()
    p.add(moved(v, Matrix.Translation((x0 + phone_w + gap, -0.05, -0.004)) @ Matrix.Rotation(math.radians(90), 4, "X")), f, "NeonTube")
    # The phone: a rounded outline, and its home bar near the bottom.
    cx, hx, hz = x0 + phone_w / 2, phone_w / 2, phone_h / 2
    outline = []
    for ox, oz, a0 in ((hx - cr, hz - cr, 0), (-hx + cr, hz - cr, 90), (-hx + cr, -hz + cr, 180), (hx - cr, -hz + cr, 270)):
        outline += [(cx + ox + cr * math.cos(math.radians(a0 + d)), -0.05, oz + cr * math.sin(math.radians(a0 + d))) for d in range(0, 91, 15)]
    p.add(*tube(outline, 0.0048, sides=8, closed=True), "NeonTube")
    p.add(*tube([(cx - 0.012, -0.05, -hz + 0.018), (cx + 0.012, -0.05, -hz + 0.018)], 0.004, sides=8), "NeonTube")
    neon_panel(p, total, 0.21, 0.025, 0.03)
    return p.build("NeonApp", coll)


# The fairy lights: name: length (m), scallops, bulbs. The short one spans the app's Quarto wall.
STRING_LIGHTS = {"StringLights": (3.7, 4, 18), "StringLightsShort": (2.6, 3, 13)}


def string_lights(coll, name="StringLights"):
    """Fairy lights strung along the wall in scallops, a warm bulb hanging every 0.2 m. Its
    <name>Light1 to 3 empties mark where the web may put a few point lights."""
    L, SCALLOPS, BULBS = STRING_LIGHTS[name]
    SAG = 0.12
    p = Part()
    wire = []
    for i in range(121):
        x = L * i / 120
        u = (x / (L / SCALLOPS)) % 1
        wire.append((x, -0.01, -SAG * 4 * u * (1 - u)))
    p.add(*tube(wire, 0.003, sides=5), "LampCord")
    for x in (L * i / SCALLOPS for i in range(SCALLOPS + 1)):
        add_box(p, (0.012, 0.02, 0.012), (x, 0.0, 0.004), "LampMetal", 0.003, seg=1)  # hooks
    for k in range(BULBS):
        x = L * (k + 0.5) / BULBS
        u = (x / (L / SCALLOPS)) % 1
        z = -SAG * 4 * u * (1 - u)
        at = Matrix.Translation((x, -0.012, z))
        add_lathe(p, [(0.0, 0.0), (0.008, 0.0), (0.009, -0.018), (0.0, -0.02)], "StringSocket", at, seg=12)
        add_lathe(p, [(0.0, -0.016), (0.011, -0.022), (0.017, -0.036), (0.016, -0.05), (0.009, -0.06), (0.0, -0.062)], "StringBulb", at, seg=16)
    obj = p.build(name, coll)
    for i, x in enumerate((L / 6, L / 2, 5 * L / 6)):
        light("%sLight%d" % (name, i + 1), obj, (x, -0.03, -0.1))
    return obj


def rug(coll):
    """An oval wool rug for under the sofa, 1.6 x 0.96 m: a violet field, an amber band, a darker rim
    that rounds down to the floor. Its origin at the middle of its underside."""
    T = 0.012
    p = Part()
    profile = [(0.0, T), (0.5, T), (0.56, T), (0.76, T), (0.795, T * 0.5), (0.8, 0.0)]
    add_lathe(p, profile, ["RugField", "RugBand", "RugWool", "RugWool", "RugWool"], Matrix.Diagonal((1, 0.6, 1, 1)), seg=96)
    return p.build("Rug", coll)


END_TABLE = (0.2, 0.52)  # top radius, height


def end_table(coll):
    """A small round table on one turned column and a round foot, for beside the sofa where the big
    side table does not fit; a mug stands on it."""
    R, H = END_TABLE
    T = 0.03
    p = Part()
    add_lathe(p, [(0.0, H - T), (R - 0.01, H - T), (R, H - T + 0.01), (R, H - 0.006), (R - 0.006, H), (0.0, H)], "TableWood", seg=48)
    add_lathe(p, [(0.0, 0.0), (0.15, 0.0), (0.155, 0.012), (0.14, 0.026), (0.03, 0.04), (0.022, 0.12), (0.03, 0.2),
                  (0.02, 0.3), (0.026, H - T - 0.04), (0.06, H - T), (0.0, H - T)], "TableWood", seg=32)
    return p.build("EndTable", coll)


def farol_santander(coll):
    """A souvenir of the Farol Santander (the old Banespa tower), São Paulo's Art Deco skyline mark:
    stepped volumes with vertical window bands and a spire, on a small black stand."""
    p = Part()
    add_box(p, (0.11, 0.09, 0.012), (0, 0, 0.006), "TrophyBase", 0.003, seg=1)
    steps = [(0.09, 0.07, 0.012, 0.142), (0.072, 0.058, 0.142, 0.182), (0.054, 0.046, 0.182, 0.302),
             (0.044, 0.038, 0.302, 0.327), (0.034, 0.03, 0.327, 0.347), (0.024, 0.022, 0.347, 0.364), (0.014, 0.014, 0.364, 0.374)]
    for w, d, z0, z1 in steps:
        add_box(p, (w, d, z1 - z0), (0, 0, (z0 + z1) / 2), "TowerStone")
        if z1 - z0 > 0.03:
            n = int(w / 0.012)
            for i in range(n):
                x = -w / 2 + (i + 0.5) * w / n
                add_box(p, (0.004, 0.001, z1 - z0 - 0.014), (x, -d / 2 - 0.0004, (z0 + z1) / 2), "TowerWindow")
            n = int(d / 0.012)
            for i in range(n):
                y = -d / 2 + (i + 0.5) * d / n
                add_box(p, (0.001, 0.004, z1 - z0 - 0.014), (w / 2 + 0.0004, y, (z0 + z1) / 2), "TowerWindow")
    add_lathe(p, [(0.0, 0.374), (0.004, 0.374), (0.0015, 0.42), (0.0, 0.425)], "LampAccent", seg=12)
    return p.build("FarolSantander", coll)


# ---------------------------------------------------------------- assembly

LAYOUT = {  # where each prop stands in the Blender scene; the export puts every one at the origin
    **{name: (-2.35 + 0.15 * i, 0, 0) for i, name in enumerate(BOOKS)},
    "BookOpen": (-3.0, 0, 0),
    "Ball": (-1.2, 0, 0),
    "YarnBall": (-0.9, 0, 0),
    "Paw": (-1.5, 0, 0),
    "Fish": (-1.75, 0, 0),
    "Mouse": (-1.62, -0.45, 0),
    "PlantPot": (-0.45, 0, 0.6),
    "LampMushroom": (0.0, 0, 0),
    "LampClassic": (0.45, 0, 0),
    "LampDesk": (0.9, 0, 0),
    "LampPendant": (1.45, 0, 0.9),
    "ShelfLarge": (-0.45, 0.05, 0.6),
    "ShelfMedium": (-0.45, 0.05, 1.15),
    "ShelfSmall": (-0.45, 0.05, 1.6),
    # the furniture, a row behind
    "Desk": (-3.2, 3.0, 0),
    "Notebook": (-3.2, 3.0, DESK_MAT),
    "ChairGamer": (-4.6, 3.0, 0),
    "Sofa": (-0.4, 3.0, 0),
    "SideTable": (1.6, 1.5, 0),  # in the open, between the rows
    "PaperBin": (2.6, 3.0, 0),
    "PaperBall": (2.95, 3.0, 0),
    "PaperBallSmall": (3.15, 3.0, 0),
    "PaperBallLarge": (3.4, 3.0, 0),
    "PencilAmber": (-2.45, 3.0, DESK_TOP),
    "PencilViolet": (-2.38, 3.0, DESK_TOP),
    "Trophy": (-3.75, 3.0, DESK_TOP),
    "GradCap": (-3.6, 3.15, DESK_TOP),
    "PencilCup": (-2.6, 3.0, DESK_TOP),
    "Mug": (-2.75, 2.85, DESK_TOP),
    "FrameTall": (3.4, 3.0, 1.2),
    "FrameSquare": (3.85, 3.0, 1.2),
    "NeonSign": (-0.4, 3.0, 2.2),
    "NeonApp": (-0.4, 3.0, 1.75),
    "StringLights": (-2.2, 3.0, 2.8),
    "StringLightsShort": (-2.2, 3.0, 3.2),
    "Rug": (1.6, -1.5, 0),
    "EndTable": (2.6, 1.5, 0),
    "FarolSantander": (4.3, 3.0, 0),
    "Tv": (-1.5, 4.5, 1.6),
    "GithubPlaque": (4.6, 1.5, 1.2),
    "MottoSign": (5.4, 1.5, 1.6),
}


def reset_collection():
    coll = bpy.data.collections.get(COLL)
    if coll:
        meshes = {o.data for o in coll.objects if isinstance(o.data, bpy.types.Mesh)}
        for o in list(coll.objects):
            bpy.data.objects.remove(o)
        # The glTF exporter can leave a user on a mesh: remove the old meshes whatever their count,
        # or the new ones come out named "Book.001".
        for me in meshes:
            if not any(o.data == me for o in bpy.data.objects):
                bpy.data.meshes.remove(me, do_unlink=True)
    else:
        coll = bpy.data.collections.new(COLL)
        bpy.context.scene.collection.children.link(coll)
    return coll


def build():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    coll = reset_collection()
    props = [book(coll, name) for name in BOOKS] + [book_open(coll)]
    props += [shelf(coll, name) for name in SHELVES]
    props += [f(coll) for f in (plant_pot, lamp_pendant, lamp_mushroom, lamp_classic, lamp_desk, yarn_ball, ball, paw, fish, mouse)]
    props += [f(coll) for f in (desk, notebook, chair_gamer, sofa, paper_bin, trophy, grad_cap,
                                pencil_cup, mug, neon_sign, neon_app, farol_santander, tv, side_table, rug, end_table)]
    props += [string_lights(coll, name) for name in STRING_LIGHTS]
    props += [paper_ball(coll, name) for name in PAPER_BALLS] + [pencil(coll, name) for name in PENCILS]
    props += [frame(coll, name) for name in FRAMES] + [github_plaque(coll), motto_sign(coll)]
    for obj in props:
        obj.location = LAYOUT[obj.name]
    tris = sum(sum(len(f.vertices) - 2 for f in o.data.polygons) for o in coll.objects if o.type == "MESH")
    print("Props: %d objects, %d triangles" % (len(coll.objects), tris))
    return props


if __name__ == "__main__":
    build()
