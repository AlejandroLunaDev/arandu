"""Turn the league outfits into clothes that move with Arandu: skinned meshes on his own armature.

The outfits (outfits.py, cloth.py, v3.py) are static meshes named RK_<league>_<part>, fit to the cat
"RankCat" in the AranduPaw scene, sitting at frame 30 of the "sit" clip. For each piece this script:

1. takes its evaluated mesh (modifiers applied) at that pose, in RankCat's armature space;
2. gives every vertex the weights of the body under it (the nearest point of RankCatMesh), kept to
   the bones of the piece's zone, so a cape never follows a leg; a small hard piece (lenses, a cap, a
   leaf, a buckle) follows one bone whole, so it never bends;
3. undoes that pose (inverse skinning), so the piece sits on the armature's rest pose;
4. makes it "Outfit_<league>_<part>", parented to the armature `arm` with an Armature modifier.

arandu/export.py calls rig(arm) after building and animating Arandu, and writes the outfits into
arandu.glb; the web shows only the person's league's. Needs the dressed AranduPaw scene (see
scene.py's header). check(arm) measures, on every frame of every clip, how far the body comes
through each outfit.
"""

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc

LEAGUES = ("calouro", "veterano", "monitor", "mestre", "filosofo", "sabio")
FIT_FRAME = 30
COLL = "Outfits"

HEAD = {"head"}
NECK = {"head", "neck", "chest"}
TORSO = {"hips", "spine", "chest", "neck", "upperArmL", "upperArmR"}
# Worn on the head, hard: they follow the head bone whole.
ON_HEAD = ("bridge", "lens", "cap", "tcap", "tcord", "tknot", "tthread", "leaf")
# Round the neck: the neck, the head above it and the chest under it.
ON_NECK = ("collar", "roll", "end", "ribbon", "tag", "tagrim", "dring", "buckle", "brooch", "broochrim", "gem", "knob")
# Within HUG (m) of the body a vertex takes the skin's own weights; past FREE only its zone's.
HUG = 0.015
FREE = 0.05
# Bones no garment follows: legs and tail move away from the clothes, and would drag them along.
LOOSE = ("tail", "foreArm", "paw", "thigh", "shin", "foot")
# Left out of the web's outfits: the filosofo's scroll (its knobs and ring), which lay loose on the floor.
LEFT_OUT = {"filosofo": ("scroll", "knob", "ribbon"), "veterano": ("end", "roll")}
# The veterano wears the mestre's stole and its crests, without his glasses and cap.
BORROWED = {"veterano": ("mestre", ("mantle", "crest"))}
# Pieces that sat off the cloth they belong on, moved onto it (the nearest point of that piece, PIN_GAP out): the
# calouro's tag hung a few centimetres in front of its bib.
PINNED = {"calouro": (("tag", "tagrim"), "bib")}
PIN_GAP = 0.006
# What hangs and swings: per league, groups of parts that hang from one point. Each group gets its own
# bone, "dangle_<league>_<n>", under the bone it hangs from; the web swings it on a spring (cat.ts).
DANGLE = {
    "monitor": [("end", "crest")],
    "mestre": [("tcord", "tknot", "tthread")],
}
# A piece smaller than this (m, its box's diagonal) is hard: it follows its main bone whole.
HARD = 0.12


def zone(part):
    if part.startswith(ON_HEAD):
        return HEAD
    if part.startswith(ON_NECK):
        return NECK
    return TORSO


def pieces():
    paw = bpy.data.scenes["AranduPaw"]
    for o in paw.objects:
        bits = o.name.split("_", 2)
        if o.type == "MESH" and len(bits) == 3 and bits[0] == "RK" and bits[1] in LEAGUES and not bits[2].startswith(LEFT_OUT.get(bits[1], ())):
            yield bits[1], bits[2], o
        for league, (lender, parts) in BORROWED.items():
            if o.type == "MESH" and len(bits) == 3 and bits[1] == lender and bits[2].startswith(parts):
                yield league, bits[2], o


