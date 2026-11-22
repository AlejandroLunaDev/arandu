# Rank outfits v3, closer to Alejandro's reference image: textured embroidery, long ends that reach
# the floor, asymmetric Greek drapes. Run after scene/kit/outfits/cloth, then call dress_v3().
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))  # run through runpy.run_path, which sets __file__
TEX = os.path.join(HERE, "tex")

def tex_mat(name, img, rough=0.6, sheen=0.3, bump=0.35, tint="7a3a8a"):
    """Cloth with gold thread: the mask turns painted gold into metal and raises it a little."""
    m = bpy.data.materials.get(name)
    if m:
        bpy.data.materials.remove(m)
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    def load(fn, color):
        im = bpy.data.images.load(os.path.join(TEX, fn), check_existing=True)
        im.colorspace_settings.name = "sRGB" if color else "Non-Color"
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = im
        return t
    c, k, h = load(f"{img}.png", True), load(f"{img}_m.png", False), load(f"{img}_h.png", False)
    nt.links.new(c.outputs["Color"], p.inputs["Base Color"])
    nt.links.new(k.outputs["Color"], p.inputs["Metallic"])
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = rough; mr.inputs["To Max"].default_value = 0.3
    nt.links.new(k.outputs["Color"], mr.inputs["Value"]); nt.links.new(mr.outputs["Result"], p.inputs["Roughness"])
    b = nt.nodes.new("ShaderNodeBump"); b.inputs["Strength"].default_value = bump; b.inputs["Distance"].default_value = 0.002
    nt.links.new(h.outputs["Color"], b.inputs["Height"]); nt.links.new(b.outputs["Normal"], p.inputs["Normal"])
    if "Sheen Weight" in p.inputs:
        p.inputs["Sheen Weight"].default_value = sheen
    if "Sheen Tint" in p.inputs:   # a white sheen turns dark velvet milky
        p.inputs["Sheen Tint"].default_value = (*srgb(tint), 1)
    return m

STOLE = tex_mat("RK_tex_stole", "stole")
STOLEEND = tex_mat("RK_tex_stoleend", "stoleend")
KNITWRAP = tex_mat("RK_tex_knitwrap", "knitwrap", 0.85, 0.3, 0.9)
KNITEND = tex_mat("RK_tex_knitend", "knitend", 0.85, 0.3, 0.9)
TOGA = tex_mat("RK_tex_toga", "toga", 0.8, 0.3, 0.2, "ffffff")
CREST = tex_mat("RK_tex_crest", "crest", 0.5, 0.3, 0.6)

def ground():
    g = bpy.data.objects.get("RK_ground")
    if g:
        return g
    me = bpy.data.meshes.new("RK_ground")
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0); bm.to_mesh(me); bm.free()
    g = bpy.data.objects.new("RK_ground", me); g.location = C0 + UP * 0.002
    s.collection.objects.link(g); g.modifiers.new("col", "COLLISION"); g.hide_render = True
    return g

def smooth_body():
    """The posed cat, remeshed and smoothed: cloth rests on the fur volume and the legs, without snagging on spikes."""
    o = bpy.data.objects.get("RK_body")
    if o:
        return o
    for n in ("RK_proxy", "RK_neckproxy"):   # the old inner colliders would fight the new one
        p = bpy.data.objects.get(n)
        for m in [m for m in p.modifiers if m.type == "COLLISION"]:
            p.modifiers.remove(m)
    w = bpy.context.window; prev = w.scene; w.scene = s
    s.frame_set(30)
    dg = bpy.context.evaluated_depsgraph_get()
    src = bpy.data.objects["RankCatMesh"]
    me = bpy.data.meshes.new_from_object(src.evaluated_get(dg))
    tmp = bpy.data.objects.new("RK_bodytmp", me); tmp.matrix_world = src.matrix_world.copy(); s.collection.objects.link(tmp)
    r = tmp.modifiers.new("re", "REMESH"); r.mode = "VOXEL"; r.voxel_size = 0.012
    sm = tmp.modifiers.new("sm", "SMOOTH"); sm.factor = 1.0; sm.iterations = 12
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    me2.transform(tmp.matrix_world)
    bpy.data.objects.remove(tmp, do_unlink=True); bpy.data.meshes.remove(me)
    o = bpy.data.objects.new("RK_body", me2); s.collection.objects.link(o)
    o.hide_render = True; o.display_type = "WIRE"
    o.modifiers.new("col", "COLLISION"); o.collision.thickness_outer = 0.006; o.collision.cloth_friction = 5
    w.scene = prev
    return o

