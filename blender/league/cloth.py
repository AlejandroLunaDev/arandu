# Real cloth for the rank outfits: each garment is pinned at the neck and falls under gravity onto a
# static copy of the posed cat, so it gets weight and folds. Run after kit.py and outfits.py.
import bpy, bmesh, math
from mathutils import Vector, Matrix

POSE_FRAME = 30

def baked_collider():
    """Cloth collides with the smooth torso and neck proxies, not the spiky fur (fur may poke through, like a real cat)."""
    for n in ("RK_proxy", "RK_neckproxy"):
        o = bpy.data.objects[n]
        if not any(m.type == "COLLISION" for m in o.modifiers):
            o.modifiers.new("col", "COLLISION")
        o.collision.thickness_outer = 0.01
        o.collision.cloth_friction = 6
    return bpy.data.objects["RK_proxy"]

def cloth_bm(front_z, side_z, back_z, top_z=0.25, top_r=0.125, flare=1.2, U=96, V=18, trims=()):
    """Mantle start shape: pinned ring at the neck, hem flared out so it falls and folds."""
    bm = bmesh.new()
    rows = []
    for j in range(V + 1):
        t = j / V
        row = []
        for i in range(U):
            a = 2 * math.pi * i / U
            c = math.cos(a)
            zb = back_z + (side_z - back_z) * (1 - abs(c))
            if c > 0:
                zb = side_z + (front_z - side_z) * c ** 3
            top = C0 + yaw_q() @ Vector((0.06 + c * top_r * 1.15, math.sin(a) * top_r, 0)) + UP * top_z
            bot = C0 + yaw_q() @ Vector((-0.013 + c * 0.21 * flare, math.sin(a) * 0.135 * flare, 0)) + UP * (zb + 0.03)
            row.append(bm.verts.new(top.lerp(bot, t)))
        rows.append(row)
    for j in range(V):
        for i in range(U):
            f = bm.faces.new((rows[j][i], rows[j][(i + 1) % U], rows[j + 1][(i + 1) % U], rows[j + 1][i]))
            f.material_index = 1 if any(lo <= j < hi for lo, hi in trims) else 0
    return bm, U

def simulate(o, pin_rows, U, frames=90, bend=0.8, mass=0.22):
    vg = o.vertex_groups.new(name="pin")
    vg.add([i for i in range(U * pin_rows)], 1.0, "REPLACE")
    cl = o.modifiers.new("cloth", "CLOTH")
    st = cl.settings
    st.quality = 8; st.mass = mass; st.air_damping = 2.0
    st.tension_stiffness = 12; st.compression_stiffness = 12; st.shear_stiffness = 6; st.bending_stiffness = bend
    st.vertex_group_mass = "pin"
    cl.collision_settings.use_collision = True
    cl.collision_settings.distance_min = 0.006
    cl.collision_settings.use_self_collision = False
    cl.point_cache.frame_start = 1; cl.point_cache.frame_end = frames
    w = bpy.context.window
    prev = w.scene
    w.scene = s
    try:
        for f in range(1, frames + 1):
            s.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    finally:
        s.frame_set(POSE_FRAME)
        w.scene = prev
    old = o.data
    o.modifiers.clear()
    o.data = me
    bpy.data.meshes.remove(old)
    o.vertex_groups.clear()
    for p in o.data.polygons:
        p.use_smooth = True
    sol = o.modifiers.new("sol", "SOLIDIFY"); sol.thickness = 0.01; sol.offset = 1
    sd = o.modifiers.new("subd", "SUBSURF"); sd.levels = 1; sd.render_levels = 2
    return o

def cloth_mantle(tag, m, trim, front_z, side_z, back_z, trims=((15, 17), (12, 13)), sim=None, **kw):
    baked_collider()
    for o in [o for o in bpy.data.objects if o.name.startswith(f"RK_{tag}_mantle") or o.name.startswith(f"RK_{tag}_trim")]:
        bpy.data.objects.remove(o, do_unlink=True)
    bm, U = cloth_bm(front_z, side_z, back_z, trims=trims if trim else (), **kw)
    me = bpy.data.meshes.new(f"RK_{tag}_mantle")
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(f"RK_{tag}_mantle", me)
    o.data.materials.append(m)
    o.data.materials.append(trim or m)
    s.collection.objects.link(o)
    return simulate(o, 2, U, **(sim or {}))