def skin_matrices(arm):
    """Each bone's skinning matrix at the current pose, in the armature's space."""
    return {pb.name: pb.matrix @ pb.bone.matrix_local.inverted() for pb in arm.pose.bones}


def rig(arm):
    paw = bpy.data.scenes["AranduPaw"]
    rank = bpy.data.objects["RankCat"]
    body = bpy.data.objects["RankCatMesh"]
    # animate.py rebuilds the clips: point RankCat at the new "sit".
    rank.animation_data.action = bpy.data.actions["sit"]
    try:
        rank.animation_data.action_slot = rank.animation_data.action_suitable_slots[0]
    except (AttributeError, IndexError):
        pass

    coll = bpy.data.collections.get(COLL)
    if coll:
        for o in list(coll.objects):
            me = o.data
            bpy.data.objects.remove(o)
            if me and me.users == 0:
                bpy.data.meshes.remove(me)
    else:
        coll = bpy.data.collections.new(COLL)
    scene = arm.users_scene[0]
    if coll.name not in scene.collection.children:
        scene.collection.children.link(coll)

    win = bpy.context.window
    prev = win.scene
    win.scene = paw
    made = []
    hangs = {}
    pins = {}
    try:
        paw.frame_set(FIT_FRAME)
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        to_arm = rank.matrix_world.inverted()
        skins = skin_matrices(rank)

        # The body at the fit pose, in armature space, and each vertex's weights.
        be = body.evaluated_get(dg)
        bm = be.to_mesh()
        bm.calc_loop_triangles()
        bw = body.matrix_world
        verts = [to_arm @ (bw @ v.co) for v in bm.vertices]
        tris = [tuple(t.vertices) for t in bm.loop_triangles]
        be.to_mesh_clear()
        tree = BVHTree.FromPolygons(verts, tris)
        names = {g.index: g.name for g in body.vertex_groups}
        weights = [{names[g.group]: g.weight for g in v.groups if g.weight > 0 and names[g.group] in skins} for v in body.data.vertices]

        for league, part, o in pieces():
            allowed = zone(part)
            oe = o.evaluated_get(dg)
            me = bpy.data.meshes.new_from_object(oe, preserve_all_data_layers=True, depsgraph=dg)
            me.name = "Outfit_%s_%s" % (league, part)
            pts = [to_arm @ (o.matrix_world @ v.co) for v in me.vertices]
            pin = PINNED.get(league)
            if pin and part.startswith(pin[0]):
                if league not in pins:
                    cloth = paw.objects["RK_%s_%s" % (league, pin[1])].evaluated_get(dg)
                    cm = cloth.to_mesh()
                    cm.calc_loop_triangles()
                    cloth_tree = BVHTree.FromPolygons([to_arm @ (cloth.matrix_world @ v.co) for v in cm.vertices], [tuple(t.vertices) for t in cm.loop_triangles])
                    cloth.to_mesh_clear()
                    first = paw.objects["RK_%s_%s" % (league, pin[0][0])]
                    fv = [to_arm @ (first.matrix_world @ v.co) for v in first.data.vertices]
                    mid = sum(fv, Vector()) / len(fv)
                    hit, normal, _, _ = cloth_tree.find_nearest(mid)
                    # Out of the cloth on the side the piece was, so it sits on it, not in it.
                    if (mid - hit).dot(normal) < 0:
                        normal = -normal
                    pins[league] = hit + normal * PIN_GAP - mid
                pts = [q + pins[league] for q in pts]

            per = []
            for p in pts:
                hit, _, index, dist = tree.find_nearest(p)
                w = {}
                if hit is not None:
                    tri = tris[index]
                    bary = poly_3d_calc([verts[i] for i in tri], hit)
                    # Close to the body it moves exactly as the skin under it, so the body never comes through;
                    # farther out (what hangs) it keeps to its zone's bones, so a leg never drags it.
                    t = min(1.0, max(0.0, (dist - HUG) / (FREE - HUG)))
                    for i, bw_ in zip(tri, bary):
                        for name, gw in weights[i].items():
                            if name.startswith(LOOSE):
                                continue
                            k = 1.0 if name in allowed else 1.0 - t
                            w[name] = w.get(name, 0.0) + bw_ * gw * k
                total = sum(w.values())
                if total <= 1e-6:
                    # Nothing of its zone under it: the zone's bone nearest to it.
                    near = min(allowed, key=lambda n: (rank.pose.bones[n].head - p).length)
                    w = {near: 1.0}
                else:
                    w = {n: v / total for n, v in w.items() if v / total > 0.01}
                    t2 = sum(w.values())
                    w = {n: v / t2 for n, v in w.items()}
                per.append(w)

            lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
            hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
            group = next((i for i, g in enumerate(DANGLE.get(league, ())) if part.startswith(g)), None)
            if group is not None:
                key = (league, group)
                if key not in hangs:
                    # It hangs from the bone of its zone's middle: the head (the tassel), the neck (a tag, a
                    # stole's end), else the chest.
                    parent = "head" if allowed is HEAD else "neck" if allowed is NECK else "chest"
                    inv = skins[parent].inverted()
                    hangs[key] = {"parent": parent, "head": inv @ max(pts, key=lambda q: q.z), "low": inv @ min(pts, key=lambda q: q.z), "obs": []}
                per = [{hangs[key]["parent"]: 1.0} for _ in per]
            elif allowed is HEAD:
                per = [{"head": 1.0} for _ in per]
            elif (hi - lo).length < HARD:
                # A hard piece moves whole: one set of weights for all of it, the average of its own, so it never
                # bends and a badge rides its mantle.
                one = {}
                for w in per:
                    for name, v in w.items():
                        one[name] = one.get(name, 0.0) + v
                total = sum(one.values())
                one = {n: v / total for n, v in one.items() if v / total > 0.01}
                t2 = sum(one.values())
                one = {n: v / t2 for n, v in one.items()}
                per = [dict(one) for _ in per]

            # Undo the pose: each vertex back to where its bones put it at rest.
            rest = []
            for p, w in zip(pts, per):
                m = Matrix(((0.0,) * 4,) * 4)
                for n, v in w.items():
                    m += skins[n] * v
                rest.append(m.inverted() @ p)
            me.vertices.foreach_set("co", [c for r in rest for c in r])
            me.update()

            name = "Outfit_%s_%s" % (league, part)
            stale = bpy.data.objects.get(name)
            if stale:
                bpy.data.objects.remove(stale)
            ob = bpy.data.objects.new(name, me)
            coll.objects.link(ob)
            ob.parent = arm
            groups = {}
            for i, w in enumerate(per):
                for n, v in w.items():
                    g = groups.get(n) or ob.vertex_groups.new(name=n)
                    groups[n] = g
                    g.add([i], v, "REPLACE")
            mod = ob.modifiers.new("Armature", "ARMATURE")
            mod.object = arm
            made.append(ob)
            if group is not None:
                hangs[key]["obs"].append(ob)
        dangle(arm, hangs)
    finally:
        win.scene = prev
    print("Outfits: %d pieces, %d vertices" % (len(made), sum(len(o.data.vertices) for o in made)))
    return made