_bvh = {}
def surface(p, d):
    """Farthest body surface along the ray p + t*d (so legs in front of the chest count too)."""
    from mathutils.bvhtree import BVHTree
    if "t" not in _bvh:
        b = smooth_body(); bm = bmesh.new(); bm.from_mesh(b.data)
        _bvh["t"] = BVHTree.FromBMesh(bm); bm.free()
    t, far, q = _bvh["t"], 0.0, p.copy()
    for _ in range(8):
        hit = t.ray_cast(q, d, 1.0)
        if hit[0] is None:
            break
        far = (hit[0] - p).dot(d); q = hit[0] + d * 0.002
    return far

def clear(prefix):
    for o in [o for o in bpy.data.objects if o.name.startswith(prefix)]:
        bpy.data.objects.remove(o, do_unlink=True)

def garment(name, m, hem, flare=1.2, top_z=0.25, top_r=0.125, U=96, V=18, rep=6, sim=None, thick=0.012, gap=0.008):
    """A garment around the neck: pinned neckline, hem height hem(c, s) where c points forward and
    s points to the cat's left. UVs run around (u) and from neckline (v=1) to hem (v=0)."""
    ground(); smooth_body(); clear(name)
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    rows = []
    for j in range(V + 1):
        t = j / V; row = []
        for i in range(U):
            a = 2 * math.pi * i / U; c, sn = math.cos(a), math.sin(a)
            d = (yaw_q() @ Vector((c * 1.15, sn, 0))).normalized()
            tc = C0 + yaw_q() @ Vector((0.06, 0, 0)) + UP * top_z
            top = tc + d * (surface(tc, d) + gap)
            bc = C0 + yaw_q() @ Vector((-0.013, 0, 0)) + UP * (hem(c, sn) + 0.03)
            ell = (yaw_q() @ Vector((c * 0.21 * flare, sn * 0.135 * flare, 0))).length
            bot = bc + d * max(ell, surface(bc, d) + 0.025)
            row.append(bm.verts.new(top.lerp(bot, t)))
        rows.append(row)
    for j in range(V):
        for i in range(U):
            f = bm.faces.new((rows[j][i], rows[j][(i + 1) % U], rows[j + 1][(i + 1) % U], rows[j + 1][i]))
            for l, (ii, jj) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                l[uv].uv = (rep * ii / U, 1 - jj / V)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); o.data.materials.append(m); s.collection.objects.link(o)
    simulate(o, 2, U, **(sim or {}))
    o.modifiers["sol"].thickness = thick
    return o

def hanging_end(name, m, top, width, length, W=8, L=26, sim=None, thick=0.012):
    """A long scarf or stole end pinned at the neck that falls down the chest to the floor."""
    ground(); smooth_body(); clear(name)
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    d = (-UP + F * 0.45).normalized()
    top = top + F * max(0.0, surface(top - F * 0.2, F) - 0.2 + 0.012)
    g = [[bm.verts.new(top - Rt * width * (i / (W - 1) - 0.5) + d * length * j / L) for i in range(W)] for j in range(L + 1)]
    for j in range(L):
        for i in range(W - 1):
            f = bm.faces.new((g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]))
            for l, (ii, jj) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                l[uv].uv = (ii / (W - 1), 1 - jj / L)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); o.data.materials.append(m); s.collection.objects.link(o)
    simulate(o, 1, W, **(sim or {"frames": 80, "bend": 1.5, "mass": 0.18}))
    o.modifiers["sol"].thickness = thick
    return o

