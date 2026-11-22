# Renders each rank cat (transparent PNG) from RankCam, then restores the window scene and camera.
import bpy, os
s = bpy.data.scenes["AranduPaw"]
cam = bpy.data.objects["RankCam"]
HERE = os.path.dirname(os.path.abspath(__file__))  # run through runpy.run_path, which sets __file__
OUT = os.path.join(HERE, "out")
RANKS = ["calouro", "veterano", "monitor", "mestre", "filosofo", "sabio"]
SIZE = globals().get("SIZE", 500)
w = bpy.context.window
prev, pc, rx, ry = w.scene, s.camera, s.render.resolution_x, s.render.resolution_y
w.scene = s; s.camera = cam; s.render.resolution_x = s.render.resolution_y = SIZE; s.frame_set(30)
try:
    for r in globals().get("ONLY", RANKS):
        for o in s.objects:
            if o.name.startswith("RK_"):
                o.hide_render = not o.name.startswith(f"RK_{r}_")
        s.render.filepath = os.path.join(OUT, f"rank-{r}.png")
        bpy.ops.render.render(write_still=True)
finally:
    for o in s.objects:
        if o.name.startswith("RK_"):
            o.hide_render = True
    s.camera, s.render.resolution_x, s.render.resolution_y = pc, rx, ry
    w.scene = prev
print("rendered")
