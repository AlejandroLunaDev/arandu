"""Dress Sophia: the six things she wears on a chapter of the Caminho tower, skinned to her own armature.

Run it inside Blender after build.py, for example through the Blender MCP:
    import runpy; runpy.run_path("<repo>/blender/sophia/wear.py", run_name="__main__")

Each garment is made on her rest pose, so it needs no unposing (the league outfits, made on a posed cat, do: see
../league/rig.py). Cloth over the body is her own skin, grown out along its normals and given a thickness; every
vertex then takes the weights of the body under it, kept to the bones of its zone. Small hard pieces (lenses, a hard
hat, a stethoscope) follow one bone whole, so they never bend. The garments are "Wear_<name>_<part>", parented to the
armature with an Armature modifier, in the "SophiaWear" collection, rebuilt on every run.
"""

import math

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc

NAME = "Sophia"
COLL = "SophiaWear"
TORSO = {"hips", "spine", "chest", "neck", "upperArmL", "upperArmR", "thighL", "thighR"}
NECK = {"neck", "chest", "head"}


def srgb(hex_color):
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], 1.0)


COLORS = {  # material: color, roughness, metallic
    "WearCoat": ("#FBF8F1", 0.8, 0.0),
    "WearButton": ("#A9A2B4", 0.3, 0.7),
    "WearTube": ("#2E2A38", 0.4, 0.0),
    "WearSteel": ("#C9C4D2", 0.25, 0.9),
    "WearStrap": ("#2E2A38", 0.6, 0.0),
    "WearLens": ("#BFE3EE", 0.05, 0.0),
    "WearHat": ("#F2C94C", 0.35, 0.0),
    "WearTie": ("#C0392B", 0.5, 0.0),
    "WearCollar": ("#FBF8F1", 0.7, 0.0),
    "WearGown": ("#1F1C27", 0.75, 0.0),
    "WearBand": ("#6B3FA0", 0.7, 0.0),
}


def material(name):
    color, roughness, metallic = COLORS[name]
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = srgb(color)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


class Body:
    """Her skin at rest: positions, normals, weights per vertex and a tree to find what lies under a point."""

    def __init__(self):
        self.obj = bpy.data.objects[NAME + "Mesh"]
        me = self.obj.data
        names = {g.index: g.name for g in self.obj.vertex_groups}
        self.weights = [{names[g.group]: g.weight for g in v.groups} for v in me.vertices]
        self.co = [v.co.copy() for v in me.vertices]
        # Her skin only: the lids share the fur's material but are shells round the eyes, not the head's surface.
        lid = lambda i: any(b.startswith("lid") for b in self.weights[i])
        self.polys = [tuple(p.vertices) for p in me.polygons if p.material_index == 0 and not any(lid(i) for i in p.vertices)]
        self.tree = BVHTree.FromPolygons(self.co, self.polys)

    def weights_at(self, p, zone):
        """The skin's weights at the point of the body nearest p, kept to zone's bones, at most four."""
        loc, _, index, _ = self.tree.find_nearest(p)
        poly = self.polys[index]
        mix = {}
        for vi, t in zip(poly, poly_3d_calc([self.co[i] for i in poly], loc)):
            for bone, w in self.weights[vi].items():
                if bone in zone:
                    mix[bone] = mix.get(bone, 0.0) + w * t
        top = sorted(mix.items(), key=lambda kv: kv[1], reverse=True)[:4] or [("chest", 1.0)]
        total = sum(w for _, w in top)
        return {b: w / total for b, w in top}

    def surface(self, inside, direction, lift=0.0):
        """Where a ray from a point inside the body, toward direction, first leaves it; lift further along the normal."""
        d = Vector(direction).normalized()
        hit, normal, _, _ = self.tree.ray_cast(Vector(inside), d)
        if hit is not None and normal.dot(d) < 0:
            normal = -normal
        if hit is None:
            raise RuntimeError("no body along %s from %s" % (tuple(d), tuple(inside)))
        return hit + normal.normalized() * lift, normal.normalized()