def lowest(o, band=0.02):
    vs = [o.matrix_world @ v.co for v in o.data.vertices]
    lo = min(v.z for v in vs)
    edge = [v for v in vs if v.z < lo + band]
    return sum(edge, Vector()) / len(edge)

def emblem(name, loc, normal, size):
    """The shield crest: a gold back plate and a textured face (quill, laurel, stars)."""
    clear(name)
    pts = [(-1, 1), (-0.35, 0.82), (0, 1.05), (0.35, 0.82), (1, 1), (1, 0.15), (0.75, -0.45), (0, -1.1), (-0.75, -0.45), (-1, 0.15)]
    n = normal.normalized(); x = UP.cross(n).normalized(); y = n.cross(x)
    q = Matrix((x, y, n)).transposed().to_quaternion()
    for k, (m, sc, dz) in enumerate(((GOLD, 1.06, 0.0), (CREST, 1.0, 0.12))):
        bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
        f = bm.faces.new([bm.verts.new((px, py, 0)) for px, py in pts])
        r = bmesh.ops.extrude_face_region(bm, geom=[f])
        for v in [e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)]:
            v.co.z += 0.2
        for fa in bm.faces:
            for l in fa.loops:
                l[uvl].uv = ((l.vert.co.x + 1) / 2, (l.vert.co.y + 1.1) / 2.2)
        o = obj(f"{name}{k}", bm, m, loc + n * size * dz, q, (size * sc, size * sc, size))
        o.modifiers.new("bev", "BEVEL").width = 0.06

def tassel(tag):
    """A long gold tassel hanging from the mortarboard, like the reference."""
    cap = bpy.data.objects[f"RK_{tag}_cap"]
    dg = bpy.context.evaluated_depsgraph_get(); ev = cap.evaluated_get(dg)
    vs = [cap.matrix_world @ v.co for v in ev.data.vertices]
    top = max(v.z for v in vs)
    board = [v for v in vs if v.z > top - 0.012]
    ctr = sum(board, Vector()) / len(board)
    edge = max(board, key=lambda v: v.dot(Rt - F * 0.3))
    cord = edge - ctr
    obj(f"RK_{tag}_tcord", cyl(0.0035, 0.0035, cord.length, 8), GOLD, ctr + cord / 2 + UP * 0.004, axis_q(cord))
    obj(f"RK_{tag}_tknot", sphere(), GOLD, edge + UP * 0.002, None, (0.008, 0.008, 0.008))
    obj(f"RK_{tag}_tcap", cyl(0.006, 0.008, 0.018, 16), GOLD, edge - UP * 0.012, None)
    for i in range(10):   # the tassel's threads
        a = 2 * math.pi * i / 10
        off = (Rt * math.cos(a) + F * math.sin(a)) * 0.005
        obj(f"RK_{tag}_tthread{i}", cyl(0.003, 0.0026, 0.09, 6), GOLD, edge - UP * 0.066 + off, axis_q(UP + off * 6))

def knit_roll(name, z, minor, drop=0.03, U=96, V=16, rep=4):
    """A chunky ribbed scarf wrapped around the neck, sitting on the fur."""
    clear(name); bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    rings = []
    for i in range(U):
        a = 2 * math.pi * i / U; c, sn = math.cos(a), math.sin(a)
        d = (yaw_q() @ Vector((c * 1.15, sn, 0))).normalized()
        cz = C0 + yaw_q() @ Vector((0.06, 0, 0)) + UP * (z - drop * max(0.0, c))
        ctr = cz + d * (surface(cz, d) + minor * 0.7)
        k = minor * (1 + 0.1 * math.sin(3 * a))
        rings.append([bm.verts.new(ctr + d * k * math.cos(2 * math.pi * j / V) + UP * k * 0.8 * math.sin(2 * math.pi * j / V)) for j in range(V)])
    for i in range(U):
        for j in range(V):
            f = bm.faces.new((rings[i][j], rings[(i + 1) % U][j], rings[(i + 1) % U][(j + 1) % V], rings[i][(j + 1) % V]))
            for l, (ii, jj) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                l[uv].uv = (rep * ii / U, jj / V)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); o.data.materials.append(KNITWRAP); s.collection.objects.link(o)
    for p in o.data.polygons:
        p.use_smooth = True
    o.modifiers.new("subd", "SUBSURF").render_levels = 2
    return o

