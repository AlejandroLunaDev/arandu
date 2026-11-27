"""The peixinho swimming: a loop of FRAMES renders packed into one sprite strip for the web.

1. Inside Blender (for example through the Blender MCP) it renders the frames to blender/props/renders/fish-swim/:
       import runpy; runpy.run_path("<repo>/blender/props/swim.py", run_name="__main__")
2. Outside Blender, with Pillow, it packs them into apps/web/public/img/props/fish-swim.webp:
       python -I blender/props/swim.py

The fish is shot as render.py shoots fish.png. Its body and tail wave up and down in the picture's plane, from still at
the head to widest at the tail's fork, and it bobs a little: a side view shows a sideways sweep as nothing. The strip
is FRAMES cells side by side, each CELL_H tall, cropped to the union of every frame so the fish never jumps.
"""

import math
import os
import runpy

try:
    import bpy
except ImportError:  # packing, outside Blender
    bpy = None

HERE = os.path.dirname(os.path.abspath(__file__))
FRAMES = 16
CELL_H = 164  # twice fish.webp's height: the room shows the fish up to 120 px wide
OUT = os.path.join(HERE, "renders", "fish-swim")
STRIP = os.path.normpath(os.path.join(HERE, "..", "..", "apps", "web", "public", "img", "props", "fish-swim.webp"))
HEAD, TAIL = 0.05, -0.092  # the fish's nose and its tail's fork, along X (build.py's fish)


def swim(rest, t):
    """The fish's vertices at t in [0, 1) of the loop: a wave running down the body to the tail, and a bob."""
    import numpy as np

    co = rest.copy()
    w = np.clip((HEAD - co[:, 0]) / (HEAD - TAIL), 0.0, 1.0)  # 0 at the nose, 1 at the tail's fork
    turn = 2 * math.pi * t
    co[:, 2] += 0.016 * w**2 * np.sin(turn - 2.4 * w) + 0.003 * math.sin(turn)
    return co


def shoot(file, objs):
    """render.py's shot of the fish, as FRAMES frames: the border widened so the waving tail stays in."""
    import numpy as np

    r = bpy.context.scene.render
    pad = 0.08
    r.border_min_x, r.border_max_x = max(0.0, r.border_min_x - pad), min(1.0, r.border_max_x + pad)
    r.border_min_y, r.border_max_y = max(0.0, r.border_min_y - pad), min(1.0, r.border_max_y + pad)
    me = objs[0].data
    rest = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", rest)
    rest = rest.reshape(-1, 3)
    os.makedirs(OUT, exist_ok=True)
    try:
        for f in range(FRAMES):
            me.vertices.foreach_set("co", swim(rest, f / FRAMES).ravel())
            me.update()
            r.filepath = os.path.join(OUT, "%02d.png" % f)
            bpy.ops.render.render(write_still=True)
    finally:
        me.vertices.foreach_set("co", rest.ravel())
        me.update()
    print("Fish: rendered %d frames to %s" % (FRAMES, OUT))


def pack():
    from PIL import Image

    frames = [Image.open(os.path.join(OUT, "%02d.png" % f)).convert("RGBA") for f in range(FRAMES)]
    boxes = [im.getchannel("A").getbbox() for im in frames]
    box = (min(b[0] for b in boxes) - 4, min(b[1] for b in boxes) - 4, max(b[2] for b in boxes) + 4, max(b[3] for b in boxes) + 4)
    w = round((box[2] - box[0]) * CELL_H / (box[3] - box[1]))
    strip = Image.new("RGBA", (w * FRAMES, CELL_H))
    for i, im in enumerate(frames):
        strip.paste(im.crop(box).resize((w, CELL_H), Image.LANCZOS), (i * w, 0))
    strip.save(STRIP, quality=86, method=6)
    print("Fish: wrote %s (%d cells of %dx%d, %d KB)" % (STRIP, FRAMES, w, CELL_H, os.path.getsize(STRIP) // 1024))


if __name__ == "__main__":
    if bpy:
        runpy.run_path(os.path.join(HERE, "render.py"))["render_all"](only=["fish"], shoot=shoot)
    else:
        pack()
