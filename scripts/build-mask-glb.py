import argparse
import math
import os
import sys

import bpy


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--front", required=True)
    parser.add_argument("--side", required=True)
    parser.add_argument("--back", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--name", default="NuoMask")
    parser.add_argument("--resolution", type=int, default=112)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def load_pixels(path):
    image = bpy.data.images.load(os.path.abspath(path), check_existing=False)
    image.colorspace_settings.name = "sRGB"
    width, height = image.size
    pixels = list(image.pixels[:])
    return image, width, height, pixels


def rgba_at(pixels, width, height, u, v):
    x = max(0, min(width - 1, round(u * (width - 1))))
    y = max(0, min(height - 1, round((1.0 - v) * (height - 1))))
    offset = (y * width + x) * 4
    return pixels[offset : offset + 4]


def alpha_bbox(pixels, width, height, step=4):
    xs, ys = [], []
    for y in range(0, height, step):
        for x in range(0, width, step):
            if pixels[(y * width + x) * 4 + 3] > 0.08:
                xs.append(x)
                ys.append(y)
    if not xs:
        return 0, 0, width - 1, height - 1
    return min(xs), min(ys), max(xs), max(ys)


def side_depth_by_v(pixels, width, height, bbox, v):
    x0, y0, x1, y1 = bbox
    image_y = round(y1 - v * (y1 - y0))
    occupied = [x for x in range(x0, x1 + 1) if pixels[(image_y * width + x) * 4 + 3] > 0.08]
    if not occupied:
        return 0.78
    span = (max(occupied) - min(occupied)) / max(1, x1 - x0)
    return 0.55 + span * 0.78


def make_material(name, image, roughness, cull=True):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.use_backface_culling = cull
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    for node in list(nodes):
        nodes.remove(node)
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = 0.02
    links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    links.new(texture.outputs["Alpha"], shader.inputs["Alpha"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return material


def main():
    args = parse_args()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    front_image, fw, fh, front_pixels = load_pixels(args.front)
    side_image, sw, sh, side_pixels = load_pixels(args.side)
    back_image, _, _, _ = load_pixels(args.back)
    front_bbox = alpha_bbox(front_pixels, fw, fh)
    side_bbox = alpha_bbox(side_pixels, sw, sh)
    bx0, by0, bx1, by1 = front_bbox
    res = max(64, min(180, args.resolution))

    vertices = []
    front_index = {}
    back_index = {}
    front_uv = {}
    back_uv = {}
    depth_at = {}

    for gy in range(res):
        v = gy / (res - 1)
        for gx in range(res):
            u = gx / (res - 1)
            image_u = (bx0 + u * (bx1 - bx0)) / max(1, fw - 1)
            image_v = 1.0 - (by0 + (1.0 - v) * (by1 - by0)) / max(1, fh - 1)
            r, g, b, a = rgba_at(front_pixels, fw, fh, image_u, image_v)
            if a <= 0.08:
                continue
            x = (u - 0.5) * 1.82
            z = (v - 0.5) * 2.34
            side_depth = side_depth_by_v(side_pixels, sw, sh, side_bbox, v)
            row_curve = math.sqrt(max(0.0, 1.0 - ((u - 0.5) * 1.92) ** 2))
            luminance = (r + g + b) / 3.0
            detail = (luminance - 0.34) * 0.085
            front_y = -0.25 + side_depth * row_curve + detail
            back_y = -0.34 - 0.055 * math.sqrt(max(0.0, 1.0 - ((u - 0.5) * 1.82) ** 2))
            key = (gx, gy)
            front_index[key] = len(vertices)
            vertices.append((x, front_y, z))
            back_index[key] = len(vertices)
            vertices.append((x, back_y, z))
            front_uv[key] = (image_u, image_v)
            back_uv[key] = (image_u, image_v)
            depth_at[key] = (front_y, back_y)

    faces = []
    materials = []
    face_uvs = []

    def add_face(indices, material, uvs):
        faces.append(indices)
        materials.append(material)
        face_uvs.append(uvs)

    for gy in range(res - 1):
        for gx in range(res - 1):
            a, b, c, d = (gx, gy), (gx + 1, gy), (gx, gy + 1), (gx + 1, gy + 1)
            if all(key in front_index for key in (a, b, c)):
                add_face((front_index[a], front_index[b], front_index[c]), 0, (front_uv[a], front_uv[b], front_uv[c]))
                add_face((back_index[a], back_index[c], back_index[b]), 2, (back_uv[a], back_uv[c], back_uv[b]))
            if all(key in front_index for key in (b, d, c)):
                add_face((front_index[b], front_index[d], front_index[c]), 0, (front_uv[b], front_uv[d], front_uv[c]))
                add_face((back_index[b], back_index[c], back_index[d]), 2, (back_uv[b], back_uv[c], back_uv[d]))

    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    for key, fi in front_index.items():
        gx, gy = key
        for dx, dy in directions:
            neighbor = (gx + dx, gy + dy)
            if neighbor in front_index:
                continue
            tangent = (gx, gy + 1) if dx else (gx + 1, gy)
            if tangent not in front_index:
                tangent = (gx, gy - 1) if dx else (gx - 1, gy)
            if tangent not in front_index:
                continue
            ti = front_index[tangent]
            bi = back_index[key]
            bti = back_index[tangent]
            v0 = gy / (res - 1)
            v1 = tangent[1] / (res - 1)
            if dx < 0 or dy > 0:
                add_face((fi, bi, ti), 1, ((0.82, v0), (0.18, v0), (0.82, v1)))
                add_face((ti, bi, bti), 1, ((0.82, v1), (0.18, v0), (0.18, v1)))
            else:
                add_face((fi, ti, bi), 1, ((0.82, v0), (0.82, v1), (0.18, v0)))
                add_face((ti, bti, bi), 1, ((0.82, v1), (0.18, v1), (0.18, v0)))

    mesh = bpy.data.meshes.new(f"{args.name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(args.name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(make_material(f"{args.name}_Front", front_image, 0.66))
    obj.data.materials.append(make_material(f"{args.name}_Side", side_image, 0.76, cull=False))
    obj.data.materials.append(make_material(f"{args.name}_Back", back_image, 0.82))

    uv_layer = mesh.uv_layers.new(name="UVMap")
    for polygon, material_index, polygon_uvs in zip(mesh.polygons, materials, face_uvs):
        polygon.material_index = material_index
        polygon.use_smooth = True
        for loop_index, uv in zip(polygon.loop_indices, polygon_uvs):
            uv_layer.data[loop_index].uv = uv

    bevel = obj.modifiers.new(name="Edge Softening", type="BEVEL")
    bevel.width = 0.012
    bevel.segments = 2
    bevel.limit_method = "ANGLE"

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.abspath(args.output),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
    )
    print(f"Exported {args.output}: {len(vertices)} vertices, {len(faces)} faces")


if __name__ == "__main__":
    main()
