# Builds the league-rank accessories on the RankCat copy in scene AranduPaw (never in the room scene).
import bpy, bmesh, math
from mathutils import Vector, Matrix

s = bpy.data.scenes["AranduPaw"]
YAW = -math.pi / 2 + 0.5
F = Vector((math.cos(YAW), math.sin(YAW), 0))                       # where the cat faces
Rt = Vector((math.cos(YAW - math.pi / 2), math.sin(YAW - math.pi / 2), 0))  # the cat's right
UP = Vector((0, 0, 1))

for o in [o for o in bpy.data.objects if o.name.startswith("RK_")]:
    bpy.data.objects.remove(o, do_unlink=True)

def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

def mat(name, hexc, rough=0.6, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    p.inputs["Base Color"].default_value = (*srgb(hexc), 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    return m

VIO = mat("RK_violet", "8a5cc8", 0.55)
AMB = mat("RK_amber", "e0a845", 0.4)
GOLD = mat("RK_gold", "e2b04a", 0.28, 0.9)
BECA = mat("RK_beca", "4a2a7a", 0.7)
WHITE = mat("RK_white", "f4eee2", 0.75)
CREAM = mat("RK_cream", "eadcbc", 0.7)
BROWN = mat("RK_brown", "6b4426", 0.6)
LEAF = mat("RK_leaf", "c9a646", 0.3, 0.85)

def obj(name, bm, m, loc, q=None, scale=(1, 1, 1)):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new(name, me)
    o.data.materials.append(m)
    o.location = loc
    o.rotation_mode = "QUATERNION"
    if q is not None:
        o.rotation_quaternion = q
    o.scale = scale
    s.collection.objects.link(o)
    return o

def torus(R, r, seg=56, ring=14, a0=0.0, a1=2 * math.pi):
    bm = bmesh.new()
    closed = abs(a1 - a0 - 2 * math.pi) < 1e-6
    n = seg if closed else seg + 1
    for i in range(n):
        a = a0 + (a1 - a0) * i / seg
        for j in range(ring):
            b = 2 * math.pi * j / ring
            bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b)))
    bm.verts.ensure_lookup_table()
    for i in range(seg if closed else seg):
        for j in range(ring):
            v = lambda ii, jj: bm.verts[(ii % n) * ring + (jj % ring)]
            bm.faces.new((v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)))
    return bm

def sphere():
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=1)
    return bm

def cube():
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    return bm

def cyl(r1, r2, d, seg=28):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=d)
    return bm

def band(r1, r2, h, a0, a1, seg=48):
    bm = bmesh.new()
    rows = [[bm.verts.new((r * math.cos(a0 + (a1 - a0) * i / seg), r * math.sin(a0 + (a1 - a0) * i / seg), z)) for i in range(seg + 1)] for r, z in ((r1, 0), (r2, h))]
    for i in range(seg):
        bm.faces.new((rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]))
    return bm

def axis_q(axis):  # rotates local +Z onto axis
    return UP.rotation_difference(axis.normalized())

def yaw_q(extra=0.0):
    return Matrix.Rotation(YAW + extra, 4, "Z").to_quaternion()

neck = Vector((60.042, -0.08, 0.25))
chest = Vector((60.02, -0.03, 0.17))
eyeL = Vector((60.181, -0.191, 0.39))
eyeR = Vector((60.063, -0.256, 0.39))
headTop = Vector((60.069, -0.126, 0.49))
BACK = math.atan2(-F.y, -F.x)

def solid(o, t):
    o.modifiers.new("sol", "SOLIDIFY").thickness = t
    return o

C0 = Vector((60.0, 0.0, 0.0))  # torso axis (posed mesh: half-width 0.12 along Rt at z 0.16)
# Clothes wrap a smooth invisible torso, not the spiky fur, so the cloth stays clean.
def _proxy():
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=32, radius=1)
    me = bpy.data.meshes.new("RK_proxy"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("RK_proxy", me); s.collection.objects.link(o)
    o.location = C0 - F * 0.013 + UP * 0.165; o.rotation_mode = "QUATERNION"; o.rotation_quaternion = yaw_q()
    o.scale = (0.205, 0.125, 0.15); o.hide_render = True; o.hide_viewport = False; o.display_type = "WIRE"
    return o
def _neck():
    me = bpy.data.meshes.new("RK_neckproxy"); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=48, radius1=0.125, radius2=0.11, depth=0.09); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("RK_neckproxy", me); s.collection.objects.link(o)
    o.location = C0 + F * 0.07 + UP * 0.225; o.rotation_mode = "QUATERNION"; o.rotation_quaternion = Matrix.Rotation(math.radians(16), 4, Rt).to_quaternion()
    o.hide_render = True; o.display_type = "WIRE"
    return o
BODY = _proxy()
NECK = _neck()