def show(rank):
    """Viewport: show only one rank's outfit on the cat (renders are unaffected)."""
    for o in s.objects:
        if o.name.startswith("RK_"):
            o.hide_set(not o.name.startswith(f"RK_{rank}_")) if o.name in bpy.context.view_layer.objects else None
            o.hide_viewport = not o.name.startswith(f"RK_{rank}_")

def seat_pack(tag):
    """Sit the pouch on the fur of the back and wrap the harness strap on the fur too."""
    d = (-F * 0.45 + Rt * 0.9).normalized()
    c = C0 + UP * 0.255
    hit = c + d * surface(c, d)
    names = [f"RK_{tag}_pack", f"RK_{tag}_packflap", f"RK_{tag}_packbtn"]
    base = bpy.data.objects[names[0]].location.copy()
    for n in names:
        o = bpy.data.objects[n]; o.location = hit + d * 0.045 + (o.location - base)
    for n in (f"RK_{tag}_packgirth", f"RK_{tag}_packbuckle"):
        o = bpy.data.objects[n]; o.modifiers["fit"].target = smooth_body()

def wreath(tag):
    """Gold laurel hugging the head: leaves lie on the fur and fan up and down along two branches."""
    clear(f"RK_{tag}_leaf"); clear(f"RK_{tag}_band")
    c = headTop - UP * 0.028 - F * 0.005
    tilt = Matrix.Rotation(math.radians(-14), 4, Rt).to_quaternion()
    n = 14
    for sd in (-1, 1):
        for i in range(n):
            t = i / (n - 1)
            a = BACK + sd * (0.2 + 2.35 * t)
            d = tilt @ Vector((math.cos(a), math.sin(a), 0))
            p = c + d * (surface(c, d) + 0.006)
            tang = a + sd * math.pi / 2
            for k, out in enumerate((-1, 1)):
                q = tilt @ Matrix.Rotation(tang, 4, "Z").to_quaternion() @ Matrix.Rotation(math.pi / 2, 4, "X").to_quaternion() @ Matrix.Rotation(out * 0.55 * sd, 4, "Z").to_quaternion()
                obj(f"RK_{tag}_leaf{sd}_{i}_{k}", leaf_bm(), LEAF, p + tilt @ (UP * 0.007 * out) + d * 0.003 * k, q, (0.034, 0.013, 0.004))

def first_hit(p, d):
    """Nearest body surface from a point inside the body."""
    surface(p, d)  # builds the tree
    hit = _bvh["t"].ray_cast(p, d, 1.0)
    return (hit[0], hit[1]) if hit[0] is not None else (p + d * 0.1, d)

