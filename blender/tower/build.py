"""Build the cat tower in the open Blender scene: the path Arandu climbs down through a book.

Run it inside Blender, for example through the Blender MCP:
    import runpy; runpy.run_path("<repo>/blender/tower/build.py", run_name="__main__")

The script builds three things, each in its own collection, rebuilt on every run.

"TowerTrees": four whole plush cat trees, each modelled on a real one. They are the look the tower is held to:
- BasketTree: a low step, a tall post with a basket, a box with a ramp, a bowl and a bed on top.
- TallTree: three floors of boards on posts, a box on each, a platform out to each side and three beds.
- BarrelTree: two barrels, a ladder, a hammock under a board, a tunnel under another and a bed.
- GrandTree: four posts through three boards, three boxes, steps, two big baskets and two beds.

"TowerKit": the trees' pieces as modules that share one bay, for the web to stack. A bay is one floor of
the tower: a square board, three posts up to the next board, a house at the back of the floor, a spot
out to each side and one out to the front. Every module is built in the bay's own space (the floor's
top at Z = 0, the front toward -Y, the next floor BAY above) with its origin at the bay's origin, so a
module is placed with its bay's transform and nothing else. A side module is built for the left post:
mirror it on X for the right one. A module Arandu can sit on carries two empties: "<name>Seat" where he
sits, and "<name>Sign" where its sign goes. A house takes a SignBoard on its roof, and any other spot a
SignTag hung under its edge, which the web turns to face the camera. A sign's face has the material
TowerSign and UVs that fill the whole texture, for the web to write on.

Colours are the design tokens. Arandu is black, so every place he sits is cream (TowerSeat), houses are
a lighter violet than the frame, and amber marks the special lesson. Plush and rope get a tiling normal
map each, made here and packed into the file, over box-projected UVs in metres.

"TowerPreview": a sample book's tower, stacked from the kit by build_tower() the way the web will.
plan() says what each bay holds, bays turn a quarter each so Arandu goes down in a spiral, and a seed
picks each bay's variants. Two bays of bare posts run on under the last floor: the tower shows no foot.

Units are metres and Z is up. Everything shares the props' scale (Arandu sits about 0.5 tall) and
reuses blender/props/build.py's mesh helpers and palette.
"""

import math
import os
import random
import runpy

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
_props = runpy.run_path(os.path.join(HERE, "..", "props", "build.py"))
Part, srgb, tube, arc, prism, moved = (_props[k] for k in ("Part", "srgb", "tube", "arc", "prism", "moved"))
add_box, add_lathe = _props["add_box"], _props["add_lathe"]

_props["MATERIALS"].update({
    "TowerPlush": (srgb("#573383"), 1.0, 0.0),  # violet-700: the frame, lighter than the sofa to read on the dark page
    "TowerHouse": (srgb("#8456BC"), 1.0, 0.0),  # violet-500: a chapter's house is the landmark
    "TowerSeat": (srgb("#F1EBDD"), 1.0, 0.0),  # cream-100: where Arandu sits. He is black, so his seats are light
    "TowerSisal": (srgb("#DDD3C0"), 1.0, 0.0),  # cream-300 rope
    "TowerInside": (srgb("#09090D"), 0.9, 0.0),  # ink-950, the dark inside a house
    "TowerHammock": (srgb("#D99A32"), 1.0, 0.0),  # amber-500: the special lesson's hammock stands out
    "PompomFur": (srgb("#E0A845"), 1.0, 0.0),  # amber-400
    "TowerSign": (srgb("#FBF8F1"), 0.8, 0.0),  # cream-50, a sign's face
    "TowerSignRim": (srgb("#2E1B46"), 0.9, 0.0),  # violet-900
    "TowerSignInk": (srgb("#09090D"), 0.9, 0.0),  # ink-950, the preview's sample labels only
})

TREES, KIT, PREVIEW = "TowerTrees", "TowerKit", "TowerPreview"
R = 0.05  # a post's radius under its rope
BOARD = 0.06  # a plush board's thickness
BASE = 0.05  # a base board's thickness
LAY = Matrix.Rotation(math.radians(90), 4, "X")  # lays a lathe's axis along Y, and stands an outline up


def cylinder(part, at, z0, z1, r, mat="TowerPlush"):
    """An upright cylinder with soft ends."""
    k = min(0.012, (z1 - z0) / 3, r / 2)
    add_lathe(part, [(0.0, z0), (r - k, z0), (r, z0 + k), (r, z1 - k), (r - k, z1), (0.0, z1)], mat,
              Matrix.Translation((at[0], at[1], 0)), seg=20)


def post(part, at, z0, z1, rope=True, cap=0.07):
    """A post from z0 to z1: plush, with a stretch of sisal rope between its plush ends, each cap long.
    A post too short for rope is all plush."""
    if not rope or z1 - z0 < 2 * cap + 0.08:
        return cylinder(part, at, z0, z1, R + 0.008)
    a, b = z0 + cap, z1 - cap
    cylinder(part, at, z0, a, R + 0.008)
    cylinder(part, at, b, z1, R + 0.008)
    cylinder(part, at, a - 0.01, b + 0.01, R, "TowerSisal")  # the rope's coils are its texture; it tucks into the plush


def board(part, size, top, pad=False):
    """A plush board, with a lighter pad on it when pad. top: the centre of its top face."""
    add_box(part, (size[0], size[1], BOARD), (top[0], top[1], top[2] - BOARD / 2), "TowerPlush", 0.022)
    if pad:
        add_box(part, (size[0] - 0.06, size[1] - 0.06, 0.03), (top[0], top[1], top[2] - 0.005), "TowerSeat", 0.012)