def fit(o, off=0.008, thick=0.007, target=None):
    """Pet clothes hug a smooth torso: shrinkwrap, soften, then give the cloth a thickness."""
    w = o.modifiers.new("fit", "SHRINKWRAP"); w.target = target or BODY; w.wrap_method = "NEAREST_SURFACEPOINT"; w.offset = off
    sm = o.modifiers.new("soft", "SMOOTH"); sm.factor = 0.6; sm.iterations = 4
    if thick:
        o.modifiers.new("sol", "SOLIDIFY").thickness = thick
    return o

def strip(R, w, seg=72):  # an open ring of cloth (a strap), width w
    bm = bmesh.new()
    rows = [[bm.verts.new((R * math.cos(2 * math.pi * i / seg), R * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)] for z in (-w / 2, 0, w / 2)]
    for r in range(2):
        for i in range(seg):
            bm.faces.new((rows[r][i], rows[r][(i + 1) % seg], rows[r + 1][(i + 1) % seg], rows[r + 1][i]))
    return bm

def sheet(pts, n=14):  # a cloth patch from 3 or 4 corner points, subdivided so it can drape
    bm = bmesh.new()
    if len(pts) == 3:
        pts = [pts[0], pts[1], pts[2], pts[2]]
    a, b, c, d = pts
    grid = [[bm.verts.new((a.lerp(b, u / n)).lerp(d.lerp(c, u / n), v / n)) for u in range(n + 1)] for v in range(n + 1)]
    for v in range(n):
        for u in range(n):
            q = [grid[v][u], grid[v][u + 1], grid[v + 1][u + 1], grid[v + 1][u]]
            if len({id(x) for x in q}) == 4 and len({tuple(round(t, 6) for t in x.co) for x in q}) == 4:
                bm.faces.new(q)
            elif len({tuple(round(t, 6) for t in x.co) for x in q}) == 3:
                uq = []
                for x in q:
                    if all((x.co - y.co).length > 1e-6 for y in uq):
                        uq.append(x)
                bm.faces.new(uq)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    return bm

def box(name, m, loc, q, size, bev):
    o = obj(name, cube(), m, loc, q, size)
    b = o.modifiers.new("bev", "BEVEL"); b.width = bev; b.segments = 4
    return o

NECK_C = C0 + F * 0.075 + UP * 0.215
NECK_Q = Matrix.Rotation(math.radians(16), 4, Rt).to_quaternion()

def collar(tag, m=None):
    return fit(obj(f"RK_{tag}_collar", strip(0.13, 0.024), m or AMB, NECK_C, NECK_Q), 0.012, 0.01, NECK)

def backpack(tag):  # pet harness pack: collar strap, girth strap, chest strap, small pack riding on the back
    out = [collar(tag)]
    out.append(fit(obj(f"RK_{tag}_girth", strip(0.16, 0.026), AMB, C0 + UP * 0.165, Matrix.Rotation(math.radians(-25), 4, Rt).to_quaternion()), 0.006, 0.008))
    pack = C0 - F * 0.135 + UP * 0.255
    out.append(box(f"RK_{tag}_pack", VIO, pack, Matrix.Rotation(math.radians(-30), 4, Rt).to_quaternion() @ yaw_q(), (0.11, 0.15, 0.085), 0.03))
    out.append(box(f"RK_{tag}_packflap", AMB, pack + UP * 0.03 + F * 0.01, Matrix.Rotation(math.radians(-30), 4, Rt).to_quaternion() @ yaw_q(), (0.08, 0.155, 0.03), 0.012))
    out.append(obj(f"RK_{tag}_tag", cyl(0.018, 0.018, 0.005, 20), GOLD, NECK_C + F * 0.14 - UP * 0.035, axis_q(F)))
    return out

def bandana(tag):  # pet neckerchief: a triangle hanging from the collar onto the chest
    out = [collar(tag)]
    l = NECK_C + F * 0.06 - Rt * 0.12 - UP * 0.01
    r = NECK_C + F * 0.06 + Rt * 0.12 - UP * 0.01
    tip = C0 + F * 0.24 + UP * 0.095
    out.append(fit(obj(f"RK_{tag}_bandana", sheet([l, r, tip]), VIO, Vector()), 0.014, 0.007))
    out.append(fit(obj(f"RK_{tag}_hem", sheet([tip + UP * 0.03 - Rt * 0.022, tip + UP * 0.03 + Rt * 0.022, tip + F * 0.004], 6), AMB, Vector()), 0.02, 0.005))
    return out

def scarf(tag):
    return bandana(tag)

def glasses(tag):
    out = []
    for i, e in enumerate((eyeL, eyeR)):
        out.append(obj(f"RK_{tag}_lens{i}", torus(0.046, 0.0065, 40, 10), GOLD, e + F * 0.048, axis_q(F)))
    out.append(obj(f"RK_{tag}_bridge", cyl(0.006, 0.006, 0.035, 10), GOLD, (eyeL + eyeR) / 2 + F * 0.058 + UP * 0.006, axis_q(Rt)))
    return out

def cap(tag, tassel):  # a mini pet mortarboard worn tilted, like a costume cap
    src = bpy.data.objects["GradCap"]
    c = src.copy(); c.data = src.data.copy(); c.name = f"RK_{tag}_cap"; c.parent = None
    s.collection.objects.link(c)
    c.location = headTop + F * 0.035 + Rt * 0.02 + UP * 0.012
    c.rotation_mode = "QUATERNION"
    c.rotation_quaternion = Matrix.Rotation(math.radians(10), 4, F).to_quaternion() @ Matrix.Rotation(math.radians(-12), 4, Rt).to_quaternion() @ yaw_q(math.radians(40))
    c.scale = (0.56, 0.56, 0.56)
    for sl in c.material_slots:
        if sl.material and sl.material.name != "CapCloth":
            sl.link = "OBJECT"; sl.material = tassel
    return [c]

def capelet(tag, cloth, pin):  # Greek chlamys for a cat: cloth over the right shoulder and flank, pinned at the shoulder
    tl = NECK_C - F * 0.09 + UP * 0.01
    tr = NECK_C + F * 0.07 + Rt * 0.1
    br = C0 + F * 0.06 + Rt * 0.13 + UP * 0.05
    bl = C0 - F * 0.2 + Rt * 0.04 + UP * 0.05
    out = [fit(obj(f"RK_{tag}_cape", sheet([tl, tr, br, bl], 18), cloth, Vector()), 0.014, 0.008)]
    k = NECK_C + F * 0.085 + Rt * 0.105 - UP * 0.025
    out.append(obj(f"RK_{tag}_brooch", cyl(0.022, 0.022, 0.008, 28), pin, k, axis_q(F * 0.6 + Rt * 0.8)))
    out.append(obj(f"RK_{tag}_gem", sphere(), AMB, k + (F * 0.6 + Rt * 0.8).normalized() * 0.006, None, (0.009, 0.009, 0.009)))
    return out

def toga(tag, cloth, collar_m, trim=None):  # pet toga: white cloth draped over the back and across the chest
    out = capelet(tag, cloth, collar_m)
    q = Matrix.Rotation(math.radians(-40), 4, F).to_quaternion()
    out.append(fit(obj(f"RK_{tag}_drape", strip(0.17, 0.075), cloth, C0 + UP * 0.165, q), 0.016, 0.008))
    if trim:
        for sd in (-1, 1):
            out.append(fit(obj(f"RK_{tag}_drapetrim{sd}", strip(0.17, 0.01), trim, C0 + UP * 0.165 + (q @ UP) * sd * 0.04, q), 0.022, 0.005))
    return out

def laurel(tag):
    out = []
    c = headTop - UP * 0.012 + F * 0.03
    tilt = Matrix.Rotation(math.radians(-24), 4, Rt).to_quaternion()
    R = 0.135
    for i in range(22):
        a = BACK + 0.55 + (2 * math.pi - 1.1) * i / 21   # open at the forehead, like a real wreath
        local = Vector((R * math.cos(a), R * math.sin(a), 0))
        p = c + tilt @ local
        side = 1 if i % 2 else -1
        q = tilt @ Matrix.Rotation(a + math.pi / 2 + side * 0.5, 4, "Z").to_quaternion() @ Matrix.Rotation(side * 0.6, 4, "X").to_quaternion()
        out.append(obj(f"RK_{tag}_leaf{i}", sphere(), LEAF, p + tilt @ (UP * 0.008 * side), q, (0.048, 0.018, 0.007)))
    out.append(obj(f"RK_{tag}_band", torus(R, 0.006, 56, 8), LEAF, c, tilt))
    return out

def scroll(tag):
    p = Vector((60.06, -0.2, 0.03)) + F * 0.035
    out = [obj(f"RK_{tag}_scroll", cyl(0.026, 0.026, 0.16), CREAM, p, axis_q(Rt))]
    for sd in (-1, 1):
        out.append(obj(f"RK_{tag}_knob{sd}", cyl(0.013, 0.013, 0.03, 16), BROWN, p + Rt * sd * 0.095, axis_q(Rt)))
    out.append(obj(f"RK_{tag}_ribbon", torus(0.028, 0.006, 28, 8), AMB, p, axis_q(Rt)))
    return out

backpack("calouro")
bandana("veterano")
bandana("monitor"); glasses("monitor")
glasses("mestre"); cap("mestre", GOLD)
capelet("filosofo", WHITE, GOLD); scroll("filosofo")
toga("sabio", WHITE, GOLD, GOLD); laurel("sabio")
for o in s.objects:
    if o.name.startswith("RK_"):
        o.hide_render = True
print("kit built")
