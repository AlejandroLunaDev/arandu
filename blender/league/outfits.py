# Outfits from Alejandro's reference image (2026-11-20). Executed after kit.py's helpers.
import bpy, bmesh, math
from mathutils import Vector, Matrix

def velvet(name, hexc, sheen="b07ad0"):
    m = mat(name, hexc, 0.55)
    p = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    for k, v in (("Sheen Weight", 0.45), ("Sheen Roughness", 0.4)):
        if k in p.inputs:
            p.inputs[k].default_value = v
    if "Sheen Tint" in p.inputs:
        p.inputs["Sheen Tint"].default_value = (*srgb(sheen), 1)
    return m

def knit(name, hexc):
    m = velvet(name, hexc)
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    if not any(n.type == "TEX_WAVE" for n in nt.nodes):
        w = nt.nodes.new("ShaderNodeTexWave"); w.inputs["Scale"].default_value = 70; w.inputs["Distortion"].default_value = 2
        b = nt.nodes.new("ShaderNodeBump"); b.inputs["Strength"].default_value = 0.7
        nt.links.new(w.outputs["Fac"], b.inputs["Height"]); nt.links.new(b.outputs["Normal"], p.inputs["Normal"])
    return m

PLUM = velvet("RK_plum", "3a1142", "8a4a9a")
KNIT = knit("RK_knit", "3d1247")
LILAC = velvet("RK_lilac", "7c45b8", "c9a3ef")
SOFTWHITE = velvet("RK_softwhite", "efe8da", "ffffff")

for o in [o for o in bpy.data.objects if o.name.startswith("RK_") and o.name not in ("RK_proxy", "RK_neckproxy")]:
    bpy.data.objects.remove(o, do_unlink=True)

def hard(o):  # thin trims must not be smoothed, or they collapse to nothing
    o.modifiers.remove(o.modifiers["soft"])
    return o

def soften(o, lv=1):
    m = o.modifiers.new("subd", "SUBSURF"); m.levels = lv; m.render_levels = lv
    return o

def mantle_bm(front_z, side_z, back_z, v0=0.0, v1=1.0, top_z=0.25, top_r=0.12, U=96, V=10):
    """A capelet around the neck: top ring at the neck, lower hem dipping to a point at the chest."""
    bm = bmesh.new()
    rows = []
    for j in range(V + 1):
        t = v0 + (v1 - v0) * j / V
        row = []
        for i in range(U):
            a = 2 * math.pi * i / U
            c = math.cos(a)
            zb = back_z + (side_z - back_z) * (1 - abs(c))
            if c > 0:
                zb = side_z + (front_z - side_z) * c ** 3 if c > 0 else zb
            top = C0 + yaw_q() @ Vector((0.06 + c * top_r * 1.15, math.sin(a) * top_r, 0)) + UP * top_z
            bot = C0 + yaw_q() @ Vector((-0.013 + c * 0.21, math.sin(a) * 0.135, 0)) + UP * zb
            row.append(bm.verts.new(top.lerp(bot, t)))
        rows.append(row)
    for j in range(V):
        for i in range(U):
            bm.faces.new((rows[j][i], rows[j][(i + 1) % U], rows[j + 1][(i + 1) % U], rows[j + 1][i]))
    return bm

def mantle(tag, m, front_z, side_z, back_z, off=0.016, thick=0.012, trim=None, **kw):
    out = [soften(fit(obj(f"RK_{tag}_mantle", mantle_bm(front_z, side_z, back_z, **kw), m, Vector()), off, thick))]
    if trim:
        for k, (v0, v1) in enumerate(((0.9, 0.98), (0.8, 0.83))):
            out.append(hard(fit(obj(f"RK_{tag}_trim{k}", mantle_bm(front_z, side_z, back_z, v0, v1, V=2, **kw), trim, Vector()), off + thick + 0.004, 0.005)))
    return out

def shield(name, m, loc, normal, size):
    pts = [(-1, 1), (-0.35, 0.82), (0, 1.05), (0.35, 0.82), (1, 1), (1, 0.15), (0.75, -0.45), (0, -1.1), (-0.75, -0.45), (-1, 0.15)]
    bm = bmesh.new()
    f = bm.faces.new([bm.verts.new((x, y, 0)) for x, y in pts])
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)]:
        v.co.z += 0.25
    n = normal.normalized(); x = UP.cross(n).normalized(); y = n.cross(x)
    q = Matrix((x, y, n)).transposed().to_quaternion()
    o = obj(name, bm, m, loc, q, (size, size, size))
    for p in o.data.polygons:
        p.use_smooth = False
    o.modifiers.new("bev", "BEVEL").width = 0.08
    return o

def crest(tag, loc, normal, size):
    n = normal.normalized()
    out = [shield(f"RK_{tag}_crestrim", GOLD, loc, n, size * 1.14),
           shield(f"RK_{tag}_crest", PLUM, loc + n * size * 0.2, n, size * 0.92)]
    out.append(obj(f"RK_{tag}_crestpen", cyl(size * 0.1, size * 0.02, size * 1.1, 12), GOLD, loc + n * size * 0.45,
                   Matrix.Rotation(math.radians(35), 4, n).to_quaternion() @ axis_q(UP - n * UP.dot(n))))
    return out

