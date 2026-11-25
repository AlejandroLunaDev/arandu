# Rebuilds the isolated "AranduPaw" scene used for the league-rank renders and the reward box.
# It never touches the user's room scene and never saves the .blend.
#
# Needs Arandu already in the open .blend (objects "Arandu" and "AranduMesh", action "sit"), as
# ../arandu/build.py and animate.py make them. Run everything through the Blender MCP with runpy, so
# each script finds its own folder. kit, outfits, cloth and v3 share helpers, so they run in one
# namespace:
#
#   import runpy; L = "<repo>/blender/league/"
#   runpy.run_path(L + "scene.py")
#   g = runpy.run_path(L + "kit.py")
#   for f in ("outfits.py", "cloth.py", "v3.py"): g = runpy.run_path(L + f, init_globals=g)
#   g["dress_v3"]()
#   runpy.run_path(L + "render.py")            # out/rank-<rank>.png, one per league
#
# The garment textures come first, from tex.py with system Python (`python -I tex.py`, PIL).
# Reward box: box.py (stills), then box_anim.py and box_fx.py (frames), then `python -I pack.py`
# (strips for the canvas, using glow.py). lineup.py only lays the six cats out in the viewport.
import bpy, math

s = bpy.data.scenes.get("AranduPaw") or bpy.data.scenes.new("AranduPaw")
for n in ["RankCat", "RankCatMesh", "RankCam", "RankKey", "RankFill", "RankRim"]:
    o = bpy.data.objects.get(n)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)

w = bpy.data.worlds.get("PawWorld") or bpy.data.worlds.new("PawWorld")
w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (0.05, 0.035, 0.08, 1); bg.inputs[1].default_value = 0.6
s.world = w

r = s.render
for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        r.engine = eng; break
    except TypeError:
        pass
r.film_transparent = True
r.image_settings.file_format = "PNG"
r.image_settings.color_mode = "RGBA"
s.view_settings.view_transform = "Standard"

src_a = bpy.data.objects["Arandu"]; src_m = bpy.data.objects["AranduMesh"]
a = src_a.copy(); a.name = "RankCat"
a.animation_data_create(); a.animation_data.action = bpy.data.actions["sit"]
try:
    a.animation_data.action_slot = a.animation_data.action_suitable_slots[0]
except Exception as e:
    print("slot", e)
a.location = (60, 0, 0); a.rotation_euler = (0, 0, -math.pi / 2 + 0.5)
s.collection.objects.link(a)
m = src_m.copy(); m.name = "RankCatMesh"; m.parent = a
for md in m.modifiers:
    if md.type == "ARMATURE":
        md.object = a
s.collection.objects.link(m)

cd = bpy.data.cameras.new("RankCam"); cd.type = "ORTHO"; cd.ortho_scale = 0.95
cam = bpy.data.objects.new("RankCam", cd); s.collection.objects.link(cam)
cam.location = (60, -6, 0.93); cam.rotation_euler = (math.radians(84), 0, 0)

def area(name, loc, energy, size, rot):
    ld = bpy.data.lights.new(name, "AREA"); ld.energy = energy; ld.size = size
    o = bpy.data.objects.new(name, ld); o.location = loc; o.rotation_euler = rot
    s.collection.objects.link(o)

area("RankKey", (61.5, -2.5, 2.0), 220, 2.0, (math.radians(50), 0, math.radians(30)))
area("RankFill", (58.3, -2.5, 0.8), 70, 2.5, (math.radians(70), 0, math.radians(-35)))
area("RankRim", (60.4, 2.2, 1.6), 160, 1.5, (math.radians(-55), 0, math.radians(10)))
s.frame_set(30)
print("scene ready", r.engine)