def basket(part, rim, r, depth, posts):
    """A round plush basket, hung by its rim from a collar on each post. rim: the centre of its rim."""
    x, y, z = rim
    prof = [(0.0, -depth), (r * 0.55, -depth), (r * 0.88, -depth * 0.6), (r + 0.01, -0.05), (r + 0.03, -0.005), (r + 0.02, 0.03),
            (r - 0.012, 0.04), (r - 0.04, 0.015), (r - 0.05, -0.04), (r * 0.8, -depth * 0.6 + 0.02), (r * 0.5, -depth + 0.045),
            (0.0, -depth + 0.05)]
    add_lathe(part, prof, ["TowerPlush"] * 7 + ["TowerSeat"] * 4, Matrix.Translation(rim), seg=40)
    for px, py in posts:
        to_post = Vector((px - x, py - y, 0)).normalized()
        part.add(*tube([Vector(rim) + to_post * (r - 0.01), (px, py, z)], 0.04, sides=12), "TowerPlush")
        cylinder(part, (px, py), z - 0.07, z + 0.06, R + 0.024)


def baked(obj):
    """Apply obj's modifiers, then put the weighted normals back on top."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    old, obj.data = obj.data, me
    obj.modifiers.clear()
    bpy.data.meshes.remove(old)
    obj.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL").keep_sharp = True
    return obj


def carved(coll, name, outer, cutters, inside):
    """outer minus every cutter (Parts), as one object. A face whose centre inside() accepts turns dark."""
    obj = outer.build(name, coll)
    tools = []
    for i, c in enumerate(cutters):
        tool = c.build("%sCut%d" % (name, i), coll)
        mod = obj.modifiers.new("Cut%d" % i, "BOOLEAN")
        mod.operation, mod.solver, mod.object = "DIFFERENCE", "EXACT", tool
        tools.append(tool)
    obj.modifiers.move(obj.modifiers.find("WeightedNormal"), len(obj.modifiers) - 1)
    baked(obj)
    for tool in tools:
        me = tool.data
        bpy.data.objects.remove(tool)
        bpy.data.meshes.remove(me)
    obj.data.materials.append(_props["material"]("TowerInside"))
    dark = len(obj.data.materials) - 1
    for f in obj.data.polygons:
        if inside(f.center):
            f.material_index = dark
    return obj


def box(coll, name, lo, hi, doors, wall=0.04):
    """A plush box, dark inside, with arched doors. lo, hi: its corners. doors: (face, offset) pairs: the face is
    "front", "left" or "right", and the offset moves the door along that face from its middle."""
    size = [h - l for l, h in zip(lo, hi)]
    mid = [(l + h) / 2 for l, h in zip(lo, hi)]
    outer, hollow = Part(), Part()
    add_box(outer, size, mid, "TowerHouse", 0.04)
    add_box(hollow, [s - 2 * wall for s in size], mid, "TowerInside", 0.02)
    w, h = 0.24, 0.31
    arch = prism([(-w / 2, 0.0), (w / 2, 0.0)] + arc(w / 2, 0.0, h - w / 2, 0.0, math.pi, 16), 0.0, 0.2)
    cutters = [hollow]
    for face, off in doors:  # each arch goes through its wall, from 0.1 outside to 0.1 inside
        if face == "front":
            m = Matrix.Translation((mid[0] + off, lo[1] + 0.1, lo[2] + wall)) @ LAY
        else:
            turn, x = (-90, lo[0] + 0.1) if face == "left" else (90, hi[0] - 0.1)
            m = Matrix.Translation((x, mid[1] + off, lo[2] + wall)) @ Matrix.Rotation(math.radians(turn), 4, "Z") @ LAY
        door = Part()
        door.add(moved(arch[0], m), arch[1], "TowerInside")
        cutters.append(door)
    k = wall - 0.006  # the hollow's own faces only: a door's reveal lies shallower in the wall and stays plush
    return carved(coll, name, outer, cutters, lambda c: all(lo[a] + k < c[a] < hi[a] - k for a in range(3)))


def barrel(coll, name, floor, r, h, wall=0.04):
    """A round plush barrel, dark inside, with a round door in its front and a darker lid. floor: its floor's centre."""
    x, y, z = floor
    m = Matrix.Translation(floor)
    outer, hollow, door = Part(), Part(), Part()
    add_lathe(outer, [(0.0, 0.0), (r - 0.03, 0.0), (r, 0.03), (r, h - 0.03), (r - 0.03, h), (0.0, h)],
              ["TowerHouse"] * 4 + ["TowerPlush"], m, seg=48)
    add_lathe(hollow, [(0.0, wall), (r - wall, wall), (r - wall, h - wall), (0.0, h - wall)], "TowerInside", m, seg=48)
    add_lathe(door, [(0.0, -0.1), (0.115, -0.1), (0.115, 0.1), (0.0, 0.1)], "TowerInside",
              Matrix.Translation((x, y - r, z + h / 2)) @ LAY, seg=32)
    k = wall - 0.006  # as in box(): the hollow's own faces only
    return carved(coll, name, outer, [hollow, door],
                  lambda c: math.hypot(c[0] - x, c[1] - y) < r - k and z + k < c[2] < z + h - k)