def hang(tag, m, top, bottom, width, off=0.03, thick=0.016, stripes=(), fringe=False):
    """A scarf or stole end hanging down the chest."""
    w = Rt * width / 2
    out = [soften(fit(obj(f"RK_{tag}_end", sheet([top - w, top + w, bottom + w, bottom - w], 12), m, Vector()), off, thick))]
    for k, t in enumerate(stripes):
        c = top.lerp(bottom, t); h = (bottom - top) * 0.035
        out.append(hard(fit(obj(f"RK_{tag}_stripe{k}", sheet([c - w * 1.04 - h, c + w * 1.04 - h, c + w * 1.04 + h, c - w * 1.04 + h], 4), GOLD, Vector()), off + thick + 0.002, 0.004)))
    if fringe:
        for i in range(7):
            x = -1 + 2 * i / 6
            out.append(obj(f"RK_{tag}_fringe{i}", cyl(0.005, 0.004, 0.03, 8), GOLD, bottom + w * x * 0.9 + F * (off + 0.03) - UP * 0.012))
    return out

def calouro(tag):  # soft lilac neckerchief with a gold tag, and a little cloth pack on the back
    out = mantle(tag, LILAC, 0.15, 0.19, 0.21, 0.018, 0.012)
    out.append(obj(f"RK_{tag}_tag", cyl(0.02, 0.02, 0.006, 28), GOLD, C0 + F * 0.215 + UP * 0.165, axis_q(F + UP * 0.3)))
    out.append(obj(f"RK_{tag}_tagring", torus(0.008, 0.0025, 16, 6), GOLD, C0 + F * 0.212 + UP * 0.188, axis_q(Rt)))
    pack = C0 - F * 0.2 + Rt * 0.02 + UP * 0.235
    q = Matrix.Rotation(math.radians(-28), 4, Rt).to_quaternion() @ yaw_q()
    out.append(soften(box(f"RK_{tag}_pack", LILAC, pack, q, (0.11, 0.14, 0.09), 0.035), 2))
    out.append(soften(box(f"RK_{tag}_packflap", LILAC, pack + (q @ Vector((0.0, 0, 0.035))), q, (0.085, 0.135, 0.025), 0.01), 1))
    return out

def veterano(tag):  # knitted plum scarf with gold stripes and a hanging end with fringe
    out = mantle(tag, KNIT, 0.19, 0.2, 0.2, 0.022, 0.022, top_z=0.255)
    for k, (v0, v1) in enumerate(((0.25, 0.33), (0.62, 0.7))):
        out.append(hard(fit(obj(f"RK_{tag}_ring{k}", mantle_bm(0.19, 0.2, 0.2, v0, v1, top_z=0.255, V=2), GOLD, Vector()), 0.048, 0.005)))
    out += hang(tag, KNIT, C0 + F * 0.17 + Rt * 0.06 + UP * 0.215, C0 + F * 0.225 + Rt * 0.075 + UP * 0.125, 0.062, 0.04, 0.018, stripes=(0.62, 0.78), fringe=True)
    return out

def monitor(tag):  # plum velvet capelet with gold embroidery and a stole end with a crest
    out = mantle(tag, PLUM, 0.165, 0.17, 0.18, trim=GOLD)
    top = C0 + F * 0.165 + Rt * 0.065 + UP * 0.2
    bot = C0 + F * 0.225 + Rt * 0.08 + UP * 0.12
    out += hang(tag, PLUM, top, bot, 0.058, 0.038, 0.012, stripes=(0.92,))
    out += crest(tag, bot.lerp(top, 0.3) + F * 0.055, F + UP * 0.15, 0.024)
    return out

def mestre(tag):  # longer plum cape pointed at the chest, gold embroidery, a big crest
    out = mantle(tag, PLUM, 0.05, 0.11, 0.13, 0.018, 0.012, trim=GOLD)
    out += crest(tag, C0 + F * 0.245 + UP * 0.115, F + UP * 0.2, 0.034)
    return out

def filosofo(tag):  # soft white mantle over the shoulders, a round gold brooch
    out = mantle(tag, SOFTWHITE, 0.11, 0.12, 0.15, 0.022, 0.03)
    k = C0 + F * 0.235 + UP * 0.19
    n = F + UP * 0.2
    out.append(obj(f"RK_{tag}_brooch", cyl(0.026, 0.026, 0.01, 32), GOLD, k, axis_q(n)))
    out.append(obj(f"RK_{tag}_broochrim", torus(0.026, 0.005, 32, 8), GOLD, k + F * 0.004, axis_q(n)))
    out.append(obj(f"RK_{tag}_gem", sphere(), AMB, k + F * 0.01, None, (0.011, 0.011, 0.008)))
    return out

def sabio(tag):  # long white toga pointed at the chest with gold edges, plus a sash across the body
    out = mantle(tag, SOFTWHITE, 0.03, 0.06, 0.08, 0.02, 0.022, trim=GOLD)
    q = Matrix.Rotation(math.radians(-40), 4, F).to_quaternion()
    out.append(soften(fit(obj(f"RK_{tag}_drape", strip(0.17, 0.07), SOFTWHITE, C0 + UP * 0.15, q), 0.05, 0.02)))
    for sd in (-1, 1):
        out.append(hard(fit(obj(f"RK_{tag}_drapetrim{sd}", strip(0.17, 0.012), GOLD, C0 + UP * 0.15 + (q @ UP) * sd * 0.036, q), 0.071, 0.005)))
    return out

calouro("calouro")
veterano("veterano")
monitor("monitor"); glasses("monitor")
mestre("mestre"); glasses("mestre"); cap("mestre", GOLD)
filosofo("filosofo"); scroll("filosofo")
sabio("sabio"); laurel("sabio")
for o in s.objects:
    if o.name.startswith("RK_"):
        o.hide_render = True
print("outfits built")