def dangle(arm, hangs):
    """A bone for each hanging group, from its top to its lowest point, under the bone it hangs from; the
    group's vertices follow it whole. At rest it changes nothing: the group sat rigid on that parent."""
    win = bpy.context.window
    prev = win.scene
    win.scene = arm.users_scene[0]
    layer = bpy.context.view_layer
    keep = layer.objects.active
    layer.objects.active = arm
    names = {}
    bpy.ops.object.mode_set(mode="EDIT")
    try:
        bones = arm.data.edit_bones
        for b in [b for b in bones if b.name.startswith("dangle_")]:
            bones.remove(b)
        for (league, n), h in hangs.items():
            name = "dangle_%s_%d" % (league, n)
            b = bones.new(name)
            b.head = h["head"]
            tail = h["low"]
            if (tail - b.head).length < 0.01:
                tail = b.head - Vector((0.0, 0.0, 0.03))
            b.tail = tail
            b.parent = bones[h["parent"]]
            b.use_deform = True
            names[(league, n)] = name
    finally:
        bpy.ops.object.mode_set(mode="OBJECT")
        layer.objects.active = keep
        win.scene = prev
    for key, h in hangs.items():
        for ob in h["obs"]:
            for g in list(ob.vertex_groups):
                ob.vertex_groups.remove(g)
            ob.vertex_groups.new(name=names[key]).add(list(range(len(ob.data.vertices))), 1.0, "REPLACE")