def tunnel(part, at, r, length, wall=0.045):
    """A plush tube lying front to back, darker inside. at: its centre."""
    h, k = length / 2, 0.014
    prof = [(r, -h + k), (r, h - k), (r - k, h), (r - wall + k, h), (r - wall, h - k), (r - wall, -h + k), (r - wall + k, -h),
            (r - k, -h)]
    add_lathe(part, prof, ["TowerHouse"] * 4 + ["TowerPlush"] + ["TowerHouse"] * 3, Matrix.Translation(at) @ LAY,
              seg=40, closed=True)


def hammock(part, a, b, half_d, sag, ties, mat="TowerPlush"):
    """A plush sling between its two ends a and b. Each end hangs by two cords from its point in ties."""
    nx, ny, thick = 16, 6, 0.014
    a, b = Vector(a), Vector(b)
    top = []
    for i in range(nx + 1):
        u = 2 * i / nx - 1
        p = a.lerp(b, i / nx)
        for j in range(ny + 1):
            v = 2 * j / ny - 1
            top.append((p.x, p.y + v * half_d, p.z - (sag - 0.03 * v * v) * (1 - u * u)))
    n = len(top)
    faces = []
    for i in range(nx):
        for j in range(ny):
            q = i * (ny + 1) + j
            faces.append((q, q + ny + 1, q + ny + 2, q + 1))
            faces.append((n + q, n + q + 1, n + q + ny + 2, n + q + ny + 1))
    part.add(top + [(x, y, z - thick) for x, y, z in top], faces, mat)
    edge = lambda i, j: Vector(top[i * (ny + 1) + j]) - Vector((0, 0, thick / 2))
    for j in (0, ny):  # piping along the two long edges, which also closes the sheet
        part.add(*tube([edge(i, j) for i in range(nx + 1)], 0.014, sides=8), "TowerSeat")
    for i, tie in ((0, ties[0]), (nx, ties[1])):  # a bar at each end, and its two cords up to its tie
        part.add(*tube([edge(i, 0), edge(i, ny)], 0.018, sides=8), "TowerSeat")
        for j in (0, ny):
            part.add(*tube([edge(i, j), tie], 0.006, sides=6), "TowerSisal")


def ramp(part, top, foot, width=0.24):
    """A plush board with a sisal face, from a door's sill down to the floor."""
    top, foot = Vector(top), Vector(foot)
    up = top - foot
    m = Matrix.Translation((top + foot) / 2) @ Matrix.Rotation(math.atan2(up.z, up.y), 4, "X")
    add_box(part, (width, up.length, 0.04), (0, 0, 0), "TowerPlush", 0.015, m)
    add_box(part, (width - 0.05, up.length - 0.07, 0.01), (0, 0, 0.022), "TowerSisal", 0.0, m)


def bed(part, size, top):
    """A bed: a board with a soft wall round it and a cushion inside. top: the centre of the board's top."""
    w, d = size
    x, y, z = top
    board(part, size, top)
    r, c = 0.055, 0.1
    hx, hy = w / 2 - r + 0.012, d / 2 - r + 0.012
    path = []
    for cx, cy, a0 in ((hx - c, hy - c, 0), (c - hx, hy - c, 90), (c - hx, c - hy, 180), (hx - c, c - hy, 270)):
        path += arc(c, x + cx, y + cy, math.radians(a0), math.radians(a0 + 90), 6)
    verts, faces = tube([(px, py, 0.0) for px, py in path], r, sides=12, closed=True)
    part.add([(vx, vy, z + 0.05 + vz * 1.4) for vx, vy, vz in verts], faces, "TowerPlush")  # a roll, taller than wide
    add_box(part, (w - 4 * r + 0.07, d - 4 * r + 0.07, 0.05), (x, y, z + 0.02), "TowerSeat", 0.02)


def pompom(part, hang, length=0.14, r=0.045):
    """A pompom on a string. hang: where the string is tied."""
    x, y, z = hang
    part.add(*tube([hang, (x, y, z - length)], 0.004, sides=6), "TowerSisal")
    rng = random.Random(7)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=r)
    for v in bm.verts:
        v.co = v.co * rng.uniform(0.93, 1.06) + Vector((x, y, z - length - r + 0.008))
    index = {v: i for i, v in enumerate(bm.verts)}
    part.add([tuple(v.co) for v in bm.verts], [tuple(index[v] for v in f.verts) for f in bm.faces], "PompomFur")
    bm.free()


def basket_tree(coll, name="BasketTree"):
    """A low step, a tall post with a basket hung from it, a box with a ramp, a bowl between two posts and a bed."""
    column, upper = (-0.27, 0.0), (0.22, 0.1)  # the tall post from the base to the bed, and the post on the box's roof
    step, basket_rim, bowl_rim, bed_top = 0.42, 0.78, 1.12, 1.52
    lo, hi = (-0.08, -0.21, 0.47), (0.46, 0.29, 0.89)  # the box

    frame = Part()  # the base, the low step and every post
    add_box(frame, (0.8, 0.58, BASE), (0, 0, BASE / 2), "TowerPlush", 0.02)
    board(frame, (0.44, 0.36), (-0.31, -0.1, step))
    for at in (column, (-0.15, -0.2)):
        post(frame, at, BASE, step - BOARD)
    for z0, z1 in ((step, basket_rim - 0.03), (basket_rim - 0.03, bowl_rim - 0.03), (bowl_rim - 0.03, bed_top - BOARD)):
        post(frame, column, z0, z1)
    for at in ((0.06, -0.08), (0.32, 0.16)):
        post(frame, at, BASE, lo[2])
    post(frame, upper, hi[2], bed_top - BOARD, rope=False)

    slope = Part()
    door_x = (lo[0] + hi[0]) / 2 + 0.1
    ramp(slope, (door_x, lo[1] + 0.01, lo[2] + 0.02), (door_x, lo[1] - 0.5, 0.015))

    hung = Part()  # the basket on the tall post, and the bowl between the two posts
    basket(hung, (-0.51, -0.17, basket_rim), 0.25, 0.2, [column])
    basket(hung, (0.0, -0.1, bowl_rim), 0.25, 0.2, [column, upper])

    top = Part()
    bed(top, (0.74, 0.5), (-0.025, 0.02, bed_top))
    pompom(top, (0.1, -0.2, bed_top - BOARD))

    return [frame.build(name + "Frame", coll), box(coll, name + "Box", lo, hi, [("front", 0.1), ("left", 0.0)]),
            slope.build(name + "Ramp", coll), hung.build(name + "Baskets", coll), top.build(name + "Bed", coll)]


