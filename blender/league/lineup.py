# Viewport-only lineup: six dressed copies of the rank cat at x ~ 70, labelled. Never rendered.
import bpy, math
from mathutils import Vector
s = bpy.data.scenes["AranduPaw"]
RANKS = ["calouro", "veterano", "monitor", "mestre", "filosofo", "sabio"]
NAMES = ["Calouro", "Veterano", "Monitor", "Mestre", "Filósofo", "Sábio"]
for o in [o for o in s.objects if o.name.startswith("LINEUP_")]:
    bpy.data.objects.remove(o, do_unlink=True)
arm = bpy.data.objects["RankCat"]; mesh = bpy.data.objects["RankCatMesh"]
for i, r in enumerate(RANKS):
    off = Vector((10 + i * 0.75, 0, 0))
    a = arm.copy(); a.name = f"LINEUP_{r}_cat"; a.location = arm.location + off; s.collection.objects.link(a)
    m = mesh.copy(); m.name = f"LINEUP_{r}_mesh"; m.parent = a; m.matrix_parent_inverse = mesh.matrix_parent_inverse.copy()
    for md in m.modifiers:
        if md.type == "ARMATURE":
            md.object = a
    s.collection.objects.link(m)
    for o in [o for o in s.objects if o.name.startswith(f"RK_{r}_")]:
        c = o.copy(); c.name = "LINEUP_" + o.name[3:]; c.location = o.location + off
        c.hide_viewport = False; c.hide_render = True; s.collection.objects.link(c)
    cu = bpy.data.curves.new(f"LINEUP_{r}_label", "FONT"); cu.body = NAMES[i]; cu.size = 0.07; cu.align_x = "CENTER"
    t = bpy.data.objects.new(f"LINEUP_{r}_label", cu); t.location = Vector((60, 0, 0)) + off + Vector((0, -0.35, 0.0))
    t.rotation_euler = (math.radians(90), 0, 0); t.hide_render = True; s.collection.objects.link(t)
    for o in (a, m):
        o.hide_render = True
for o in s.objects:
    if o.name.startswith("RK_"):
        o.hide_viewport = True
s.frame_set(30)
print("lineup ready")
