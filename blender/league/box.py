# Arandu's cardboard reward box: an open one with the cat sitting inside, and a closed, taped one.
# Only BOX_ objects in the AranduPaw scene; renders to out/box-open.png and out/box-closed.png.
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

s = bpy.data.scenes["AranduPaw"]
HERE = os.path.dirname(os.path.abspath(__file__))  # run through runpy.run_path, which sets __file__
OUT = os.path.join(HERE, "out")
YAW = -math.pi / 2 + 0.5
F = Vector((math.cos(YAW), math.sin(YAW), 0)); Rt = Vector((math.cos(YAW - math.pi / 2), math.sin(YAW - math.pi / 2), 0)); UP = Vector((0, 0, 1))
O = Vector((60.0, 0, 0)) - F * 0.005
A, B, H, T = 0.235, 0.175, 0.17, 0.008   # half length (F), half width (Rt), height, wall thickness

for o in [o for o in bpy.data.objects if o.name.startswith(("BOX_", "BOXC_"))]:
    bpy.data.objects.remove(o, do_unlink=True)

def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

def kraft():
    m = bpy.data.materials.get("BOX_kraft")
    if m:
        return m
    m = bpy.data.materials.new("BOX_kraft"); m.use_nodes = True; nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"); p.inputs["Roughness"].default_value = 0.85
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 90
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*srgb("b47a43"), 1); ramp.color_ramp.elements[1].color = (*srgb("cf9a5e"), 1)
    nt.links.new(nz.outputs["Fac"], ramp.inputs["Fac"]); nt.links.new(ramp.outputs["Color"], p.inputs["Base Color"])
    b = nt.nodes.new("ShaderNodeBump"); b.inputs["Strength"].default_value = 0.15
    nt.links.new(nz.outputs["Fac"], b.inputs["Height"]); nt.links.new(b.outputs["Normal"], p.inputs["Normal"])
    return m

def flat(name, hexc, rough):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    p.inputs["Base Color"].default_value = (*srgb(hexc), 1); p.inputs["Roughness"].default_value = rough
    return m

KRAFT = kraft(); TAPE = flat("BOX_tape", "d8b47a", 0.35); PAW = flat("BOX_paw", "8a5cc8", 0.5)

def panel(name, center, x, y, z, sx, sy, sz, m, bev=0.002):
    """A cardboard panel: sx along x, sy along y, sz along z (world directions)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); o.data.materials.append(m); s.collection.objects.link(o)
    rot = Matrix((x.normalized(), y.normalized(), z.normalized())).transposed().to_4x4()
    o.matrix_world = Matrix.Translation(center) @ rot @ Matrix.Diagonal((sx, sy, sz, 1))
    bv = o.modifiers.new("bev", "BEVEL"); bv.width = bev; bv.segments = 2; bv.affect = "EDGES"
    for p in o.data.polygons:
        p.use_smooth = False
    return o

def walls(pre):
    panel(f"{pre}front", O + F * A + UP * H / 2, F, Rt, UP, T, 2 * B, H, KRAFT)
    panel(f"{pre}back", O - F * A + UP * H / 2, F, Rt, UP, T, 2 * B, H, KRAFT)
    for sd in (-1, 1):
        panel(f"{pre}side{sd}", O + Rt * B * sd + UP * H / 2, F, Rt, UP, 2 * A, T, H, KRAFT)
    panel(f"{pre}bottom", O + UP * T / 2, F, Rt, UP, 2 * A, 2 * B, T, KRAFT)

def paw(pre):
    """Arandu's violet paw stamp on the front wall."""
    c = O + F * (A + T / 2 + 0.002) + UP * H * 0.48 - Rt * 0.06
    disc = lambda name, p, r: panel(name, p, F, Rt, UP, 0.003, r * 2, r * 2, PAW, 0.0)
    pad = panel(f"{pre}pawpad", c, F, Rt, UP, 0.003, 0.05, 0.04, PAW, 0.0)
    for i, (dy, dz) in enumerate(((-0.03, 0.035), (-0.011, 0.05), (0.011, 0.05), (0.03, 0.035))):
        disc(f"{pre}pawtoe{i}", c + Rt * dy + UP * dz, 0.0095)
    for o in [o for o in bpy.data.objects if o.name.startswith(f"{pre}paw")]:
        o.modifiers.new("subd", "SUBSURF").levels = 2   # rounds the stamp shapes

def open_box():
    walls("BOX_")
    # flaps: hinged on each top edge, falling open outward
    for sd, ang in ((1, 118), (-1, 112)):   # front, back (short walls along F)
        L = B * 0.95; th = math.radians(ang)
        d = UP * math.cos(th) + F * sd * math.sin(th)
        hinge = O + F * A * sd + UP * H
        panel(f"BOX_flapF{sd}", hinge + d * L / 2, d.cross(Rt), Rt, d, T, 2 * B * 0.98, L, KRAFT)
    for sd, ang in ((1, 125), (-1, 108)):   # the two long side flaps
        L = B * 0.95; th = math.radians(ang)
        d = UP * math.cos(th) + Rt * sd * math.sin(th)
        hinge = O + Rt * B * sd + UP * H
        panel(f"BOX_flapR{sd}", hinge + d * L / 2, F, d.cross(F), d, 2 * A * 0.98, T, L, KRAFT)
    paw("BOX_")

def closed_box():
    walls("BOXC_")
    for sd in (-1, 1):   # long flaps folded flat on top, meeting in the middle
        panel(f"BOXC_top{sd}", O + Rt * B * sd / 2 + UP * (H + T / 2), F, Rt, UP, 2 * A, B * 0.99, T, KRAFT)
    panel("BOXC_tape", O + UP * (H + T + 0.0015), F, Rt, UP, 2 * A + 0.004, 0.05, 0.003, TAPE, 0.0)
    for sd in (-1, 1):   # tape running down the short walls
        panel(f"BOXC_tape{sd}", O + F * sd * (A + T / 2 + 0.0015) + UP * (H - 0.03), F, Rt, UP, 0.003, 0.05, 0.07, TAPE, 0.0)
    paw("BOXC_")

open_box(); closed_box()

def render(name, show_prefix, cat):
    w = bpy.context.window; prev, pc, rx, ry = w.scene, s.camera, s.render.resolution_x, s.render.resolution_y
    cam = bpy.data.objects["RankCam"]
    hidden = {o.name: o.hide_render for o in s.objects}
    try:
        w.scene = s; s.camera = cam; s.render.resolution_x = s.render.resolution_y = 600; s.frame_set(30)
        for o in s.objects:
            if o.name.startswith(("RK_", "LINEUP_", "BOX_", "BOXC_")):
                o.hide_render = not o.name.startswith(show_prefix)
        bpy.data.objects["RankCatMesh"].hide_render = not cat
        s.render.filepath = os.path.join(OUT, f"{name}.png")
        bpy.ops.render.render(write_still=True)
    finally:
        for o in s.objects:
            if o.name in hidden:
                o.hide_render = hidden[o.name]
        bpy.data.objects["RankCatMesh"].hide_render = False
        for o in s.objects:
            if o.name.startswith(("BOX_", "BOXC_")):
                o.hide_render = True
        s.camera, s.render.resolution_x, s.render.resolution_y = pc, rx, ry
        w.scene = prev

render("box-open", "BOX_", True)
render("box-closed", "BOXC_", False)
for o in s.objects:
    if o.name.startswith(("BOX_", "BOXC_")):
        o.hide_viewport = True
print("boxes rendered")