def tall_tree(coll, name="TallTree"):
    """Three floors of boards on posts: a box on each floor, a platform out to each side and three beds on top."""
    w, d = 0.88, 0.6  # a floor's board
    mid, up = 0.87, 1.48  # the tops of the two boards over the base
    step_r, step_l = 0.57, 1.17  # the tops of the platforms out to the right and to the left
    beds_top, crown = 1.98, 2.27  # the tops of the two side beds' boards and of the middle bed's
    left, right = (-0.34, -0.2), (0.34, -0.2)  # the two rope posts, at the front corners
    boxes = [  # one a floor: its corners and its doors
        ("Low", (-0.44, -0.24, BASE), (0.08, 0.26, 0.51), [("front", 0.1), ("right", 0.0)]),
        ("Mid", (-0.13, -0.22, mid), (0.36, 0.26, 1.27), [("front", 0.0)]),
        ("Top", (-0.17, -0.2, up), (0.29, 0.26, 1.88), [("front", 0.04), ("left", 0.0)]),
    ]
    crown_post = (0.06, 0.04)

    frame = Part()  # the base, the boards, the platforms and every post
    add_box(frame, (w, d, BASE), (0, 0, BASE / 2), "TowerPlush", 0.02)
    for z in (mid, up):
        board(frame, (w, d), (0, 0, z))
    board(frame, (0.56, 0.4), (0.52, -0.26, step_r))
    board(frame, (0.56, 0.4), (-0.52, -0.26, step_l))
    rope = [(right, BASE, step_r - BOARD), (right, step_r, mid - BOARD), (left, mid, step_l - BOARD), (left, step_l, up - BOARD),
            (left, up, beds_top - BOARD), (right, up, beds_top - BOARD)]
    for at, z0, z1 in rope:
        post(frame, at, z0, z1, cap=0.04)
    plush = [((0.16, 0.2), BASE, mid - BOARD), ((-0.2, 0.02), boxes[0][2][2], mid - BOARD), ((-0.2, 0.2), mid, up - BOARD),
             ((0.25, 0.1), boxes[1][2][2], up - BOARD), (crown_post, boxes[2][2][2], crown - BOARD)]
    for at, z0, z1 in plush:
        post(frame, at, z0, z1, rope=False)

    beds = Part()
    size = (0.56, 0.44)
    bed(beds, size, (left[0] - 0.02, left[1], beds_top))
    bed(beds, size, (right[0] + 0.02, right[1], beds_top))
    bed(beds, size, (crown_post[0], crown_post[1], crown))
    for hang in ((-0.5, -0.36, beds_top - BOARD), (0.24, -0.36, beds_top - BOARD), (-0.1, -0.12, crown - BOARD)):
        pompom(beds, hang)

    return [frame.build(name + "Frame", coll), beds.build(name + "Beds", coll)] + [
        box(coll, name + "Box" + tag, lo, hi, doors) for tag, lo, hi, doors in boxes]


def barrel_tree(coll, name="BarrelTree"):
    """Two bases. On the left a barrel, a ladder and two posts under a board that carries a second barrel, with a
    hammock under it. On the right a lower board with a tunnel under it, and a bed on its own post."""
    tall, middle, right = (-0.63, 0.08), (0.0, 0.08), (0.57, 0.08)  # the three rope posts
    ledge, low, high, bed_top, peak = 0.74, 0.76, 1.37, 1.14, 1.91  # tops: ladder, right board, upper board, bed, tall post
    legs_x, legs_y = (-0.735, -0.525), (-0.1, 0.18)  # the ladder's four legs

    frame = Part()  # the bases, the boards, the ladder and every post
    add_box(frame, (0.88, 0.56, BASE), (-0.36, -0.02, BASE / 2), "TowerPlush", 0.02)
    add_box(frame, (0.58, 0.46, BASE), (0.535, 0.04, BASE / 2), "TowerPlush", 0.02)
    board(frame, (0.42, 0.4), (tall[0], 0.04, ledge), pad=True)
    board(frame, (0.78, 0.44), (0.28, 0.04, low), pad=True)
    board(frame, (0.86, 0.5), (-0.32, 0.04, high))
    for x in legs_x:
        for y in legs_y:
            cylinder(frame, (x, y), BASE, ledge - BOARD, 0.03)
    for z in (0.22, 0.48):  # two rope rungs across the front legs
        frame.add(*tube([(legs_x[0], legs_y[0], z), (legs_x[1], legs_y[0], z)], 0.034, sides=10), "TowerSisal")
    for at, z0, z1 in ((tall, ledge, high - BOARD), (tall, high, peak), (middle, BASE, low - BOARD), (middle, low, high - BOARD),
                       (right, BASE, low - BOARD), (right, low, bed_top - BOARD)):
        post(frame, at, z0, z1)

    hung = Part()  # the hammock under the upper board, and the tunnel under the right one
    a, b = (tall[0] + 0.1, 0.06, 1.1), (middle[0] - 0.1, 0.06, 1.1)
    hammock(hung, a, b, 0.17, 0.16, ((a[0] - 0.03, 0.06, high - BOARD), (b[0] + 0.03, 0.06, high - BOARD)))
    tunnel(hung, (0.29, 0.04, low - BOARD - 0.175), 0.175, 0.44)

    top = Part()
    bed(top, (0.5, 0.42), (right[0], 0.06, bed_top))
    pompom(top, (0.4, -0.12, bed_top - BOARD))
    arm = (tall[0] + 0.1, tall[1] - 0.05, peak - 0.03)  # a short arm off the tall post's top, for its pompom
    top.add(*tube([(tall[0], tall[1], peak - 0.03), arm], 0.012, sides=8), "TowerPlush")
    pompom(top, arm)

    return [frame.build(name + "Frame", coll), hung.build(name + "Hung", coll), top.build(name + "Bed", coll),
            barrel(coll, name + "BarrelLow", (-0.27, -0.06, BASE), 0.22, 0.44),
            barrel(coll, name + "BarrelTop", (-0.14, 0.03, high), 0.24, 0.42)]


