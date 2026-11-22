# Particle burst for the animated box (run after box_anim.py; uses its BOXA_ objects).
# Renders two passes for frames 100-150 into out/boxanim/: box pass (b_####) without particles,
# and light pass (x_####) with the box blacked out, to be glowed in PIL and screen-blended in the page.
import bpy, bmesh, math, os

s = bpy.data.scenes["AranduPaw"]
HERE = os.path.dirname(os.path.abspath(__file__))  # run through runpy.run_path, which sets __file__
OUT = os.path.join(HERE, "out", "boxanim")
F0, F1 = 100, 150

def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

def emit_mat(name, hexc, strength):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(n)
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*srgb(hexc), 1); em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs[0], next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL").inputs["Surface"])
    return m

# particle shapes: tiny glowing beads in gold, hot white and Arandu violet
col = bpy.data.collections.get("BOXA_parts") or bpy.data.collections.new("BOXA_parts")
for o in list(col.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for name, hexc, k in (("gold", "ffb93a", 2.6), ("gold2", "ffd27a", 2.4), ("white", "fff0cf", 3.4), ("violet", "a77bff", 3.2)):
    me = bpy.data.meshes.new("BOXA_p" + name); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("BOXA_p" + name, me); o.data.materials.append(emit_mat("BOXA_pm" + name, hexc, k)); col.objects.link(o)
    for p in me.polygons:
        p.use_smooth = True

# emitter: one upward face across the box mouth (the glow pad emits from its underside too)
old = bpy.data.objects.get("BOXA_emit")
if old:
    bpy.data.objects.remove(old, do_unlink=True)
root = bpy.data.objects["BOXA_root"]
A, B, H = 0.272, 0.19, 0.17
me = bpy.data.meshes.new("BOXA_emit")
me.from_pydata([(-A * .8, -B * .8, 0), (A * .8, -B * .8, 0), (A * .8, B * .8, 0), (-A * .8, B * .8, 0)], [], [(0, 1, 2, 3)])
YAW = -math.pi / 2 + 0.5
pad = bpy.data.objects.new("BOXA_emit", me); s.collection.objects.link(pad); pad.parent = root
pad.location = (0, 0, H * 0.75); pad.rotation_euler = (0, 0, YAW)

def burst(name, count, start, end, normal, rnd, grav, life, size):
    mod = pad.modifiers.new(name, "PARTICLE_SYSTEM"); ps = mod.particle_system.settings
    ps.count = count; ps.frame_start = start; ps.frame_end = end
    ps.lifetime = life; ps.lifetime_random = 0.5
    ps.emit_from = "FACE"; ps.use_emit_random = True
    ps.normal_factor = normal; ps.factor_random = rnd; ps.brownian_factor = 0.08; ps.drag_factor = 0.25
    ps.effector_weights.gravity = grav
    ps.render_type = "COLLECTION"; ps.instance_collection = col; ps.use_collection_pick_random = True
    ps.particle_size = size; ps.size_random = 0.75
    ps.use_rotations = False
    return mod

mods = [burst("BOXA_burst", 520, F0 + 25, F0 + 30, 1.25, 0.6, 0.5, 26, 0.0075),   # the pop when the flaps fly
        burst("BOXA_float", 140, F0 + 27, F0 + 50, 0.4, 0.3, -0.03, 32, 0.0055)]    # slow motes drifting up after
pad.show_instancer_for_render = False

BLACK = emit_mat("BOXA_black", "000000", 0.0)

def render(prefix, fx):
    w = bpy.context.window
    cam = bpy.data.objects["RankCam"]
    keep = dict(scene=w.scene, cam=s.camera, rx=s.render.resolution_x, ry=s.render.resolution_y, fs=s.frame_start, fe=s.frame_end,
                fp=s.render.filepath, cur=s.frame_current, ortho=cam.data.ortho_scale, loc=cam.location.copy(), mb=s.render.use_motion_blur)
    hidden = {o.name: o.hide_render for o in s.objects}
    slots = {}
    try:
        cam.data.ortho_scale = 1.15
        import mathutils
        YAW = -math.pi / 2 + 0.5; Rt = mathutils.Vector((math.cos(YAW - math.pi / 2), math.sin(YAW - math.pi / 2), 0))
        cam.location = cam.location + Rt * 0.07
        w.scene = s; s.camera = cam; s.render.resolution_x = s.render.resolution_y = 600
        for o in s.objects:
            if o.name.startswith(("RK_", "LINEUP_", "BOX_", "BOXC_")):
                o.hide_render = True
            if o.name.startswith("BOXA_"):
                o.hide_render = False
        bpy.data.objects["RankCatMesh"].hide_render = True
        for m in mods:
            m.show_render = fx
        if fx:
            s.render.use_motion_blur = True
            for o in s.objects:
                if o.name.startswith("BOXA_") and o.type == "MESH":
                    slots[o.name] = [sl.material for sl in o.material_slots]
                    for sl in o.material_slots:
                        sl.material = BLACK
        s.frame_start, s.frame_end = F0, F1
        s.render.filepath = os.path.join(OUT, prefix)
        bpy.ops.render.render(animation=True)
    finally:
        for n, mats in slots.items():
            for sl, m in zip(bpy.data.objects[n].material_slots, mats):
                sl.material = m
        for o in s.objects:
            if o.name in hidden:
                o.hide_render = hidden[o.name]
            if o.name.startswith("BOXA_"):
                o.hide_render = True
        bpy.data.objects["RankCatMesh"].hide_render = False
        cam.data.ortho_scale, cam.location = keep["ortho"], keep["loc"]
        s.render.use_motion_blur = keep["mb"]
        s.camera, s.render.resolution_x, s.render.resolution_y = keep["cam"], keep["rx"], keep["ry"]
        s.frame_start, s.frame_end, s.render.filepath = keep["fs"], keep["fe"], keep["fp"]
        s.frame_set(keep["cur"]); w.scene = keep["scene"]

PASS = globals().get("PASS", "both")
if PASS in ("both", "box"):
    render("b_", False)
if PASS in ("both", "fx"):
    render("x_", True)
print("fx passes rendered", PASS)