def _signed(tree, ob, dg):
    """Each vertex of an outfit piece: its signed distance (m) to the body, + outside, - inside."""
    oe = ob.evaluated_get(dg)
    om = oe.to_mesh()
    out = []
    for v in om.vertices:
        p = ob.matrix_world @ v.co
        hit, normal, _, dist = tree.find_nearest(p)
        out.append(0.0 if hit is None else (dist if (p - hit).dot(normal) >= 0 else -dist))
    oe.to_mesh_clear()
    return out


def _body_tree(body, dg):
    be = body.evaluated_get(dg)
    bm = be.to_mesh()
    bm.calc_loop_triangles()
    tree = BVHTree.FromPolygons([body.matrix_world @ v.co for v in bm.vertices], [tuple(t.vertices) for t in bm.loop_triangles])
    be.to_mesh_clear()
    return tree


CLIPS = ("sit", "walk", "jump", "tap", "read", "lie", "startle", "arch", "stretch")


def _play(arm, action):
    arm.animation_data.action = action
    try:
        arm.animation_data.action_slot = arm.animation_data.action_suitable_slots[0]
    except (AttributeError, IndexError):
        pass


def check(arm, outfits, step=2):
    """Where the body comes out through the clothes, over every frame of every clip. A garment's vertex
    that lies outside the body at the fit pose (sit, frame 30) and goes behind the body's surface on a
    frame lets the body show through there. For each (league, piece, clip): the deepest such crossing (m)
    and the share of the piece's vertices that cross."""
    body = next(o for o in arm.children if o.type == "MESH" and not o.name.startswith("Outfit_"))
    scene = arm.users_scene[0]
    win = bpy.context.window
    prev = win.scene
    keep = (arm.animation_data.action, scene.frame_current)
    win.scene = scene
    report = {}
    try:
        _play(arm, bpy.data.actions["sit"])
        scene.frame_set(FIT_FRAME)
        dg = bpy.context.evaluated_depsgraph_get()
        tree = _body_tree(body, dg)
        base = {ob.name: _signed(tree, ob, dg) for ob in outfits}
        for action in [bpy.data.actions[n] for n in CLIPS if n in bpy.data.actions]:
            _play(arm, action)
            f0, f1 = (int(v) for v in action.frame_range)
            for f in range(f0, f1 + 1, step):
                scene.frame_set(f)
                dg = bpy.context.evaluated_depsgraph_get()
                tree = _body_tree(body, dg)
                for ob in outfits:
                    now = _signed(tree, ob, dg)
                    crossed = [-d for d, d0 in zip(now, base[ob.name]) if d0 > 0.001 and d < 0]
                    key = (ob.name.split("_")[1], ob.name.split("_", 2)[2], action.name)
                    r = report.get(key, [0.0, 0.0, f])
                    deep = max(crossed, default=0.0)
                    if deep > r[0]:
                        r[2] = f
                    report[key] = [max(r[0], deep), max(r[1], len(crossed) / max(1, len(now))), r[2]]
    finally:
        _play(arm, keep[0]) if keep[0] else None
        scene.frame_set(keep[1])
        win.scene = prev
    return report
