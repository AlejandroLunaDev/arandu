# Animated reward box: hops, spins once, lands, bursts open with a warm glow inside.
# Only BOXA_ objects in the AranduPaw scene. Renders frames 101-140 to out/boxanim/ and one
# extra still (box open, Arandu sitting inside) to out/boxanim/cat.png. Restores the window scene.
# Run box.py first: this reuses its BOX_kraft, BOX_tape and BOX_paw materials.
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

s = bpy.data.scenes["AranduPaw"]
HERE = os.path.dirname(os.path.abspath(__file__))  # run through runpy.run_path, which sets __file__
OUT = os.path.join(HERE, "out", "boxanim")
os.makedirs(OUT, exist_ok=True)
YAW = -math.pi / 2 + 0.5
F = Vector((math.cos(YAW), math.sin(YAW), 0)); Rt = Vector((math.cos(YAW - math.pi / 2), math.sin(YAW - math.pi / 2), 0)); UP = Vector((0, 0, 1))
CENTER = Vector((60.0, 0, 0)) - F * 0.07 + Rt * 0.045   # fits Arandu sitting at frame 30, tail included
A, B, H, T = 0.272, 0.19, 0.17, 0.008             # half length (F), half width (Rt), height, wall
F0 = 100                                          # first animated frame

for o in [o for o in bpy.data.objects if o.name.startswith("BOXA_")]:
    bpy.data.objects.remove(o, do_unlink=True)

def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