def grand_tree(coll, name="GrandTree"):
    """Four posts through three boards: a box on each board, steps and platforms between them, two big baskets
    out to the left and two beds on top."""
    left, front, back, right = (-0.38, 0.02), (-0.13, -0.24), (0.11, 0.26), (0.37, 0.0)  # the four posts
    step, b1, b2, ledge, perch, b3 = 0.36, 0.56, 1.04, 1.1, 1.36, 1.6  # tops, going up: step, boards and platforms
    bed_r, bed_t = 2.08, 2.36  # the tops of the right bed's board and of the top bed's
    boxes = [  # one a board: its corners and its doors
        ("Low", (-0.1, -0.2, b1), (0.3, 0.2, b2 - BOARD), [("front", 0.0)]),
        ("Mid", (0.0, -0.2, b2), (0.62, 0.2, 1.44), [("front", 0.14)]),
        ("Top", (-0.24, -0.2, b3), (0.28, 0.2, 2.0), [("front", 0.08)]),
    ]

    frame = Part()  # the base, the boards, the platforms and every post
    add_box(frame, (1.0, 0.72, BASE), (0, 0, BASE / 2), "TowerPlush", 0.02)
    board(frame, (0.5, 0.4), (0.44, -0.1, step))
    board(frame, (0.98, 0.66), (0, 0, b1))
    board(frame, (0.7, 0.66), (0.31, 0, b2))
    board(frame, (0.5, 0.4), (-0.44, -0.04, ledge))
    board(frame, (0.45, 0.34), (-0.245, -0.23, perch))
    board(frame, (0.94, 0.66), (0, 0, b3))
    stretches = [  # a post stops under a board or a box and goes on over it
        (left, BASE, b1 - BOARD), (left, b1, 0.8), (left, 0.8, ledge - BOARD), (left, ledge, b3 - BOARD), (left, b3, 2.05),
        (left, 2.05, bed_t - BOARD),
        (front, BASE, b1 - BOARD), (front, b1, 0.93), (front, 0.93, perch - BOARD),
        (back, BASE, b1 - BOARD), (back, b1, b2 - BOARD), (back, b2, b3 - BOARD), (back, b3, 1.95), (back, 1.95, bed_t - BOARD),
        (right, BASE, step - BOARD), (right, step, b1 - BOARD), (right, b1, b2 - BOARD), (right, boxes[1][2][2], b3 - BOARD),
        (right, b3, bed_r - BOARD),
    ]
    for at, z0, z1 in stretches:
        post(frame, at, z0, z1)

    hung = Part()  # the two baskets on the left post
    basket(hung, (-0.64, -0.26, 0.8), 0.3, 0.22, [left])
    basket(hung, (-0.66, -0.12, bed_r), 0.27, 0.2, [left])

    top = Part()
    bed(top, (0.62, 0.46), (0.42, -0.02, bed_r))
    bed(top, (0.8, 0.52), (-0.14, 0.12, bed_t))
    pompom(top, (-0.2, -0.1, bed_t - BOARD))

    return [frame.build(name + "Frame", coll), hung.build(name + "Baskets", coll), top.build(name + "Beds", coll)] + [
        box(coll, name + "Box" + tag, lo, hi, doors) for tag, lo, hi, doors in boxes]


# ---------------------------------------------------------------- the tower's kit

FLOOR = 0.92  # a bay's square floor board
BAY = 1.5  # metres from one floor's top to the next
HOUSE = 0.42  # a house's height
SIDE, FRONT, SLING = 1.0, 0.55, 0.95  # heights over the floor: a side spot, the front spot and the hammock's ends
SIDE_POST, FRONT_POST = (-0.37, -0.1), (-0.22, -0.36)  # the left post and the front one; the right mirrors the left
HOUSES = ["HouseBox", "HouseWide", "HouseBarrel"]
SIDES = ["SidePlatform", "SideLadder", "SideBasket", "SideBed"]
FRONTS = ["FrontBowl", "FrontStep", "FrontTunnel"]