def finish(coll, arm, body, name, bm, mat, zone=None, bone=None, thick=0.0):
    """bm becomes Wear_<name>, skinned (to one bone whole, or to the body under it within zone)."""
    if thick:
        bm.normal_update()
        bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=thick)
        # Solidify shoots a vertex off where the hem is a sliver: drop any that left the body.
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if body.tree.find_nearest(v.co)[3] > 0.04], context="VERTS")
    me = bpy.data.meshes.new("Wear_" + name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(material(mat))
    for p in me.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new("Wear_" + name, me)
    coll.objects.link(obj)
    groups = {}
    for v in me.vertices:
        for b, w in ({bone: 1.0} if bone else body.weights_at(v.co, zone)).items():
            if b not in groups:
                groups[b] = obj.vertex_groups.new(name=b)
            groups[b].add([v.index], w, "REPLACE")
    obj.parent = arm
    obj.modifiers.new("Armature", "ARMATURE").object = arm
    return obj


def shell(body, keep, offset):
    """Her fur faces whose vertices all pass keep(position, weights), grown out by offset: cloth that hugs her."""
    bm = bmesh.new()
    bm.from_mesh(body.obj.data)
    bm.normal_update()
    ok = [keep(body.co[i], body.weights[i]) for i in range(len(body.co))]
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index != 0 or not all(ok[v.index] for v in f.verts)], context="FACES_ONLY")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    for v in bm.verts:
        v.co += v.normal * offset
    for v in bm.verts:  # soften the hem a little
        if v.is_boundary:
            v.co += v.normal * offset * 0.5
    # A vertex on a sliver of the hem can carry a wild normal and shoot off: drop whatever left the body.
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if body.tree.find_nearest(v.co)[3] > offset * 3], context="VERTS")
    return bm


def share(w, bones):
    return sum(x for b, x in w.items() if b in bones)


def ring(body, centre, axis, lift, n=48):
    """A loop round the body: in the plane through centre normal to axis, lift out from the skin."""
    axis = Vector(axis).normalized()
    a = axis.orthogonal().normalized()
    b = axis.cross(a)
    return [body.surface(centre, a * math.cos(2 * math.pi * i / n) + b * math.sin(2 * math.pi * i / n), lift)[0] for i in range(n)]


def tube_bm(points, radius, closed=True, sides=10):
    bm = bmesh.new()
    pts = [Vector(p) for p in points]
    count = len(pts)
    rings = []
    for i, p in enumerate(pts):
        t = (pts[(i + 1) % count] - pts[i - 1]) if closed else (pts[min(i + 1, count - 1)] - pts[max(i - 1, 0)])
        t.normalize()
        n = t.orthogonal().normalized()
        bb = t.cross(n)
        r = radius(i / (count - 1)) if callable(radius) else radius
        rings.append([bm.verts.new(p + (n * math.cos(2 * math.pi * s / sides) + bb * math.sin(2 * math.pi * s / sides)) * r) for s in range(sides)])
    for i in range(count if closed else count - 1):
        a, c = rings[i], rings[(i + 1) % count]
        for s in range(sides):
            bm.faces.new((a[s], a[(s + 1) % sides], c[(s + 1) % sides], c[s]))
    if not closed:
        for r in (rings[0], rings[-1]):
            bm.faces.new(r if r is rings[-1] else list(reversed(r)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def blob_bm(centre, radii, turn=None, seg=24, rings=12):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * radii[0], v.co.y * radii[1], v.co.z * radii[2]))
        if turn is not None:
            v.co = turn @ v.co
        v.co += Vector(centre)
    return bm


def merge(*bms):
    """One bmesh from several."""
    out = bmesh.new()
    for bm in bms:
        me = bpy.data.meshes.new("tmp")
        bm.to_mesh(me)
        out.from_mesh(me)
        bpy.data.meshes.remove(me)
        bm.free()
    return out