def cloth_end(tag, m, trim, top, width, length, stripe_rows=(), L=22, W=7):
    """A scarf or stole end: pinned under the chin, it falls down the chest as real cloth."""
    for o in [o for o in bpy.data.objects if o.name.startswith(f"RK_{tag}_end") or o.name.startswith(f"RK_{tag}_stripe") or o.name.startswith(f"RK_{tag}_fringe")]:
        bpy.data.objects.remove(o, do_unlink=True)
    bm = bmesh.new()
    out_dir = (F * 0.6 + UP * 0.8).normalized()   # starts sticking out a little, then gravity lays it on the chest
    grid = [[bm.verts.new(top + Rt * width * (i / (W - 1) - 0.5) + out_dir * length * (j / L)) for i in range(W)] for j in range(L + 1)]
    for j in range(L):
        for i in range(W - 1):
            f = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            f.material_index = 1 if j in stripe_rows else 0
    me = bpy.data.meshes.new(f"RK_{tag}_end"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(f"RK_{tag}_end", me); o.data.materials.append(m); o.data.materials.append(trim or m)
    s.collection.objects.link(o)
    # flip so the strip hangs down instead of up: mirror the start direction around the pin row
    for v in o.data.vertices:
        d = v.co - top
        v.co = top + d - 2 * UP * d.dot(UP) + F * 0.04 * (d.length / length)
    simulate(o, 1, W, frames=70, bend=1.2, mass=0.15)
    o.modifiers["sol"].thickness = 0.014
    return o

def end_bottom(o):
    """World positions and normal of the hanging end's free edge."""
    dg = bpy.context.evaluated_depsgraph_get()
    vs = [o.matrix_world @ v.co for v in o.data.vertices]
    lo = min(v.z for v in vs)
    edge = [v for v in vs if v.z < lo + 0.012]
    c = sum(edge, Vector()) / len(edge)
    return edge, c

def scarf_roll(name, m, z, r, minor, drop=0.03, U=96, V=16, twist=0.0):
    """A chunky knitted roll wrapped around the neck, lower at the chest like a real scarf."""
    bm = bmesh.new()
    rings = []
    for i in range(U):
        a = 2 * math.pi * i / U
        c, sn = math.cos(a), math.sin(a)
        ctr = C0 + yaw_q() @ Vector((0.06 + c * r * 1.15, sn * r, 0)) + UP * (z - drop * max(0.0, c))
        radial = (yaw_q() @ Vector((c * 1.15, sn, 0))).normalized()
        k = minor * (1 + 0.12 * math.sin(3 * a + twist))   # the knit bunches unevenly
        rings.append([bm.verts.new(ctr + radial * k * math.cos(2 * math.pi * j / V) + UP * k * 0.85 * math.sin(2 * math.pi * j / V)) for j in range(V)])
    for i in range(U):
        for j in range(V):
            bm.faces.new((rings[i][j], rings[(i + 1) % U][j], rings[(i + 1) % U][(j + 1) % V], rings[i][(j + 1) % V]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); o.data.materials.append(m); s.collection.objects.link(o)
    for p in o.data.polygons:
        p.use_smooth = True
    sd = o.modifiers.new("subd", "SUBSURF"); sd.levels = 1; sd.render_levels = 2
    return o

def leaf_bm():
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=1)
    for v in bm.verts:
        v.co.y *= (1 - abs(v.co.x)) ** 0.7   # pointed at both ends
    return bm

def laurel_wreath(tag):
    for o in [o for o in bpy.data.objects if o.name.startswith(f"RK_{tag}_leaf") or o.name.startswith(f"RK_{tag}_band")]:
        bpy.data.objects.remove(o, do_unlink=True)
    c = headTop - UP * 0.055 + F * 0.01
    tilt = Matrix.Rotation(math.radians(-24), 4, Rt).to_quaternion()
    R = 0.162
    n = 13
    for sd in (-1, 1):                                  # two branches meeting at the back, open at the forehead
        for i in range(n):
            t = i / (n - 1)
            a = BACK + sd * (0.25 + 2.35 * t)
            p = c + tilt @ Vector((R * math.cos(a), R * math.sin(a), 0))
            tang = a + sd * math.pi / 2                  # leaves point toward the forehead
            for k, out in enumerate((-1, 1)):
                q = tilt @ Matrix.Rotation(tang + out * 0.55 * sd, 4, "Z").to_quaternion() @ Matrix.Rotation(out * 0.5, 4, "X").to_quaternion()
                obj(f"RK_{tag}_leaf{sd}_{i}_{k}", leaf_bm(), LEAF, p + tilt @ (UP * 0.006 * out), q, (0.036, 0.013, 0.0045))
        stem = torus(R, 0.003, 40, 6, BACK + sd * 0.1, BACK + sd * 2.65) if sd > 0 else torus(R, 0.003, 40, 6, BACK - 2.65, BACK - 0.1)
        obj(f"RK_{tag}_band{sd}", stem, GOLD, c, tilt)

def calouro_pack(tag):
    """A soft pouch riding on the back, held by a harness strap around the chest."""
    for o in [o for o in bpy.data.objects if o.name.startswith(f"RK_{tag}_pack")]:
        bpy.data.objects.remove(o, do_unlink=True)
    pack = C0 - F * 0.16 + Rt * 0.075 + UP * 0.255
    q = Matrix.Rotation(math.radians(-28), 4, Rt).to_quaternion() @ yaw_q()
    body = obj(f"RK_{tag}_pack", sphere(), LILAC, pack, q, (0.07, 0.08, 0.058))
    flap = obj(f"RK_{tag}_packflap", sphere(), PLUM, pack + (q @ Vector((0.014, 0, 0.032))), q, (0.058, 0.076, 0.034))
    btn = obj(f"RK_{tag}_packbtn", cyl(0.011, 0.011, 0.006, 20), GOLD, pack + (q @ Vector((0.06, 0, 0.026))), q @ axis_q(Vector((1, 0, 0.6))))
    for o in (body, flap):
        o.modifiers.new("subd", "SUBSURF").render_levels = 2
    tilt = Matrix.Rotation(math.radians(-25), 4, Rt).to_quaternion()
    fit(obj(f"RK_{tag}_packgirth", strip(0.16, 0.024), PLUM, C0 + UP * 0.19 - F * 0.01, tilt), 0.008, 0.008)
    fit(obj(f"RK_{tag}_packbuckle", strip(0.16, 0.03, 10), GOLD, C0 + UP * 0.19 - F * 0.01, tilt @ Matrix.Rotation(-0.25, 4, "Z").to_quaternion()), 0.017, 0.003)

def dress_all():
    cloth_mantle("calouro", LILAC, None, 0.14, 0.18, 0.2, flare=1.1)
    calouro_pack("calouro")
    for o in [o for o in bpy.data.objects if o.name.startswith("RK_veterano_mantle") or o.name.startswith("RK_veterano_ring")]:
        bpy.data.objects.remove(o, do_unlink=True)
    scarf_roll("RK_veterano_roll0", KNIT, 0.2, 0.135, 0.032)
    scarf_roll("RK_veterano_roll1", KNIT, 0.235, 0.125, 0.026, drop=0.035, twist=1.7)
    e = cloth_end("veterano", KNIT, GOLD, C0 + F * 0.21 + Rt * 0.065 + UP * 0.19, 0.075, 0.15, stripe_rows=(14, 15, 17, 18))
    edge, c = end_bottom(e)
    for i, p in enumerate(sorted(edge, key=lambda v: v.dot(Rt))[::max(1, len(edge) // 7)][:7]):
        obj(f"RK_veterano_fringe{i}", cyl(0.0045, 0.0035, 0.028, 8), GOLD, p - UP * 0.014)
    cloth_mantle("monitor", PLUM, GOLD, 0.14, 0.16, 0.17, flare=1.1)
    for o in [o for o in bpy.data.objects if o.name.startswith("RK_monitor_crest")]:
        bpy.data.objects.remove(o, do_unlink=True)
    e = cloth_end("monitor", PLUM, GOLD, C0 + F * 0.18 + Rt * 0.07 + UP * 0.2, 0.058, 0.13, stripe_rows=(19, 20))
    edge, c = end_bottom(e)
    crest("monitor", c + UP * 0.04 + F * 0.03, F + UP * 0.15, 0.023)
    cloth_mantle("mestre", PLUM, GOLD, 0.05, 0.11, 0.13)
    cloth_mantle("filosofo", SOFTWHITE, None, 0.1, 0.12, 0.14, flare=1.15, sim={"bend": 1.5})
    cloth_mantle("sabio", SOFTWHITE, GOLD, 0.03, 0.06, 0.08)
    laurel_wreath("sabio")
    for o in s.objects:
        if o.name.startswith("RK_"):
            o.hide_render = True