SIGNS = {"SignTag": ((0.2, 0.15), -0.147), "SignBoard": ((0.5, 0.15), 0.125)}  # a face's size, and its centre's height


def spot(obj, seat, sign):
    """Mark a module Arandu sits on: where he sits and where its sign goes, as empties named after it."""
    for kind, at in (("Seat", seat), ("Sign", sign)):
        if at:
            e = bpy.data.objects.new(obj.name + kind, None)
            e.empty_display_size = 0.08
            e.parent = obj
            e.location = at
            obj.users_collection[0].objects.link(e)
    return obj


def sign(coll, name, fixings):
    """A sign: a rim, and a cream face toward -Y whose UVs fill the whole texture. fixings(part) adds what holds it."""
    (w, h), mid = SIGNS[name]
    p = Part()
    fixings(p)
    add_box(p, (w + 0.024, 0.016, h + 0.024), (0, 0, mid), "TowerSignRim", 0.006)
    add_box(p, (w, 0.006, h), (0, -0.008, mid), "TowerSign")
    obj = p.build(name, coll, uv=True)
    me = obj.data
    for poly in me.polygons:
        if me.materials[poly.material_index].name == "TowerSign" and poly.normal.y < -0.9:
            for li in poly.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                me.uv_layers[0].data[li].uv = (co.x / w + 0.5, (co.z - mid) / h + 0.5)
    return obj


# ---------------------------------------------------------------- fabrics

TILE = {"TowerSisal": 0.1}  # metres one texture tile covers; every other material's covers 0.25


def noise(n, lo, hi, seed):
    """Tiling noise whose bumps are lo to hi pixels across, from -1 to 1."""
    f = np.fft.fftfreq(n)
    r = np.hypot(*np.meshgrid(f, f))
    h = np.fft.ifft2(np.fft.fft2(np.random.default_rng(seed).standard_normal((n, n))) * ((r > 1 / hi) & (r < 1 / lo))).real
    return h / np.abs(h).max()


def normal_map(name, height, strength):
    """A tiling normal map from a square height field, packed into the file."""
    old = bpy.data.images.get(name)
    if old:
        bpy.data.images.remove(old)
    n = height.shape[0]
    dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * strength
    dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * strength
    inv = 1 / np.sqrt(dx * dx + dy * dy + 1)
    img = bpy.data.images.new(name, n, n, alpha=False, is_data=True)
    img.pixels.foreach_set(np.stack([0.5 - dx * inv / 2, 0.5 - dy * inv / 2, 0.5 + inv / 2, np.ones_like(inv)], -1)
                           .astype(np.float32).ravel())
    img.pack()
    return img


def weave(name, image):
    """Put a normal map on a material, over its flat colour."""
    mat = _props["material"](name)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    for node in [n for n in nodes if n.type in ("TEX_IMAGE", "NORMAL_MAP")]:
        nodes.remove(node)
    tex, bump = nodes.new("ShaderNodeTexImage"), nodes.new("ShaderNodeNormalMap")
    tex.image = image
    links.new(tex.outputs["Color"], bump.inputs["Color"])
    links.new(bump.outputs["Normal"], next(n for n in nodes if n.type == "BSDF_PRINCIPLED").inputs["Normal"])


def fabrics():
    """Plush is tufts with a fine grain; rope is eight round coils a tile, each twisted from strands."""
    n = 256
    v, u = np.mgrid[0:n, 0:n] / n
    plush = normal_map("TowerPlushNormal", noise(n, 12, 40, 1) + 0.2 * noise(n, 2.5, 6, 2), 0.6)
    coil = np.sqrt(np.clip(1 - (2 * ((v * 8) % 1) - 1) ** 2, 0, 1))
    rope = normal_map("TowerSisalNormal", coil * (1 + 0.1 * np.sin(2 * np.pi * (u * 12 + v * 24))) + 0.04 * noise(n, 2, 5, 3), 6.0)
    for name in ("TowerPlush", "TowerHouse", "TowerSeat", "TowerHammock", "PompomFur"):
        weave(name, plush)
    weave("TowerSisal", rope)


def box_uv(obj):
    """Box-project a mesh's UVs in metres, so a fabric keeps one scale over every module. A side face maps height to
    V, which keeps the rope's coils level round a post. A sign's face keeps its own UVs."""
    me = obj.data
    uv = (me.uv_layers.get("UVMap") or me.uv_layers.new(name="UVMap")).data
    names = [m.name for m in me.materials]
    for poly in me.polygons:
        name = names[poly.material_index]
        if name == "TowerSign":
            continue
        t, n = TILE.get(name, 0.25), poly.normal
        axis = max(range(3), key=lambda i: abs(n[i]))
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv[li].uv = ((co.y if axis == 0 else co.x) / t, (co.y if axis == 2 else co.z) / t)


