"""Build Arandu, key its clips and write public/models/arandu.glb.

Run it inside Blender, for example through the Blender MCP:
    import runpy; runpy.run_path("<repo>/blender/arandu/export.py", run_name="__main__")

The GLB keeps the "_fur" and "_comb" vertex attributes the web fur shells read, one skin and the
clips sit, walk, jump, tap, read, lie, startle, arch and stretch. Geometry is Draco-compressed: load it with DRACOLoader.

arandu-dressed.glb is the same cat with the six league outfits, "Outfit_<league>_<part>", skinned to the same armature by
../league/rig.py (which needs the dressed AranduPaw scene, see ../league/scene.py), and the bones their
hanging parts swing on, "dangle_<league>_<n>". The app loads it and shows only the person's league's;
the landing, where nobody has a league, keeps the light one.
"""

import json
import os
import runpy
import struct

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.normpath(os.path.join(HERE, "..", "..", "apps", "web", "public", "models"))
OUT = os.path.join(MODELS, "arandu.glb")
DRESSED = os.path.join(MODELS, "arandu-dressed.glb")


def export(path=OUT):
    arm, mesh = runpy.run_path(os.path.join(HERE, "build.py"))["build"]()
    runpy.run_path(os.path.join(HERE, "animate.py"))["animate"](arm)
    write(arm, mesh, path)
    return write(arm, mesh, DRESSED, dressed=True)


def write(arm, mesh, path=OUT, dressed=False):
    outfits = runpy.run_path(os.path.join(HERE, "..", "league", "rig.py"))["rig"](arm) if dressed else []
    # Selected objects in other scenes export too: clear every view layer first.
    for scene in bpy.data.scenes:
        for layer in scene.view_layers:
            for o in scene.objects:
                o.select_set(False, view_layer=layer)
    for obj in (arm, mesh, *outfits):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = arm
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        use_selection=True,
        export_format="GLB",
        export_attributes=True,
        export_skins=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=False,  # the clips are already keyed on every frame
        export_optimize_animation_size=False,  # every clip keeps every body channel
        export_draco_mesh_compression_enable=True,
        export_image_format="WEBP",  # the outfits' cloth textures
    )
    drop_empty_textures(path)
    print("Arandu: wrote %s (%d KB)" % (path, os.path.getsize(path) // 1024))
    return path


def drop_empty_textures(path):
    """The outfits' metal and roughness come from node maths glTF cannot hold: the exporter writes those
    textures with no image, and three.js fails on them. Materials stop pointing at them; the colour stays."""
    with open(path, "rb") as f:
        glb = f.read()
    size = struct.unpack_from("<I", glb, 12)[0]
    doc = json.loads(glb[20:20 + size])
    empty = {i for i, t in enumerate(doc.get("textures", [])) if "source" not in t and not any(e.get("source") is not None for e in t.get("extensions", {}).values())}
    if not empty:
        return

    def clean(node):
        if isinstance(node, dict):
            for k in [k for k, v in node.items() if k.endswith("Texture") and isinstance(v, dict) and v.get("index") in empty]:
                del node[k]
                if k == "metallicRoughnessTexture":
                    # Its factors default to bare metal: cloth, mostly matte.
                    node.setdefault("metallicFactor", 0.0)
                    node.setdefault("roughnessFactor", 0.8)
            for v in node.values():
                clean(v)
        elif isinstance(node, list):
            for v in node:
                clean(v)

    clean(doc.get("materials", []))
    text = json.dumps(doc, separators=(",", ":")).encode()
    text += b" " * (-len(text) % 4)
    rest = glb[20 + size:]
    out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(text) + len(rest)) + struct.pack("<II", len(text), 0x4E4F534A) + text + rest
    with open(path, "wb") as f:
        f.write(out)


if __name__ == "__main__":
    export()