# ---------------------------------------------------------------- the garments

NECK_AT, NECK_AXIS = Vector((0.13, 0, 0.27)), Vector((0.55, 0, 0.85))  # where her neck meets her chest, and its way


def chest_line(body, ys=(0.0,), zs=None, lift=0.006):
    """Points down the front of her chest, from under the chin."""
    zs = zs or [0.27 - 0.012 * i for i in range(12)]
    return [[body.surface((0.03, y, z), (1, y * 4, 0), lift)[0] for z in zs] for y in ys]


def coat(coll, arm, body):
    """The white lab coat: her torso in cloth, open at the front under a collar, three buttons, a pocket."""
    def keep(p, w):
        open_front = p.x > 0.11 and abs(p.y) < 0.022 and p.z < 0.23
        return share(w, TORSO) > 0.55 and w.get("head", 0) < 0.2 and p.x > -0.17 and p.z > 0.07 and not open_front
    out = [finish(coll, arm, body, "coat_cloth", shell(body, keep, 0.008), "WearCoat", zone=TORSO, thick=0.004)]
    out.append(finish(coll, arm, body, "coat_collar", tube_bm(ring(body, NECK_AT, NECK_AXIS, 0.012), 0.009), "WearCoat", zone=NECK))
    line = chest_line(body, ys=(0.03,), zs=[0.22, 0.18, 0.14], lift=0.014)[0]
    out.append(finish(coll, arm, body, "coat_buttons", merge(*[blob_bm(p, (0.005, 0.005, 0.005)) for p in line]), "WearButton", bone="chest"))
    at, n = body.surface((0.03, -0.06, 0.2), (0.4, -1, 0), 0.016)
    pocket = bmesh.new()
    bmesh.ops.create_cube(pocket, size=1.0)
    side = n.cross(Vector((0, 0, 1))).normalized()
    for v in pocket.verts:
        v.co = at + side * v.co.x * 0.035 + Vector((0, 0, 1)) * v.co.y * 0.03 + n * v.co.z * 0.004
    out.append(finish(coll, arm, body, "coat_pocket", pocket, "WearCoat", bone="chest"))
    return out


def stethoscope(coll, arm, body):
    """Round her neck: the tube, its two ends meeting on her chest in a Y, the steel chest piece."""
    loop = ring(body, NECK_AT + Vector((0, 0, -0.01)), NECK_AXIS, 0.016)
    front = chest_line(body, zs=[0.235, 0.205, 0.175, 0.15, 0.13], lift=0.02)[0]
    hang = tube_bm(front, 0.006, closed=False)
    piece = blob_bm(front[-1] + Vector((0.008, 0, -0.014)), (0.01, 0.024, 0.024))
    return [finish(coll, arm, body, "steth_tube", merge(tube_bm(loop, 0.006), hang), "WearTube", bone="chest"),
            finish(coll, arm, body, "steth_piece", piece, "WearSteel", bone="chest")]


def goggles(coll, arm, body):
    """Lab goggles pushed up on her forehead: a strap round her head and two round lenses in front."""
    head = Vector((0.235, 0, 0.36))
    strap = tube_bm(ring(body, head + Vector((0, 0, 0.04)), (-0.25, 0, 1), 0.006), 0.007)
    lenses, rims = [], []
    for s in (1, -1):
        at, n = body.surface(head, (1, 0.4 * s, 0.6), 0.016)
        turn = n.to_track_quat("Z", "Y").to_matrix()
        lenses.append(blob_bm(at, (0.034, 0.034, 0.014), turn=turn))
        rims.append(tube_bm([at + turn @ Vector((0.036 * math.cos(a), 0.036 * math.sin(a), -0.002))
                             for a in (2 * math.pi * i / 32 for i in range(32))], 0.006))
    return [finish(coll, arm, body, "goggles_strap", merge(strap, *rims), "WearStrap", bone="head"),
            finish(coll, arm, body, "goggles_lens", merge(*lenses), "WearLens", bone="head")]


