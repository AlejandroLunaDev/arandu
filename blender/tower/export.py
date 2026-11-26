"""Build the cat tower's kit and write public/models/tower.glb.

Run it inside Blender, for example through the Blender MCP:
    import runpy; runpy.run_path("<repo>/blender/tower/export.py", run_name="__main__")

Every module of the kit is a root node of the GLB, at its bay's origin, named as in build.py: the web clones the
ones a bay needs and places them with the bay's transform (apps/web/src/caminho/tower-scene.ts). A module Arandu
can sit on carries two child nodes, "<name>Seat" and "<name>Sign". The plush and sisal normal maps travel in the
file. Geometry is Draco-compressed: load it with DRACOLoader.
"""

import os
import runpy

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "apps", "web", "public", "models", "tower.glb"))


def export(path=OUT):
    tower = runpy.run_path(os.path.join(HERE, "build.py"), run_name="tower")
    tower["build"]()
    mods = [o for o in bpy.data.collections[tower["KIT"]].objects if o.parent is None]
    layout = {obj: obj.location.copy() for obj in mods}
    bpy.ops.object.select_all(action="DESELECT")
    for obj in mods:
        obj.location = (0, 0, 0)
        for o in [obj] + list(obj.children):
            o.select_set(True)
    bpy.context.view_layer.objects.active = mods[0]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    try:
        bpy.ops.export_scene.gltf(
            filepath=path,
            use_selection=True,
            export_format="GLB",
            export_apply=True,  # bakes the weighted normals
            export_animations=False,
            export_image_format="JPEG",  # the two normal maps: a third of their PNG size
            export_jpeg_quality=90,
            export_draco_mesh_compression_enable=True,
        )
    finally:
        for obj, at in layout.items():
            obj.location = at
    print("Tower: wrote %s (%d KB, %d modules)" % (path, os.path.getsize(path) // 1024, len(mods)))
    return path


if __name__ == "__main__":
    export()