def ring_on_body(name, m, center, normal, minor, flat=0.45, U=72, V=10, gap=0.0):
    """A strap that hugs the fur all the way around, in the plane through center with this normal."""
    clear(name)
    n = normal.normalized(); u = (F - n * F.dot(n)).normalized(); v = n.cross(u)
    bm = bmesh.new(); rings = []
    for i in range(U):
        a = 2 * math.pi * i / U
        d = (u * math.cos(a) + v * math.sin(a)).normalized()
        hp, hn = first_hit(center, d)
        c = hp + d * (minor * flat + gap)
        rings.append([bm.verts.new(c + d * minor * flat * math.cos(2 * math.pi * j / V) + n * minor * math.sin(2 * math.pi * j / V)) for j in range(V)])
    for i in range(U):
        for j in range(V):
            bm.faces.new((rings[i][j], rings[(i + 1) % U][j], rings[(i + 1) % U][(j + 1) % V], rings[i][(j + 1) % V]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); o.data.materials.append(m); s.collection.objects.link(o)
    for p in o.data.polygons:
        p.use_smooth = True
    o.modifiers.new("subd", "SUBSURF").render_levels = 2
    return o

def bib(name, m, z_top=0.232, z_tip=0.1, half=1.25, W=15, L=16):
    """A neckerchief: a cloth triangle hanging from the collar over the chest only."""
    ground(); smooth_body(); clear(name)
    bm = bmesh.new(); rows = []
    tip_c = C0 + yaw_q() @ Vector((0.0, 0, 0)) + UP * z_tip
    for j in range(L + 1):
        t = j / L; row = []
        for i in range(W):
            a = half * (1 - t) * (i / (W - 1) * 2 - 1)
            d = (yaw_q() @ Vector((math.cos(a) * 1.15, math.sin(a), 0))).normalized()
            zc = z_top + (z_tip - z_top) * t
            cz = C0 + yaw_q() @ Vector((0.03 * (1 - t), 0, 0)) + UP * zc
            row.append(bm.verts.new(cz + d * (surface(cz, d) + 0.012 + 0.01 * t)))
        rows.append(row)
    for j in range(L):
        for i in range(W - 1):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0015)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); o.data.materials.append(m); s.collection.objects.link(o)
    simulate(o, 1, W, frames=60, bend=2.0, mass=0.1)
    o.modifiers["sol"].thickness = 0.008
    return o

def cat_backpack(tag):
    """A real cat backpack: padded bag on the spine behind the shoulders, flap with a gold buckle,
    side pocket, carry handle, and an H harness (girth behind the front legs + chest strap)."""
    axis = (F * 0.32 + UP * 0.95).normalized()          # the sitting cat's spine
    gc = C0 - F * 0.035 + UP * 0.2                       # girth just behind the front legs
    ring_on_body(f"RK_{tag}_girth", PLUM, gc, axis, 0.011)
    ring_on_body(f"RK_{tag}_chest", PLUM, C0 + F * 0.07 + UP * 0.235, (F * 0.75 + UP * 0.66), 0.009)
    back = (-F * 0.93 + UP * 0.35 - axis * (-F * 0.93 + UP * 0.35).dot(axis)).normalized()
    side = (back * 0.9 + Rt * 0.42).normalized()         # turned a little toward the camera so it reads
    hp, _ = first_hit(gc + axis * 0.03, side)
    nz = side; nx = (axis - nz * axis.dot(nz)).normalized(); ny = nz.cross(nx)
    q = Matrix((nx, ny, nz)).transposed().to_quaternion()
    k = 1.2
    L = lambda x, y, z: hp + nx * x * k + ny * y * k + nz * z * k
    bag = box(f"RK_{tag}_bag", LILAC, L(0.0, 0, 0.038), q, (0.144, 0.156, 0.09), 0.25)
    flap = box(f"RK_{tag}_flap", PLUM, L(0.022, 0, 0.074), q, (0.102, 0.163, 0.022), 0.3)
    buckle = box(f"RK_{tag}_buckle", GOLD, L(-0.022, 0, 0.083), q, (0.022, 0.036, 0.01), 0.2)
    ys = 1 if ny.dot(Rt) > 0 else -1                     # the side pocket faces the camera
    pocket = box(f"RK_{tag}_pocket", PLUM, L(-0.005, ys * 0.072, 0.03), q, (0.09, 0.036, 0.06), 0.3)
    zip_ = box(f"RK_{tag}_zip", GOLD, L(-0.005, ys * 0.088, 0.05), q, (0.084, 0.005, 0.005), 0.1)
    for o in (bag, flap, pocket):
        o.modifiers.new("subd", "SUBSURF").render_levels = 2
    obj(f"RK_{tag}_handle", torus(0.022, 0.004, 32, 8, 0, math.pi), PLUM, L(0.0, 0, 0.083), q @ Matrix.Rotation(math.pi / 2, 4, "X").to_quaternion())
    for k, y in enumerate((-0.05, 0.05)):                # gold rings where the straps meet the bag
        obj(f"RK_{tag}_dring{k}", torus(0.011, 0.0025, 20, 6), GOLD, L(-0.055, y, 0.02), q @ Matrix.Rotation(math.pi / 2, 4, "Y").to_quaternion())