KRAFT, TAPE, PAW = (bpy.data.materials[n] for n in ("BOX_kraft", "BOX_tape", "BOX_paw"))
GLOW = bpy.data.materials.get("BOXA_glow")
if not GLOW:
    GLOW = bpy.data.materials.new("BOXA_glow"); GLOW.use_nodes = True; nt = GLOW.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(n)
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*srgb("ffd27a"), 1)
    nt.links.new(em.outputs[0], next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL").inputs["Surface"])
EMIT = next(n for n in GLOW.node_tree.nodes if n.type == "EMISSION").inputs["Strength"]

root = bpy.data.objects.new("BOXA_root", None); s.collection.objects.link(root); root.location = CENTER

def panel(name, center, x, y, z, sx, sy, sz, m, parent=root, pivot=None, bev=0.002):
    """Cardboard panel in root space, mesh baked; origin at pivot (a hinge) when given."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
    rot = Matrix((x.normalized(), y.normalized(), z.normalized())).transposed().to_4x4()
    piv = pivot if pivot is not None else Vector()
    base = parent.matrix_world.inverted() @ root.matrix_world if parent is not root else Matrix()
    me.transform(Matrix.Translation(-piv) @ Matrix.Translation(center) @ rot @ Matrix.Diagonal((sx, sy, sz, 1)))
    o = bpy.data.objects.new(name, me); o.data.materials.append(m); s.collection.objects.link(o)
    o.parent = parent; o.location = piv if parent is root else piv - parent.location
    if bev:
        bv = o.modifiers.new("bev", "BEVEL"); bv.width = bev; bv.segments = 2; bv.affect = "EDGES"
    return o

# walls and floor
panel("BOXA_front", F * A + UP * H / 2, F, Rt, UP, T, 2 * B, H, KRAFT)
panel("BOXA_back", -F * A + UP * H / 2, F, Rt, UP, T, 2 * B, H, KRAFT)
for sd in (-1, 1):
    panel(f"BOXA_side{sd}", Rt * B * sd + UP * H / 2, F, Rt, UP, 2 * A, T, H, KRAFT)
panel("BOXA_bottom", UP * T / 2, F, Rt, UP, 2 * A, 2 * B, T, KRAFT)
panel("BOXA_glowpad", UP * (T + 0.002), F, Rt, UP, 2 * A - 0.03, 2 * B - 0.03, 0.002, GLOW, bev=0)

# violet paw stamp on the front wall
c = F * (A + T / 2 + 0.002) + UP * H * 0.48 - Rt * 0.06
paws = [panel("BOXA_pawpad", c, F, Rt, UP, 0.003, 0.05, 0.04, PAW, bev=0)]
for i, (dy, dz) in enumerate(((-0.03, 0.035), (-0.011, 0.05), (0.011, 0.05), (0.03, 0.035))):
    paws.append(panel(f"BOXA_pawtoe{i}", c + Rt * dy + UP * dz, F, Rt, UP, 0.003, 0.019, 0.019, PAW, bev=0))
for o in paws:
    o.modifiers.new("subd", "SUBSURF").levels = 2

# tape running down the short walls (it tears when the box opens)
for sd in (-1, 1):
    panel(f"BOXA_tapewall{sd}", F * sd * (A + T / 2 + 0.0015) + UP * (H - 0.03), F, Rt, UP, 0.003, 0.05, 0.07, TAPE, bev=0)

# flaps, origin on the hinge; short ones under, long ones on top
flaps = {}
for sd in (-1, 1):   # short flaps on the front/back edges, folded inward
    hinge = F * A * sd + UP * (H + T / 2)
    L = B * 0.95
    flaps[f"S{sd}"] = (panel(f"BOXA_flapS{sd}", hinge - F * sd * L / 2, F, Rt, UP, L, 2 * B * 0.98, T, KRAFT, pivot=hinge), (-F * sd).cross(UP))
for sd in (-1, 1):   # long flaps on the side edges, meeting in the middle
    hinge = Rt * B * sd + UP * (H + 1.5 * T)
    fl = panel(f"BOXA_flapL{sd}", hinge - Rt * sd * B / 2, F, Rt, UP, 2 * A, B * 0.99, T, KRAFT, pivot=hinge)
    flaps[f"L{sd}"] = (fl, (-Rt * sd).cross(UP))
    panel(f"BOXA_tape{sd}", Rt * sd * 0.0125 + UP * (H + 2 * T + 0.0015), F, Rt, UP, 2 * A + 0.004, 0.025, 0.003, TAPE, parent=fl, pivot=hinge, bev=0)

light = bpy.data.lights.new("BOXA_light", "POINT"); light.color = srgb("ffcf80"); light.shadow_soft_size = 0.05
lo = bpy.data.objects.new("BOXA_light", light); s.collection.objects.link(lo); lo.parent = root; lo.location = UP * 0.09

# ---- animation (24 fps) ----
def key(o, path, f, v):
    setattr(o, path, v); o.keyframe_insert(path, frame=F0 + f)

for f, z, rz, sc in ((0, 0, 0, (1, 1, 1)), (4, 0, 0, (1.08, 1.08, 0.86)), (7, 0.02, 0, (0.95, 0.95, 1.1)),
                     (13, 0.17, math.pi, (1, 1, 1)), (19, 0, 2 * math.pi, (1, 1, 1)), (21, 0, 2 * math.pi, (1.1, 1.1, 0.85)),
                     (25, 0, 2 * math.pi, (1, 1, 1))):
    key(root, "location", f, CENTER + UP * z); key(root, "rotation_euler", f, (0, 0, rz)); key(root, "scale", f, sc)

def swing(name, frames):
    o, axis = flaps[name]; o.rotation_mode = "AXIS_ANGLE"
    for f, deg in frames:
        key(o, "rotation_axis_angle", f, (math.radians(deg), *axis))
swing("L1", ((24, 0), (29, 218), (33, 202), (36, 206)))
swing("L-1", ((25, 0), (30, 222), (34, 208), (37, 212)))
swing("S1", ((27, 0), (32, 162), (36, 146), (39, 150)))   # front flap rests raised, so the paw shows
swing("S-1", ((28, 0), (33, 205), (37, 196), (40, 198)))

for f, e in ((24, 0), (29, 9), (40, 5)):
    EMIT.default_value = e; EMIT.keyframe_insert("default_value", frame=F0 + f)
for f, e in ((24, 0), (29, 12), (40, 6)):
    light.energy = e; light.keyframe_insert("energy", frame=F0 + f)

# ---- render ----
def render():
    w = bpy.context.window
    keep = dict(scene=w.scene, cam=s.camera, rx=s.render.resolution_x, ry=s.render.resolution_y,
                fs=s.frame_start, fe=s.frame_end, fp=s.render.filepath, cur=s.frame_current)
    hidden = {o.name: o.hide_render for o in s.objects}
    cat = bpy.data.objects["RankCatMesh"]
    try:
        cam = bpy.data.objects["RankCam"]; keep["ortho"], keep["camloc"] = cam.data.ortho_scale, cam.location.copy()
        cam.data.ortho_scale = 1.15; cam.location = cam.location + Rt * 0.07   # Rt points screen-left   # room for the open flaps
        w.scene = s; s.camera = cam; s.render.resolution_x = s.render.resolution_y = 600
        for o in s.objects:
            if o.name.startswith(("RK_", "LINEUP_", "BOX_", "BOXC_")):
                o.hide_render = True
        cat.hide_render = True
        s.frame_start, s.frame_end = F0, F0 + 40
        s.render.filepath = os.path.join(OUT, "f_")
        bpy.ops.render.render(animation=True)
        # final still: Arandu sitting in the open box (box anim stashed so frame 30 holds the end pose)
        s.frame_set(F0 + 40)
        stash = []
        for o in [root] + [fl for fl, _ in flaps.values()]:
            stash.append((o, o.animation_data.action));
            mw = {"loc": o.location.copy()}
            o.animation_data.action = None
        stash.append((GLOW.node_tree, GLOW.node_tree.animation_data.action)); GLOW.node_tree.animation_data.action = None
        stash.append((light, light.animation_data.action)); light.animation_data.action = None
        s.frame_set(30); cat.hide_render = False
        s.render.filepath = os.path.join(OUT, "cat.png")
        bpy.ops.render.render(write_still=True)
        for o, act in stash:
            o.animation_data.action = act
    finally:
        for o in s.objects:
            if o.name in hidden:
                o.hide_render = hidden[o.name]
        cat.hide_render = False
        for o in s.objects:
            if o.name.startswith("BOXA_"):
                o.hide_render = True
        cam = bpy.data.objects["RankCam"]
        if "ortho" in keep:
            cam.data.ortho_scale, cam.location = keep["ortho"], keep["camloc"]
        s.camera, s.render.resolution_x, s.render.resolution_y = keep["cam"], keep["rx"], keep["ry"]
        s.frame_start, s.frame_end, s.render.filepath = keep["fs"], keep["fe"], keep["fp"]
        s.frame_set(keep["cur"]); w.scene = keep["scene"]

render()
print("box animation rendered")