def hard_hat(coll, arm, body):
    """A yellow hard hat on her crown, tipped forward, its brim all round; her ears come out through it."""
    top, n = body.surface(Vector((0.235, 0, 0.36)), (0.25, 0, 1), -0.012)
    turn = n.to_track_quat("Z", "Y").to_matrix()
    dome = blob_bm((0, 0, 0), (0.075, 0.08, 0.055))
    bmesh.ops.delete(dome, geom=[v for v in dome.verts if v.co.z < -0.001], context="VERTS")
    brim = blob_bm((0, 0, 0), (0.095, 0.098, 0.006))
    ridge = blob_bm((0, 0, 0.012), (0.08, 0.012, 0.05))
    bm = merge(dome, brim, ridge)
    for v in bm.verts:
        v.co = top + turn @ v.co
    return [finish(coll, arm, body, "hat", bm, "WearHat", bone="head")]


def tie(coll, arm, body):
    """A white shirt collar round her neck and a red tie down her chest."""
    collar = tube_bm(ring(body, NECK_AT, NECK_AXIS, 0.008), 0.007)
    line = chest_line(body, zs=[0.245 - 0.011 * i for i in range(14)], lift=0.01)[0]
    width = lambda t: 0.012 + 0.016 * min(1.0, t * 1.4) * (1 - max(0.0, (t - 0.85) / 0.15) ** 2)
    blade = tube_bm(line, width, closed=False, sides=8)
    knot = blob_bm(line[0] + Vector((0.004, 0, 0.004)), (0.01, 0.014, 0.012))
    return [finish(coll, arm, body, "tie_collar", collar, "WearCollar", zone=NECK),
            finish(coll, arm, body, "tie_blade", merge(blade, knot), "WearTie", zone={"chest", "neck", "spine"})]


def gown(coll, arm, body):
    """The black gown of the courts over her torso, a violet band at the neck and a white jabot at the throat."""
    def keep(p, w):
        return share(w, TORSO) > 0.45 and w.get("head", 0) < 0.25 and p.x > -0.18 and p.z > 0.05
    band = tube_bm(ring(body, NECK_AT, NECK_AXIS, 0.016), 0.011)
    line = chest_line(body, zs=[0.245, 0.225, 0.205], lift=0.02)[0]
    jabot = merge(*[blob_bm(p + Vector((0, y, 0)), (0.006, 0.012, 0.02)) for p in line[:1] for y in (-0.009, 0.009)])
    return [finish(coll, arm, body, "gown_cloth", shell(body, keep, 0.012), "WearGown", zone=TORSO, thick=0.005),
            finish(coll, arm, body, "gown_band", band, "WearBand", zone=NECK),
            finish(coll, arm, body, "gown_jabot", jabot, "WearCollar", bone="chest")]


GARMENTS = {"coat": coat, "stethoscope": stethoscope, "goggles": goggles, "hard_hat": hard_hat, "tie": tie, "gown": gown}


def reset_collection():
    coll = bpy.data.collections.get(COLL)
    if coll:
        for o in list(coll.objects):
            data = o.data
            bpy.data.objects.remove(o)
            if data is not None and data.users == 0:
                bpy.data.meshes.remove(data)
    else:
        coll = bpy.data.collections.new(COLL)
        bpy.context.scene.collection.children.link(coll)
    return coll


def wear(arm=None):
    """Every garment, as {name: [objects]}. All are visible: hide the ones a look does not need."""
    arm = arm or bpy.data.objects[NAME]
    coll = reset_collection()
    body = Body()
    out = {name: make(coll, arm, body) for name, make in GARMENTS.items()}
    print("Sophia's wear: " + ", ".join("%s %d" % (k, len(v)) for k, v in out.items()))
    return out


if __name__ == "__main__":
    wear()
