import argparse
import math
import os
import sys

import bpy
from mathutils import Vector


def args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--angle", type=float, default=24)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def point_camera(camera, point=(0, 0, 0)):
    camera.rotation_euler = (Vector(point) - camera.location).to_track_quat("-Z", "Y").to_euler()


cfg = args()
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(cfg.model))
model = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH")
angle = math.radians(cfg.angle)

bpy.ops.object.camera_add(location=(math.sin(angle) * 5.7, -math.cos(angle) * 5.7, 0.05))
camera = bpy.context.object
camera.data.lens = 58
point_camera(camera, (0, 0.18, 0))
bpy.context.scene.camera = camera

bpy.ops.object.light_add(type="AREA", location=(-2.5, -3.4, 3.2))
bpy.context.object.data.energy = 900
bpy.context.object.data.shape = "DISK"
bpy.context.object.data.size = 4.0
point_camera(bpy.context.object, (0, 0, 0))
bpy.ops.object.light_add(type="AREA", location=(2.8, -1.2, 0.6))
bpy.context.object.data.energy = 580
bpy.context.object.data.color = (1.0, 0.48, 0.24)
bpy.context.object.data.size = 2.5
point_camera(bpy.context.object, (0, 0, 0))
bpy.ops.object.light_add(type="AREA", location=(0, 2.0, 3.0))
bpy.context.object.data.energy = 720
bpy.context.object.data.color = (0.45, 0.72, 0.66)
bpy.context.object.data.size = 3.0
point_camera(bpy.context.object, (0, 0, 0))

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 800
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.render.filepath = os.path.abspath(cfg.output)
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)