def dress_v3():
    w = bpy.context.window; prev = w.scene
    # Calouro: lilac neckerchief with a round gold tag, and a cat backpack on a harness
    clear("RK_calouro_")
    ring_on_body("RK_calouro_collar", PLUM, C0 + F * 0.075 + UP * 0.245, (F * 0.35 + UP * 0.94), 0.009)
    bib("RK_calouro_bib", LILAC)
    obj("RK_calouro_tag", cyl(0.022, 0.022, 0.007, 32), GOLD, C0 + F * 0.235 + UP * 0.2, axis_q(F + UP * 0.2))
    obj("RK_calouro_tagrim", torus(0.022, 0.0035, 32, 8), GOLD, C0 + F * 0.238 + UP * 0.201, axis_q(F + UP * 0.2))
    cat_backpack("calouro")
    # Veterano: flat ribbed knit scarf and one long end down to the floor
    clear("RK_veterano_")
    knit_roll("RK_veterano_roll", 0.215, 0.03)
    hanging_end("RK_veterano_end", KNITEND, C0 + F * 0.2 - Rt * 0.065 + UP * 0.205, 0.078, 0.215, thick=0.02)
    # Monitor: embroidered velvet stole, a long end with the crest at the bottom, glasses
    clear("RK_monitor_")
    garment("RK_monitor_mantle", STOLE, lambda c, sn: 0.105 + 0.05 * (1 - c), flare=1.2, rep=6)
    e = hanging_end("RK_monitor_end", STOLEEND, C0 + F * 0.2 - Rt * 0.065 + UP * 0.2, 0.07, 0.205)
    b = lowest(e)
    emblem("RK_monitor_crest", b + UP * 0.05 + F * 0.012, F + UP * 0.1, 0.026)
    glasses("monitor")
    # Mestre: a big embroidered cape over the body, a large crest on the chest, mortarboard with tassel
    clear("RK_mestre_")
    garment("RK_mestre_mantle", STOLE, lambda c, sn: 0.03 + 0.03 * (1 - max(0.0, c)), flare=1.15, rep=8, sim={"mass": 0.3, "bend": 1.0})
    emblem("RK_mestre_crest", C0 + F * 0.255 + UP * 0.13, F + UP * 0.25, 0.048)
    glasses("mestre"); cap("mestre", GOLD); tassel("mestre")
    # Filósofo: thick white mantle falling over the right shoulder, brooch at the chest, scroll
    clear("RK_filosofo_")
    garment("RK_filosofo_mantle", SOFTWHITE, lambda c, sn: min(0.215, max(0.035, 0.13 + 0.1 * sn)), flare=1.3, thick=0.028, sim={"bend": 2.5})
    k = C0 + F * 0.24 - Rt * 0.035 + UP * 0.175
    obj("RK_filosofo_brooch", cyl(0.027, 0.027, 0.01, 32), GOLD, k, axis_q(F + UP * 0.2))
    obj("RK_filosofo_broochrim", torus(0.027, 0.0055, 32, 8), GOLD, k + F * 0.004, axis_q(F + UP * 0.2))
    obj("RK_filosofo_gem", sphere(), AMB, k + F * 0.011, None, (0.012, 0.012, 0.009))
    scroll("filosofo")
    # Sábio: white toga crossing the chest diagonally to the floor, gold hem, laurel wreath
    clear("RK_sabio_")
    garment("RK_sabio_mantle", TOGA, lambda c, sn: min(0.215, max(0.005, 0.1 + 0.17 * sn + 0.03 * c)), flare=1.3, rep=5, thick=0.024, sim={"bend": 2.0, "mass": 0.28})
    wreath("sabio")
    for o in s.objects:
        if o.name.startswith("RK_"):
            o.hide_render = True
    w.scene = prev
    print("dressed v3")