def build_kit(coll):
    """Every module of the tower, in a bay's own space."""
    left, front = SIDE_POST, FRONT_POST
    right = (-left[0], left[1])
    ceiling = BAY - BOARD

    def stretches(part, at, cuts):
        for z0, z1 in zip(cuts, cuts[1:]):
            post(part, at, z0, z1)

    p = Part()
    board(p, (FLOOR, FLOOR), (0, 0, 0))
    p.build("Board", coll)

    p = Part()  # a bay's three posts, from its floor up to the next
    stretches(p, left, (0, 0.48, 0.96, ceiling))
    stretches(p, right, (0, 0.72, ceiling))
    stretches(p, front, (0, 0.4, 0.92, ceiling))
    p.build("Posts", coll)

    # Houses stand at the back of the floor. Arandu sits in front of one, beside the front spot.
    # The board stands off the roof's middle: there the front post would cover its first letters.
    beside, roof = (0.27, -0.2, 0), (0.1, 0.04, HOUSE)
    spot(box(coll, "HouseBox", (-0.26, -0.01, 0), (0.26, 0.41, HOUSE), [("front", 0.08)]), beside, roof)
    spot(box(coll, "HouseWide", (-0.34, -0.01, 0), (0.34, 0.41, HOUSE), [("front", -0.16), ("front", 0.16)]), beside, roof)
    spot(barrel(coll, "HouseBarrel", (0, 0.2, 0), 0.23, HOUSE), beside, roof)

    # Side spots reach out past the floor's left edge, on the left post.
    out = (-0.55, left[1], SIDE)  # a side board's centre: the post goes through its inner end
    under = (-0.78, left[1], SIDE - BOARD)  # its sign hangs under its outer edge
    p = Part()
    board(p, (0.52, 0.42), out, pad=True)
    spot(p.build("SidePlatform", coll), (-0.64, left[1], SIDE), under)

    p = Part()  # the same board on a ladder that stands on the floor's edge
    board(p, (0.52, 0.42), out, pad=True)
    legs = [(-0.42, -0.26), (-0.42, 0.06)]
    for leg in legs:
        cylinder(p, leg, 0, SIDE - BOARD, 0.03)
    for z in (0.24, 0.48, 0.72):
        p.add(*tube([legs[0] + (z,), legs[1] + (z,)], 0.03, sides=10), "TowerSisal")
    spot(p.build("SideLadder", coll), (-0.64, left[1], SIDE), under)

    p = Part()
    basket(p, (-0.67, -0.16, SIDE), 0.26, 0.2, [left])
    spot(p.build("SideBasket", coll), (-0.67, -0.16, SIDE - 0.15), (-0.98, -0.16, SIDE - 0.03))

    p = Part()  # a bed held off the post by a neck
    bed(p, (0.5, 0.42), (-0.71, left[1], SIDE))
    p.add(*tube([(-0.5, left[1], SIDE - 0.03), left + (SIDE - 0.03,)], 0.04, sides=12), "TowerPlush")
    cylinder(p, left, SIDE - 0.1, SIDE + 0.03, R + 0.024)
    spot(p.build("SideBed", coll), (-0.71, left[1], SIDE + 0.05), (-0.94, left[1], SIDE - BOARD))

    # Front spots reach out past the floor's front edge, on the front post.
    p = Part()
    basket(p, (front[0], -0.67, FRONT), 0.26, 0.2, [front])
    spot(p.build("FrontBowl", coll), (front[0], -0.67, FRONT - 0.15), (front[0], -0.98, FRONT - 0.03))

    p = Part()
    board(p, (0.5, 0.44), (-0.2, -0.5, FRONT), pad=True)
    spot(p.build("FrontStep", coll), (-0.2, -0.58, FRONT), (-0.2, -0.69, FRONT - BOARD))

    p = Part()  # a wider step with a tunnel under it
    board(p, (0.6, 0.44), (-0.1, -0.5, FRONT), pad=True)
    tunnel(p, (0.02, -0.5, FRONT - BOARD - 0.16), 0.16, 0.42)
    spot(p.build("FrontTunnel", coll), (-0.12, -0.6, FRONT), (-0.32, -0.69, FRONT - BOARD))

    p = Part()  # the special lesson: an amber hammock slung between the left and right posts
    a, b = (left[0] + 0.1, left[1], SLING), (right[0] - 0.1, right[1], SLING)
    hammock(p, a, b, 0.19, 0.18, (left + (SLING + 0.22,), right + (SLING + 0.22,)), "TowerHammock")
    for at in (left, right):
        cylinder(p, at, SLING + 0.16, SLING + 0.28, R + 0.024)
    spot(p.build("Hammock", coll), (0, left[1], SLING - 0.15), (left[0] + 0.12, left[1] - 0.21, SLING - 0.03))  # at one end, clear of the house sign under it

    p = Part()  # a tunnel lying on a floor that has no house
    tunnel(p, (0, 0.2, 0.19), 0.19, 0.42)
    p.build("Tunnel", coll)

    p = Part()  # the book's start: its own posts in place of Posts, and three beds over the first house
    stretches(p, left, (0, 0.7, 1.38))
    stretches(p, right, (0, 0.5, 1.0))
    post(p, (0, 0.2), HOUSE, 1.74, rope=False)
    size = (0.56, 0.44)
    bed(p, size, (left[0] - 0.05, left[1], 1.44))
    bed(p, size, (right[0] + 0.05, right[1], 1.06))
    bed(p, size, (0, 0.16, 1.8))
    pompom(p, (-0.6, -0.26, 1.38))
    pompom(p, (0.14, -0.02, 1.74))
    spot(p.build("Crown", coll), (0, 0.16, 1.85), None)

    p = Part()  # the book's end: a pompom on a long string. Its origin is where the string is tied
    pompom(p, (0, 0, 0), length=0.3)
    p.build("Bolinha", coll)

    def string(part):
        part.add(*tube([(0, 0, 0), (0, 0, -0.06)], 0.004, sides=6), "TowerSisal")

    def stake(part):  # one, under the board's middle: the web turns the board on it to face the camera
        cylinder(part, (0, 0), 0, 0.05, 0.014, "TowerSignRim")

    sign(coll, "SignTag", string)  # hangs from its origin
    sign(coll, "SignBoard", stake)  # stands on a house's roof

    mods = [o for o in coll.objects if o.parent is None]
    for i, o in enumerate(mods):  # a row behind the trees, to look at
        o.location = (1.7 * i, 5, 0)
    return mods


def plan(chapters, special_every=2):
    """The tower's bays from the top, each as (what hangs in it, what stands on its floor). A chapter's house
    stands on a floor and its lessons hang in the bay under it, so going down the order is house, lessons, next
    house. A special lesson takes a bay of its own after every special_every chapters."""
    bays = [("crown", ("house", 0))]
    for c in range(chapters):
        last = c == chapters - 1
        special = (c + 1) % special_every == 0 and not last
        bays.append((("lessons", c), "end" if last else "tunnel" if special else ("house", c + 1)))
        if special:
            bays.append(("special", ("house", c + 1)))
    return bays


def build_tower(coll, chapters=5, seed=1, at=(0, 0, 0)):
    """Stack a book's tower from the kit, as linked copies. Returns its seats from the top: (what, where).
    shortcut: a bay has three lesson spots (left, right, front); a chapter with more lessons needs a second bay."""
    kit = bpy.data.collections[KIT].objects
    rng = random.Random(seed)
    bays = plan(chapters)
    flip = Matrix.Scale(-1, 4, (1, 0, 0))
    seats, last = [], {}

    def pick(kind, options):  # never the variant this kind used last
        last[kind] = rng.choice([v for v in options if v != last.get(kind)])
        return last[kind]

    def place(name, m, what=None, label=None):
        o = bpy.data.objects.new(name + "Copy", kit[name].data)
        o.matrix_world = m
        coll.objects.link(o)
        if what:
            seats.append((what, m @ kit[name + "Seat"].location))
        if label:  # its sign faces the bay's front and is never mirrored; the label is a sample of what the web writes
            kind = "SignBoard" if name in HOUSES else "SignTag"
            at = Matrix.Translation(m @ kit[name + "Sign"].location) @ turn
            place(kind, at)
            (_, h), mid = SIGNS[kind]
            text = bpy.data.curves.new("Label", "FONT")
            text.body, text.align_x, text.align_y, text.size = label, "CENTER", "CENTER", h * (0.5 if kind == "SignBoard" else 0.72)
            text.materials.append(_props["material"]("TowerSignInk"))
            sample = bpy.data.objects.new("Label", text)
            sample.matrix_world = at @ Matrix.Translation((0, -0.012, mid)) @ LAY
            coll.objects.link(sample)

    for i, (hung, floor) in enumerate(bays):
        z = (len(bays) + 1 - i) * BAY  # two bays of bare posts fit under the last floor
        turn = Matrix.Rotation(math.radians(90 * i), 4, "Z")
        m = Matrix.Translation(Vector(at) + Vector((0, 0, z))) @ turn
        if rng.random() < 0.5:
            m = m @ flip
        place("Board", m)
        if hung == "crown":
            place("Crown", m, "start")
        else:
            place("Posts", m)
        if hung == "special":
            place("Hammock", m, "special", "*")
        elif hung != "crown":
            c = hung[1]
            place(pick("side", SIDES), m, "chapter %d lesson 1" % (c + 1), "1")
            place(pick("side", SIDES), m @ flip, "chapter %d lesson 2" % (c + 1), "2")
            place(pick("front", FRONTS), m, "chapter %d lesson 3" % (c + 1), "3")
        if floor == "tunnel":
            place("Tunnel", m)
        elif floor == "end":  # the pompom hangs under the front spot, and Arandu sits on the floor by it
            place("Bolinha", m @ Matrix.Translation((-0.2, -0.64, FRONT - BOARD)))
            seats.append(("end", m @ Vector((0.1, -0.25, 0))))
        else:
            place(pick("house", HOUSES), m, "chapter %d" % (floor[1] + 1), "Capítulo %d" % (floor[1] + 1))
    for k in (1, 2):
        place("Posts", m @ Matrix.Translation((0, 0, -k * BAY)))
    return seats


def collection(name):
    coll = bpy.data.collections.get(name)
    if coll:
        datas = {o.data for o in coll.objects if o.data}
        for o in list(coll.objects):
            bpy.data.objects.remove(o)
        bpy.data.batch_remove([d for d in datas if d.users == 0])
    else:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    return coll


def triangles(objs):
    return sum(len(f.vertices) - 2 for o in objs if o.type == "MESH" for f in o.data.polygons)


def build():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    preview = collection(PREVIEW)  # first: its copies hold the kit's meshes
    trees = collection(TREES)
    for i, tree in enumerate((basket_tree, tall_tree, barrel_tree, grand_tree)):  # side by side, 2.3 m apart
        objs = tree(trees)
        for o in objs:
            o.location.x = 2.3 * i
        print("%s: %d triangles" % (tree.__name__, triangles(objs)))
    kit = collection(KIT)
    mods = build_kit(kit)
    print("kit: %d modules, %d triangles" % (len(mods), triangles(mods)))
    fabrics()
    for o in list(trees.objects) + list(kit.objects):
        if o.type == "MESH":
            box_uv(o)
    seats = build_tower(preview, at=(2.3 * 4 + 1, 0, 0))
    print("tower: %d seats, %d triangles drawn" % (len(seats), triangles(preview.objects)))
    return seats


if __name__ == "__main__":
    build()
