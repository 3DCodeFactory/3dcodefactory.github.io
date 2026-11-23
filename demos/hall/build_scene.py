"""Baroque Mirror Gallery — procedural Blender 4.2 scene."""
from __future__ import annotations

import math
import os
import random
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector, Matrix, Quaternion, Euler

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
BLEND_PATH = ROOT / "scene.blend"
GLB_PATH = ROOT / "scene.glb"
random.seed(424242)

HALL_W = 12.0
HALF_W = HALL_W / 2
BAY = 6.0
BAY_CENTERS = [3.0, 9.0, 15.0, 21.0, 27.0, 33.0, 39.0]
Y_MIN = -2.0
Y_END = 42.0
Y_MAX = Y_END + 0.001
CORNICE_Z = 8.5
VAULT_RISE = 2.5
VAULT_Z = CORNICE_Z + VAULT_RISE

WINDOW_BAYS = [0, 1, 3, 5]
WINDOW_CENTERS = [BAY_CENTERS[i] for i in WINDOW_BAYS]
MIRROR_LEFT = [15.0, 27.0, 39.0]

RIGHT_MIRRORS = [9.0, 15.0, 33.0, 39.0]
SUN_ANGLE = 3.7

WALL_INNER = 5.92
WALL_X = 6.08

WIN_HALF = 1.60
WIN_BOTTOM = 1.20
WIN_SPRING = 5.60
WIN_TOP = 7.20

pilaster_collection = None

def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                  bpy.data.images, bpy.data.cameras, bpy.data.lights,
                  bpy.data.collections):
        try:
            block.remove(block)
        except Exception:
            pass

def make_collection(name: str, parent=None):
    coll = bpy.data.collections.new(name)
    if parent is not None:
        parent.children.link(coll)
    else:
        bpy.context.scene.collection.children.link(coll)
    return coll

def move_to_collection(obj, coll) -> None:
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    coll.objects.link(obj)

def link_obj(obj, coll):
    coll.objects.link(obj)
    return obj

def mesh_object(name, verts, faces, mat=None, coll=None, smooth=False, uv=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    obj = bpy.data.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(obj)
    if mat is not None:
        obj.data.materials.append(mat)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    if uv is not None:
        layer = me.uv_layers.new(name="UVMap")
        for poly in me.polygons:
            for li in poly.loop_indices:
                vi = me.loops[li].vertex_index
                layer.data[li].uv = uv[vi]
    return obj

def box_geometry(sx, sy, sz, center=(0, 0, 0)):
    cx, cy, cz = center
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    v = [
        (cx - hx, cy - hy, cz - hz), (cx + hx, cy - hy, cz - hz),
        (cx + hx, cy + hy, cz - hz), (cx - hx, cy + hy, cz - hz),
        (cx - hx, cy - hy, cz + hz), (cx + hx, cy - hy, cz + hz),
        (cx + hx, cy + hy, cz + hz), (cx - hx, cy + hy, cz + hz),
    ]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
         (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    uv = [(0, 0), (1, 0), (1, 1), (0, 1),
          (0, 0), (1, 0), (1, 1), (0, 1),
          (0, 0), (1, 0), (1, 1), (0, 1),
          (0, 0), (1, 0), (1, 1), (0, 1),
          (0, 0), (1, 0), (1, 1), (0, 1),
          (0, 0), (1, 0), (1, 1), (0, 1)]
    uvs = [(uv[i * 4 + k], f[i][k]) for i in range(6) for k in range(4)]
    return v, f

def add_box(name, loc, size, mat, coll, bevel=0.0, rotation=(0, 0, 0),
            smooth=False, parent=None):
    sx, sy, sz = size
    v, f = box_geometry(sx, sy, sz)
    obj = mesh_object(name, v, f, mat, coll, smooth=smooth)
    obj.location = loc
    obj.rotation_euler = rotation
    if parent is not None:
        obj.parent = parent
    if bevel > 0:
        mod = obj.modifiers.new("Soft chamfer", 'BEVEL')
        mod.width = min(bevel, .49 * min(sx, sy, sz))
        mod.segments = 2
        mod.limit_method = 'ANGLE'
    return obj

def add_uv_sphere(name, loc, radius, mat, coll, scale=(1, 1, 1),
                  segments=24, rings=12, rotation=(0, 0, 0), smooth=True):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings,
                                         radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    move_to_collection(obj, coll)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj

def add_cylinder(name, loc, r1, r2, depth, mat, coll, vertices=24,
                 rotation=(0, 0, 0), caps=True, smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2,
                                    depth=depth, end_fill_type='NGON' if caps else 'NOTHING',
                                    location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    move_to_collection(obj, coll)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj

def add_torus(name, loc, major, minor, mat, coll, rotation=(0, 0, 0),
              major_segments=32, minor_segments=8, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                     major_segments=major_segments,
                                     minor_segments=minor_segments,
                                     location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    move_to_collection(obj, coll)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj

def add_lathe(name, profile, loc, mat, coll, segments=32, rot_z=0.0,
              caps=True, uv_scale=(1, 1), smooth=True):
    """Revolve a list of (radius,z) around local Z. The object is placed at loc."""
    verts = []
    uvs = []
    n = len(profile)
    for j, (r, z) in enumerate(profile):
        for i in range(segments):
            a = 2 * math.pi * i / segments
            verts.append((r * math.cos(a), r * math.sin(a), z))
            uvs.append((i / segments * uv_scale[0], j / max(n - 1, 1) * uv_scale[1]))
    faces = []
    for j in range(n - 1):
        for i in range(segments):
            ni = (i + 1) % segments
            a = j * segments + i
            b = j * segments + ni
            c = (j + 1) * segments + ni
            d = (j + 1) * segments + i
            faces.append((a, b, c, d))
    if caps:
        faces.append(tuple(range(segments - 1, -1, -1)))
        base = (n - 1) * segments
        faces.append(tuple(base + i for i in range(segments)))
    obj = mesh_object(name, verts, faces, mat, coll, smooth=smooth, uv=uvs)
    obj.location = loc
    obj.rotation_euler = (0, 0, rot_z)
    return obj

def catmull_rom(points, samples_per_segment=8, closed=False):
    pts = [Vector(p) for p in points]
    if len(pts) < 2:
        return pts
    if closed:
        ext = [pts[-1]] + pts + [pts[0], pts[1]]
        nseg = len(pts)
    else:
        ext = [pts[0]] + pts + [pts[-1]]
        nseg = len(pts) - 1
    out = []
    for i in range(nseg):
        p0, p1, p2, p3 = ext[i], ext[i + 1], ext[i + 2], ext[i + 3]
        for k in range(samples_per_segment):
            t = k / samples_per_segment
            t2, t3 = t * t, t * t * t
            p = 0.5 * ((2 * p1) + (-p0 + p2) * t +
                       (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                       (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
            out.append(p)
    out.append(pts[0] if closed else pts[-1])
    return out

def tube_mesh(name, points, radii, mat, coll, sides=8, caps=True,
              smooth=True, closed=False):
    pts = [Vector(p) for p in points]
    if isinstance(radii, (int, float)):
        radii = [float(radii)] * len(pts)
    if len(radii) != len(pts):
        raise ValueError("radii length mismatch")
    if len(pts) < 2:
        return None
    n = len(pts)

    tangents = []
    for i in range(n):
        if i == 0:
            t = pts[1] - pts[0]
        elif i == n - 1:
            t = pts[-1] - pts[-2]
        else:
            t = pts[i + 1] - pts[i - 1]
        if t.length < 1e-8:
            t = Vector((0, 0, 1))
        tangents.append(t.normalized())

    ref = Vector((0, 0, 1))
    if abs(tangents[0].dot(ref)) > .92:
        ref = Vector((0, 1, 0))
    nrm = (ref - tangents[0] * tangents[0].dot(ref)).normalized()
    frames = []
    for i, t in enumerate(tangents):
        if i > 0:
            q = tangents[i - 1].rotation_difference(t)
            nrm = (q @ nrm)
            nrm = (nrm - t * t.dot(nrm)).normalized()
        binorm = t.cross(nrm).normalized()
        frames.append((nrm.copy(), binorm))
    verts = []
    uvs = []
    for i, p in enumerate(pts):
        nrm, bi = frames[i]
        r = radii[i]
        for s in range(sides):
            a = 2 * math.pi * s / sides
            verts.append(tuple(p + nrm * (math.cos(a) * r) + bi * (math.sin(a) * r)))
            uvs.append((s / sides, i / max(1, n - 1)))
    faces = []
    for i in range(n - (0 if closed else 1)):
        ni = (i + 1) % n
        for s in range(sides):
            ns = (s + 1) % sides
            faces.append((i * sides + s, i * sides + ns,
                          ni * sides + ns, ni * sides + s))
    if caps and not closed:
        faces.append(tuple(range(sides - 1, -1, -1)))
        faces.append(tuple((n - 1) * sides + s for s in range(sides)))
    return mesh_object(name, verts, faces, mat, coll, smooth=smooth, uv=uvs)

def add_tube(name, points, radius, mat, coll, sides=8, closed=False, samples=1,
             smooth=True):
    pts = points
    if samples > 1:
        pts = catmull_rom(points, samples, closed=closed)
    return tube_mesh(name, pts, radius, mat, coll, sides=sides, closed=closed,
                     smooth=smooth)

def add_arched_frame(name, center_y, half_width, bottom, spring, thickness,
                     depth, x_face, mat, coll, toward=1.0, segments=36,
                     bevel=0.0):
    """Arched frame band (side/top/bottom) extruded away from the wall.

    x_face is the front plane of the band. toward is the room-side direction
    (+1 for the left wall, -1 for the right wall).
    """
    def loop(hw, z_bottom, z_spring):
        p = []

        p.append((center_y - hw, z_bottom))
        p.append((center_y - hw, z_spring))
        for k in range(segments + 1):
            a = math.pi - math.pi * k / segments
            p.append((center_y + hw * math.cos(a), z_spring + hw * math.sin(a)))
        p.append((center_y + hw, z_bottom))
        return p

    inner = loop(half_width, bottom, spring)
    outer = loop(half_width + thickness, bottom - thickness, spring)

    inner_loop = inner[:-1] + [(center_y + half_width, bottom), (center_y - half_width, bottom)]
    outer_loop = outer[:-1] + [(center_y + half_width + thickness, bottom - thickness),
                               (center_y - half_width - thickness, bottom - thickness)]

    def make_loop(hw, zb, zs):
        pts = [(center_y - hw, zb)]
        for k in range(segments + 1):
            a = math.pi - math.pi * k / segments
            pts.append((center_y + hw * math.cos(a), zs + hw * math.sin(a)))
        pts.append((center_y + hw, zb))
        return pts
    inner = make_loop(half_width, bottom, spring)
    outer = make_loop(half_width + thickness, bottom - thickness, spring)
    n = len(inner)
    front_x = x_face
    back_x = x_face - toward * depth
    verts = []
    for x in (front_x, back_x):
        for y, z in inner:
            verts.append((x, y, z))
        for y, z in outer:
            verts.append((x, y, z))
    base_i, base_o = 0, n
    base_ib, base_ob = 2 * n, 3 * n
    faces = []
    for i in range(n - 1):
        j = (i + 1) % n
        faces.append((base_i + i, base_i + j, base_o + j, base_o + i))
        faces.append((base_ib + i, base_ob + i, base_ob + j, base_ib + j))
        faces.append((base_o + i, base_o + j, base_ob + j, base_ob + i))
        faces.append((base_i + i, base_ib + i, base_ib + j, base_i + j))

    j = 0
    faces.append((base_i + n - 1, base_i + j, base_o + j, base_o + n - 1))
    faces.append((base_ib + n - 1, base_ob + n - 1, base_ob + j, base_ib + j))
    faces.append((base_o + n - 1, base_ob + n - 1, base_ob + j, base_o + j))
    faces.append((base_i + n - 1, base_i + j, base_ib + j, base_ib + n - 1))
    obj = mesh_object(name, verts, faces, mat, coll, smooth=False)
    if bevel > 0:
        mod = obj.modifiers.new("Chamfer", 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = 'ANGLE'
    return obj

def add_arch_surface(name, center_y, half_width, bottom, spring, x, mat, coll,
                     toward=1.0, segments=48, uv=True):
    """A flat filled arch-shaped surface, normal toward the room."""
    pts = [(center_y - half_width, bottom)]
    for k in range(segments + 1):
        a = math.pi - math.pi * k / segments
        pts.append((center_y + half_width * math.cos(a), spring + half_width * math.sin(a)))
    pts.append((center_y + half_width, bottom))

    verts = [(x, y, z) for y, z in pts]
    faces = [tuple(range(len(verts)))]

    if toward > 0:
        faces = [tuple(reversed(faces[0]))]
    obj = mesh_object(name, verts, faces, mat, coll)
    me = obj.data
    me.calc_loop_triangles()
    if me.polygons:
        me.update()
        if me.polygons[0].normal.x * toward < 0:
            me.flip_normals()
    if uv:

        lay = me.uv_layers.new(name="UVMap")
        ys = [p[0] for p in pts]
        zs = [p[1] for p in pts]
        y0, y1, z0, z1 = min(ys), max(ys), min(zs), max(zs)
        for poly in me.polygons:
            for li in poly.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                lay.data[li].uv = ((co.y - y0) / (y1 - y0), (co.z - z0) / (z1 - z0))
    return obj

def add_arch_prism(name, center_y, half_width, bottom, spring, x0, x1, coll=None):
    """A closed manifold arch prism used as a boolean cutter."""
    pts = [(center_y - half_width, bottom)]
    for k in range(32 + 1):
        a = math.pi - math.pi * k / 32
        pts.append((center_y + half_width * math.cos(a), spring + half_width * math.sin(a)))
    pts.append((center_y + half_width, bottom))
    n = len(pts)
    verts = [(x0, y, z) for y, z in pts] + [(x1, y, z) for y, z in pts]
    faces = [tuple(range(n - 1, -1, -1)), tuple(n + i for i in range(n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    obj = mesh_object(name, verts, faces, None, coll or bpy.context.scene.collection)
    return obj

def add_crown_path(name, radius, bevel, height, mat, coll, loc=(0, 0, 0),
                   segments=16):
    pts = []
    for i in range(segments):
        a = 2 * math.pi * i / segments
        pts.append((radius * math.cos(a) + loc[0],
                    radius * math.sin(a) + loc[1],
                    height + loc[2] * 0 + (0.15 * math.cos(a * 3))))
    return add_tube(name, pts, bevel, mat, coll, sides=7, closed=True)

MAT = {}

def _img(name, non_color=False):
    p = ASSETS / name
    img = bpy.data.images.load(str(p), check_existing=True)
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    return img

def _bsdf(nodes):
    return nodes.get("Principled BSDF")

def make_material(name, base=(.8, .8, .8), metallic=0.0, roughness=.5,
                  specular=.5, ior=1.45, alpha=1.0, emission=(0, 0, 0), emission_strength=0.0,
                  transmission=0.0, coat=0.0, coat_rough=0.03, sheen=0.0,
                  base_image=None, roughness_image=None, normal_image=None,
                  bump_image=None, bump_strength=.08, subsurface=0.0,
                  alpha_blend=False, transparent_shadow=True,
                  uv_scale=None, anisotropy=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    out.location = (520, 0)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (100, 0)
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    bsdf.inputs['Base Color'].default_value = (*base, 1.0)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['IOR'].default_value = ior
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = specular
    bsdf.inputs['Alpha'].default_value = alpha
    if transmission:
        bsdf.inputs['Transmission Weight'].default_value = transmission
    if coat:
        bsdf.inputs['Coat Weight'].default_value = coat
        bsdf.inputs['Coat Roughness'].default_value = coat_rough
    if sheen:
        if 'Sheen Weight' in bsdf.inputs:
            bsdf.inputs['Sheen Weight'].default_value = sheen
            bsdf.inputs['Sheen Roughness'].default_value = .55
    if subsurface:
        if 'Subsurface Weight' in bsdf.inputs:
            bsdf.inputs['Subsurface Weight'].default_value = subsurface
            bsdf.inputs['Subsurface Radius'].default_value = (.22, .13, .08)
    if emission_strength:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    if anisotropy:
        bsdf.inputs['Anisotropic'].default_value = anisotropy

    uvnode = None
    if uv_scale and (base_image or roughness_image or normal_image):
        tc = nt.nodes.new('ShaderNodeTexCoord')
        tc.location = (-760, 120)
        mapping = nt.nodes.new('ShaderNodeMapping')
        mapping.location = (-560, 120)
        mapping.inputs['Scale'].default_value = (uv_scale[0], uv_scale[1], 1)
        nt.links.new(tc.outputs['UV'], mapping.inputs['Vector'])
        uvnode = mapping

    def tex(path, non_color, loc):
        node = nt.nodes.new('ShaderNodeTexImage')
        node.image = _img(path, non_color=non_color)
        node.location = loc
        node.interpolation = 'Linear'
        node.extension = 'REPEAT'
        if uvnode is not None:
            nt.links.new(uvnode.outputs['Vector'], node.inputs['Vector'])
        return node

    if base_image:
        n = tex(base_image, False, (-320, 260))
        nt.links.new(n.outputs['Color'], bsdf.inputs['Base Color'])
    if roughness_image:
        n = tex(roughness_image, True, (-320, 0))
        nt.links.new(n.outputs['Color'], bsdf.inputs['Roughness'])
    if normal_image:
        n = tex(normal_image, True, (-320, -250))
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.location = (10, -250)
        nm.inputs['Strength'].default_value = 1.0
        nt.links.new(n.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    if bump_image:
        n = tex(bump_image, True, (-320, -500))
        bump = nt.nodes.new('ShaderNodeBump')
        bump.location = (10, -460)
        bump.inputs['Strength'].default_value = bump_strength
        bump.inputs['Distance'].default_value = .06
        nt.links.new(n.outputs['Color'], bump.inputs['Height'])
        nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

    if alpha < 1.0 or alpha_blend:
        try:
            mat.surface_render_method = 'BLENDED'
        except Exception:
            pass
        try:
            mat.blend_method = 'BLEND'
        except Exception:
            pass
        mat.use_transparent_shadow = transparent_shadow
        mat.show_transparent_back = False
    return mat

def create_materials():
    global MAT
    MAT['plaster'] = make_material(
        "M_Plaster_Ivory", base=(.87, .82, .72), roughness=.62, specular=.33,
        base_image='plaster_ivory.png', normal_image='plaster_normal.png')
    MAT['ivory'] = make_material("M_Painted_Ivory", base=(.93, .89, .80),
                                 roughness=.42, specular=.38)
    MAT['cream'] = make_material("M_Marble_Cream", base=(.88, .84, .75),
                                 roughness=.19, coat=.25,
                                 base_image='marble_creme.png',
                                 roughness_image='marble_grey_roughness.png')
    MAT['grey_marble'] = make_material(
        "M_Marble_Grey_Lilac", base=(.55, .51, .60), roughness=.16, coat=.35,
        coat_rough=.05, base_image='marble_grey_lilac.png',
        roughness_image='marble_grey_roughness.png',
        bump_image='marble_grey_lilac.png', bump_strength=.16)
    MAT['red_marble'] = make_material(
        "M_Marble_Red_Brown", base=(.35, .17, .15), roughness=.18, coat=.35,
        base_image='marble_red_brown.png',
        roughness_image='marble_grey_roughness.png',
        bump_image='marble_red_brown.png', bump_strength=.14)
    MAT['floor'] = make_material(
        "M_Marble_Floor_Mosaic", base=(.72, .68, .65), roughness=.10,
        specular=.32, coat=.35, coat_rough=.06,
        base_image='floor_mosaic.png', roughness_image='floor_roughness.png',
        normal_image='floor_normal.png')
    MAT['gold'] = make_material(
        "M_Gilded_Bronze", base=(.83, .58, .20), metallic=1.0, roughness=.27,
        base_image='gold_antique.png', roughness_image='gold_roughness.png',
        normal_image='gold_normal.png')
    MAT['gold_plain'] = make_material(
        "M_Gold_Bright", base=(.91, .66, .27), metallic=1.0, roughness=.18)
    MAT['gold_dark'] = make_material(
        "M_Gold_Antique_Recess", base=(.48, .30, .09), metallic=1.0, roughness=.32)
    MAT['mirror'] = make_material(
        "M_Mirror_Silvered", base=(.93, .94, .93), metallic=1.0, roughness=.012,
        coat=0.0)
    MAT['window_glass'] = make_material(
        "M_Window_Glass", base=(.84, .92, .96), metallic=0.0, roughness=.02,
        ior=1.46, transmission=1.0, coat=.15, coat_rough=.02)
    MAT['window_glass'].surface_render_method = 'DITHERED'
    MAT['sheer'] = make_material(
        "M_Sheer_Curtain", base=(.82, .79, .72), metallic=0.0, roughness=.70,
        alpha=.68, transmission=0.0, sheen=.22, ior=1.4,
        base_image='sheer_linen.png', bump_image='sheer_linen.png',
        bump_strength=.18, alpha_blend=True, transparent_shadow=True)
    MAT['crystal'] = make_material(
        "M_Crystal_Glass", base=(.97, .99, 1.0), metallic=.05, roughness=.045,
        ior=1.52, transmission=.78, coat=.32, coat_rough=.05,
        emission=(.72, .81, .92), emission_strength=.040)
    MAT['crystal'].surface_render_method = 'DITHERED'
    MAT['porcelain'] = make_material(
        "M_Porcelain_Cobalt", base=(.91, .88, .81), roughness=.16, coat=.4,
        base_image='porcelain_cobalt.png')
    MAT['velvet'] = make_material(
        "M_Velvet_Beige", base=(.54, .45, .34), roughness=.82, sheen=.45,
        base_image='velvet_beige.png', normal_image='velvet_normal.png')
    MAT['wax'] = make_material("M_Candle_Wax", base=(.94, .89, .76),
                               roughness=.45, subsurface=.15)
    MAT['flame'] = make_material("M_Candle_Flame", base=(1.0, .62, .18),
                                 emission=(1.0, .45, .09), emission_strength=32.0,
                                 roughness=.35)
    MAT['fire'] = make_material("M_Fire_Ember", base=(.48, .11, .02),
                                emission=(1.0, .22, .02), emission_strength=3.0,
                                roughness=.8)
    MAT['statue'] = make_material(
        "M_White_Marble_Statue", base=(.93, .91, .86), roughness=.24,
        coat=.22, subsurface=.10, base_image='marble_creme.png',
        bump_image='marble_creme.png', bump_strength=.10)
    MAT['painting'] = make_material(
        "M_Vault_Fresco", base=(.8, .8, .8), roughness=.55, sheen=.1)
    MAT['lunette'] = make_material(
        "M_End_Lunette_Fresco", base=(.8, .8, .8), roughness=.55)
    MAT['exterior'] = make_material(
        "M_Exterior_Garden_Daylight", base=(1, 1, 1), roughness=.8,
        emission=(1, 1, 1), emission_strength=.30,
        base_image='exterior_garden.png')
    MAT['soot'] = make_material(
        "M_Firebox_Soot", base=(.04, .032, .025), roughness=.8,
        base_image='firebox_soot.png')
    MAT['dark_velvet'] = make_material(
        "M_Dark_Wood_Door", base=(.16, .10, .065), roughness=.35, coat=.2)
    MAT['garden_green'] = make_material(
        "M_Garden_Foliage", base=(.13, .21, .09), roughness=.8)
    MAT['water'] = make_material(
        "M_Distant_Fountain", base=(.5, .64, .65), roughness=.06, metallic=.0,
        coat=.8)
    MAT['exterior_sky'] = make_material(
        "M_Exterior_Sky_Backdrop", base=(1, 1, 1), roughness=.9,
        emission=(1.0, 1.0, 1.0), emission_strength=.30,
        base_image='exterior_garden.png')

    for key, imgname in (('painting', None), ('lunette', None)):
        pass
    MAT['brass_dark'] = make_material(
        "M_Brass_Chandelier", base=(.48, .32, .11), metallic=1.0, roughness=.3)
    MAT['silk_shade'] = make_material(
        "M_Candle_Shade_Damask", base=(.85, .78, .63), roughness=.6)
    MAT['gilt_cloth'] = make_material(
        "M_Gilt_Textile", base=(.58, .43, .20), metallic=.3, roughness=.55)
    MAT['plaster_white'] = make_material(
        "M_Plaster_White", base=(.91, .88, .81), roughness=.55)
    MAT['plain_black'] = make_material(
        "M_Black_Iron", base=(.025, .022, .02), metallic=.6, roughness=.4)
    return MAT

def image_emission_material(name, asset, strength=1.2, rough=.8, base_mode=True):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    out.location = (500, 0)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (150, 0)
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = _img(asset)
    tex.location = (-350, 0)
    if base_mode:
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value = strength
    bsdf.inputs['Roughness'].default_value = rough
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

def make_fresco_material(name, asset, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); out.location = (500, 0)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled'); bsdf.location = (150, 0)
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = _img(asset); tex.location = (-350, 0)
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = .58
    if strength:
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = strength
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

def build_floor(collections):
    coll = collections['Architecture']
    v = [(-HALF_W, Y_MIN, 0), (HALF_W, Y_MIN, 0),
         (HALF_W, Y_END, 0), (-HALF_W, Y_END, 0)]
    f = [(0, 1, 2, 3)]
    uv = [(( -HALF_W + HALF_W) / 12, (Y_MIN + 2) / 12),
          ((HALF_W + HALF_W) / 12, (Y_MIN + 2) / 12),
          ((HALF_W + HALF_W) / 12, (Y_END + 2) / 12),
          ((-HALF_W + HALF_W) / 12, (Y_END + 2) / 12)]
    obj = mesh_object("Floor_Marble_Mosaic", v, f, MAT['floor'], coll, uv=uv)
    obj.data.materials[0] = MAT['floor']

    obj["tile_size_m"] = 3.0
    obj["texture_repeat_m"] = 12.0
    return obj

def cut_arch_openings(wall, cutters, coll):
    for i, cutter in enumerate(cutters):
        mod = wall.modifiers.new(f"Window opening {i+1}", 'BOOLEAN')
        mod.operation = 'DIFFERENCE'
        mod.solver = 'FAST'
        mod.object = cutter
        bpy.context.view_layer.objects.active = wall
        wall.select_set(True)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(cutter, do_unlink=True)
    wall.select_set(False)

def build_side_walls(colls):

    left = add_box("Wall_Left_Structural", (-WALL_X, (Y_MIN + Y_END) / 2, CORNICE_Z / 2),
                   (0.34, Y_END - Y_MIN, CORNICE_Z), MAT['plaster'],
                   colls['Architecture'], smooth=False)
    right = add_box("Wall_Right_Structural", (WALL_X, (Y_MIN + Y_END) / 2, CORNICE_Z / 2),
                    (0.34, Y_END - Y_MIN, CORNICE_Z), MAT['plaster'],
                    colls['Architecture'], smooth=False)

    add_box("Wall_Entrance_End", (0, Y_MIN - .2, CORNICE_Z / 2),
            (HALL_W, .35, CORNICE_Z), MAT['plaster'], colls['Architecture'])

    cutters = []
    for yc in WINDOW_CENTERS:
        cut = add_arch_prism(f"CUT_Window_{yc:02.0f}", yc, WIN_HALF, WIN_BOTTOM,
                             WIN_SPRING, -WALL_X - .4, -WALL_X + .4,
                             coll=colls['Architecture'])
        cutters.append(cut)
    cut_arch_openings(left, cutters, colls['Architecture'])
    return left, right

def add_baseboard_and_wainscot(colls):
    arch = colls['Architecture']
    orn = colls['Ornament']
    for side, xdir in ((-1, 1), (1, -1)):
        wall_face = side * WALL_INNER

        add_box(f"Baseboard_{'L' if side<0 else 'R'}_Plinth",
                (wall_face + xdir * .085, (Y_MIN + Y_END) / 2, .11),
                (0.17, Y_END - Y_MIN, .22), MAT['ivory'], arch, bevel=.025)
        add_box(f"Baseboard_{'L' if side<0 else 'R'}_Gold_Bead",
                (wall_face + xdir * .172, (Y_MIN + Y_END) / 2, .235),
                (.035, Y_END - Y_MIN, .035), MAT['gold'], orn)

        add_box(f"Dado_Rail_{'L' if side<0 else 'R'}",
                (wall_face + xdir * .085, (Y_MIN + Y_END) / 2, 1.20),
                (.16, Y_END - Y_MIN, .10), MAT['ivory'], arch, bevel=.018)
        add_box(f"Dado_Gold_Line_{'L' if side<0 else 'R'}",
                (wall_face + xdir * .168, (Y_MIN + Y_END) / 2, 1.20),
                (.026, Y_END - Y_MIN, .03), MAT['gold'], orn)

        add_box(f"Upper_String_Course_{'L' if side<0 else 'R'}",
                (wall_face + xdir * .070, (Y_MIN + Y_END) / 2, 7.68),
                (.15, Y_END - Y_MIN, .085), MAT['ivory'], arch, bevel=.016)
        add_box(f"Upper_String_Gold_{'L' if side<0 else 'R'}",
                (wall_face + xdir * .150, (Y_MIN + Y_END) / 2, 7.68),
                (.022, Y_END - Y_MIN, .03), MAT['gold'], orn)

def add_wall_panels(colls):
    """Tall fielded panels on the piers and lower dado panels."""
    arch = colls['Architecture']
    orn = colls['Ornament']
    for side, xdir in ((-1, 1), (1, -1)):
        s = 'L' if side < 0 else 'R'
        wall_face = side * WALL_INNER

        for i, yc in enumerate(BAY_CENTERS):

            for pidx, dy in enumerate((-2.35, 2.35)):
                if side < 0 and int(yc) in [3, 9, 21, 33]:

                    pass
                pcy = yc + dy
                py0, py1 = pcy - .34, pcy + .34

                avoid = False
                for wy in WINDOW_CENTERS:
                    if abs(pcy - wy) < 2.12:
                        avoid = True
                if side > 0:

                    pass
                if avoid:
                    continue
                z0, z1 = 2.05, 6.85

                add_box(f"WallPanel_{s}_{i}_{pidx}_Field", (xdir * .012 + wall_face, pcy, (z0+z1)/2),
                        (.018, py1-py0, z1-z0), MAT['ivory'], arch)

                for k, (yy, zz, sy, sz) in enumerate([
                        (pcy, z0, py1-py0+0.10, .055),
                        (pcy, z1, py1-py0+0.10, .055),
                        (py0-.025, (z0+z1)/2, .055, z1-z0+0.06),
                        (py1+.025, (z0+z1)/2, .055, z1-z0+0.06)]):
                    add_box(f"WallPanel_{s}_{i}_{pidx}_Mould_{k}",
                            (xdir * .052 + wall_face, yy, zz),
                            (.045, sy, sz), MAT['ivory'], arch, bevel=.012)

                for k, (yy, zz, sy, sz) in enumerate([
                        (pcy, z0+.12, py1-py0-0.10, .012),
                        (pcy, z1-.12, py1-py0-0.10, .012)]):
                    add_box(f"WallPanel_{s}_{i}_{pidx}_GoldLine_{k}",
                            (xdir * .075 + wall_face, yy, zz),
                            (.012, sy, sz), MAT['gold'], orn)
                for k, yy in enumerate((py0+.045, py1-.045)):
                    add_box(f"WallPanel_{s}_{i}_{pidx}_GoldVert_{k}",
                            (xdir * .075 + wall_face, yy, (z0+z1)/2),
                            (.012, .012, z1-z0-.18), MAT['gold'], orn)
                add_rosette(f"WallPanel_{s}_{i}_{pidx}_Rosette",
                            (xdir * .09 + wall_face, pcy, z1-.36),
                            .075, MAT['gold'], orn,
                            normal=(xdir, 0, 0), petals=8)

                for k, sgn in enumerate((-1, 1)):
                    pts = []
                    for j in range(13):
                        t = j / 12
                        pts.append((xdir*.09 + wall_face,
                                    pcy + sgn*(.20 - .16*t),
                                    z1-.22 - .16*math.sin(math.pi*t)))
                    add_tube(f"WallPanel_{s}_{i}_{pidx}_Swag_{k}", pts,
                             .011, MAT['gold'], orn, sides=5)

            pcy = yc
            z0, z1 = .38, 1.02
            add_box(f"DadoPanel_{s}_{i}_Field", (wall_face + xdir * .012, pcy, (z0+z1)/2),
                    (.018, 3.5, z1-z0), MAT['ivory'], arch)
            for yy, zz, sy, sz in [(pcy, z0, 3.66, .045), (pcy, z1, 3.66, .045),
                                   (pcy-1.78, (z0+z1)/2, .045, z1-z0+.06),
                                   (pcy+1.78, (z0+z1)/2, .045, z1-z0+.06)]:
                add_box(f"DadoPanel_{s}_{i}_Mould", (wall_face + xdir * .05, yy, zz),
                        (.035, sy, sz), MAT['ivory'], arch, bevel=.01)

def add_pilaster_kit(colls):
    """Marble pilasters with gilded bases, capitals and carved capitals."""
    arch = colls['Architecture']
    orn = colls['Ornament']
    boundaries = [0.0, 6.0, 12.0, 18.0, 24.0, 30.0, 36.0, 42.0]
    for side, xdir in ((-1, 1), (1, -1)):
        s = 'L' if side < 0 else 'R'
        wall_face = side * WALL_INNER
        for i, yc in enumerate(boundaries):
            suffix = f"{s}_{i+1:02d}"
            px = wall_face + xdir * .18

            add_box(f"Pilaster_Base_{suffix}_Plinth", (wall_face + xdir * .16, yc, .14),
                    (.34, 1.02, .28), MAT['cream'], arch, bevel=.025)
            add_box(f"Pilaster_Base_{suffix}_Gold", (wall_face + xdir * .255, yc, .31),
                    (.22, .95, .09), MAT['gold'], orn, bevel=.018)
            add_box(f"Pilaster_Base_{suffix}_Socle", (wall_face + xdir * .20, yc, .57),
                    (.29, .92, .44), MAT['grey_marble'], arch, bevel=.025)
            add_box(f"Pilaster_Base_{suffix}_Socle_Gold", (wall_face + xdir * .31, yc, .81),
                    (.10, .94, .045), MAT['gold'], orn)

            z0, z1 = .80, 7.30
            n_flutes = 6
            depth = .19
            y_max = .42
            verts = []
            rows = 22
            for r in range(rows + 1):
                z = z0 + (z1 - z0) * r / rows
                entasis = 1.0 + .013 * math.sin(math.pi * r / rows)
                for c in range(n_flutes * 5 + 1):
                    u = c / (n_flutes * 5)
                    yy = (u - .5) * 2 * y_max * entasis

                    groove = .5 + .5 * math.cos(u * math.pi * 2 * n_flutes)
                    xx = wall_face + xdir * (.18 + depth * (1 - .085 * groove ** 2.4))
                    verts.append((xx, yc + yy, z))
            faces = []
            cols = n_flutes * 5 + 1
            for r in range(rows):
                for c in range(cols - 1):
                    a = r * cols + c
                    b = (r + 1) * cols + c
                    d = (r + 1) * cols + c + 1
                    e = r * cols + c + 1
                    faces.append((a, b, d, e))

            back_x = wall_face + xdir * .04
            uvshaft = [((yc + verts[i][1]) / 1.1, verts[i][2] / 7.0)
                       for i in range(len(verts))]
            obj = mesh_object(f"Pilaster_Shaft_{suffix}", verts, faces,
                              MAT['grey_marble'], arch, smooth=True, uv=uvshaft)

            add_box(f"Pilaster_ShaftCore_{suffix}",
                    (wall_face + xdir * .085, yc, (z0+z1)/2),
                    (.17, .82, z1-z0), MAT['grey_marble'], arch, bevel=.01)
            add_box(f"Pilaster_ShaftGoldFillet_{suffix}",
                    (wall_face + xdir * .375, yc-.425, (z0+z1)/2),
                    (.025, .025, z1-z0-.05), MAT['gold'], orn)
            add_box(f"Pilaster_ShaftGoldFillet2_{suffix}",
                    (wall_face + xdir * .375, yc+.425, (z0+z1)/2),
                    (.025, .025, z1-z0-.05), MAT['gold'], orn)

            cap0, cap1 = 7.28, 8.12
            add_box(f"Pilaster_Capital_{suffix}_Block", (wall_face + xdir * .21, yc, 7.40),
                    (.33, .92, .23), MAT['cream'], arch, bevel=.035)
            add_torus(f"Pilaster_Capital_{suffix}_Collar", (wall_face + xdir * .27, yc, 7.52),
                      0.40, .052, MAT['gold'], orn,
                      rotation=(math.radians(90), 0, 0), scale=(1.06, 1.0, 1.0))

            for k in range(5):
                yy = yc + (k - 2) * .16
                add_leaf(f"Pilaster_Capital_{suffix}_Leaf_{k}", (wall_face + xdir * .36, yy, 7.53),
                         width=.19, height=.47, thickness=.035, mat=MAT['gold'], coll=orn,
                         rot_z=math.radians(-90 if side < 0 else 90),
                         rot_x=0, curl=.5, tilt=math.radians(-(k-2)*7))
            for k, yy in enumerate((yc-.34, yc+.34)):

                pts = []
                for j in range(22):
                    t = j / 21
                    a = t * math.pi * 2.2
                    r = .18 * (1 - .70 * t)
                    pts.append((wall_face + xdir * (.36 + .07 * math.sin(t*math.pi)),
                                yy + .13 * math.cos(a) * (1-.2*t), 7.76 + .14 * math.sin(a) * (1-.2*t)))
                add_tube(f"Pilaster_Capital_{suffix}_Volute_{k}", pts, .026,
                         MAT['gold'], orn, sides=7)
            add_box(f"Pilaster_Capital_{suffix}_Abacus", (wall_face + xdir * .23, yc, 8.02),
                    (.38, 1.04, .15), MAT['gold'], orn, bevel=.03)
            add_box(f"Pilaster_Capital_{suffix}_AbacusTop", (wall_face + xdir * .21, yc, 8.105),
                    (.43, 1.10, .055), MAT['gold'], orn, bevel=.015)

            add_rosette(f"Pilaster_Capital_{suffix}_Rosette",
                        (wall_face + xdir * .41, yc, 7.92), .11, MAT['gold'], orn,
                        normal=(xdir, 0, 0), petals=8)

def build_cornice(colls):
    arch = colls['Architecture']
    orn = colls['Ornament']
    for side, xdir in ((-1, 1), (1, -1)):
        s = 'L' if side < 0 else 'R'
        wall_face = side * WALL_INNER
        ycen = (Y_MIN + Y_END) / 2
        ly = Y_END - Y_MIN

        add_box(f"Cornice_{s}_Frieze", (wall_face + xdir * .11, ycen, 8.18),
                (.24, ly, .32), MAT['plaster'], arch, bevel=.025)
        add_box(f"Cornice_{s}_Gold_Bead", (wall_face + xdir * .24, ycen, 8.035),
                (.035, ly, .035), MAT['gold'], orn)
        add_box(f"Cornice_{s}_Lower_Bed", (wall_face + xdir * .20, ycen, 8.31),
                (.39, ly, .08), MAT['cream'], arch, bevel=.02)
        add_box(f"Cornice_{s}_Corona_Gold", (wall_face + xdir * .30, ycen, 8.385),
                (.57, ly, .055), MAT['gold'], orn)
        add_box(f"Cornice_{s}_Corona", (wall_face + xdir * .27, ycen, 8.425),
                (.51, ly, .085), MAT['ivory'], arch, bevel=.018)
        add_box(f"Cornice_{s}_Top_Bed", (wall_face + xdir * .20, ycen, 8.485),
                (.38, ly, .055), MAT['gold'], orn)

        base_x = wall_face + xdir * .255
        verts = []
        faces = []
        step = .30
        count = int(ly / step)
        for i in range(count):
            yy = Y_MIN + .15 + i * step
            sx, sy, sz = .085, .09, .11
            cx, cy, cz = base_x, yy, 8.255
            v, f = box_geometry(sx, sy, sz, (cx, cy, cz))
            off = len(verts)
            verts.extend(v)
            faces.extend([tuple(off + k for k in face) for face in f])
        mesh_object(f"Cornice_{s}_Dentils", verts, faces, MAT['gold'], orn)

        n_ros = max(1, int((Y_END - Y_MIN) / 1.05))
        for k in range(n_ros):
            yy = Y_MIN + .55 + k * (Y_END - Y_MIN - 1.1) / max(1, n_ros - 1)
            add_rosette(f"Cornice_{s}_FriezeRosette_{k+1}",
                        (wall_face + xdir * .315, yy, 8.235), .075,
                        MAT['gold'], orn, normal=(xdir, 0, 0), petals=8)

        for i, yc in enumerate([0,6,12,18,24,30,36,42]):
            add_box(f"Cornice_{s}_Bracket_{i}", (wall_face + xdir * .34, yc, 7.97),
                    (.34, .24, .36), MAT['gold'], orn, bevel=.018)
            add_leaf(f"Cornice_{s}_BracketLeaf_{i}", (wall_face + xdir * .53, yc, 7.86),
                     width=.16, height=.33, thickness=.025, mat=MAT['gold'], coll=orn,
                     rot_z=math.radians(-90 if side < 0 else 90), curl=.7)

def build_ceiling(colls):
    arch = colls['Architecture']
    orn = colls['Ornament']

    nx = 64
    ny = 44
    xs = [(-HALF_W + HALL_W * i / nx) for i in range(nx + 1)]
    ys = [(Y_MIN + (Y_END - Y_MIN) * j / ny) for j in range(ny + 1)]
    verts = []
    uvs = []
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            z = CORNICE_Z + VAULT_RISE * math.cos(math.pi * x / HALL_W)
            verts.append((x, y, z))
            uvs.append(((x + HALF_W) / HALL_W, (y - Y_MIN) / 12))
    faces = []
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            b = (j + 1) * (nx + 1) + i
            c = b + 1
            d = a + 1
            faces.append((a, b, c, d))
    mesh_object("Ceiling_Barrel_Vault", verts, faces, MAT['plaster'], arch,
                smooth=True, uv=uvs)

    for side, xdir in ((-1, 1), (1, -1)):
        s = 'L' if side < 0 else 'R'
        add_box(f"Vault_Spring_Cornice_{s}_Gold", (side * 5.82, (Y_MIN+Y_END)/2, 8.53),
                (.16, Y_END-Y_MIN, .075), MAT['gold'], orn)
        add_box(f"Vault_Spring_Cornice_{s}_White", (side * 5.91, (Y_MIN+Y_END)/2, 8.58),
                (.30, Y_END-Y_MIN, .085), MAT['ivory'], arch, bevel=.012)

    bay_bounds = [0.0, 6.0, 12.0, 18.0, 24.0, 30.0, 36.0, 42.0]
    for i, y in enumerate(bay_bounds):
        pts = []
        for k in range(41):
            x = -HALF_W + HALL_W * k / 40
            z = CORNICE_Z + VAULT_RISE * math.cos(math.pi * x / HALL_W) - .035
            pts.append((x, y, z))
        add_tube(f"Ceiling_Gold_Arch_Rib_{i+1}", pts, .052, MAT['gold'], orn,
                 sides=8)

        pts2 = [(x, y, z - .12) for x, y, z in pts]
        add_tube(f"Ceiling_Gold_Arch_Rib_{i+1}_Inner", pts2, .015, MAT['gold'], orn, sides=6)
        add_rosette(f"Ceiling_Rosette_{i+1}", (0, y, VAULT_Z - .09), .27,
                    MAT['gold'], orn, normal=(0, 0, -1), petals=12)

    fresco_mats = [make_fresco_material(f"M_Fresco_Panel_{i+1:02d}",
                                         f'fresco_{(i%3)+1:02d}.png', strength=.22)
                   for i in range(6)]
    for i in range(6):
        y0 = 6.0 + i * 6.0 + .48
        y1 = 6.0 + (i + 1) * 6.0 - .48
        x_l, x_r = -3.95, 3.95
        grid = 24
        verts = []
        uvs = []
        for j in range(grid + 1):
            y = y0 + (y1 - y0) * j / grid
            for k in range(grid + 1):
                x = x_l + (x_r - x_l) * k / grid
                z = CORNICE_Z + VAULT_RISE * math.cos(math.pi * x / HALL_W) - .045
                verts.append((x, y, z))
                uvs.append((k / grid, j / grid))
        faces = []
        for j in range(grid):
            for k in range(grid):
                a = j * (grid + 1) + k
                b = (j + 1) * (grid + 1) + k
                c = b + 1
                d = a + 1
                faces.append((a, b, c, d))
        obj = mesh_object(f"Ceiling_Fresco_Panel_{i+1:02d}", verts, faces,
                          fresco_mats[i], orn, smooth=True, uv=uvs)

        for yy in (y0, y1):
            pts = []
            for k in range(18):
                x = x_l + (x_r - x_l) * k / 17
                z = CORNICE_Z + VAULT_RISE * math.cos(math.pi * x / HALL_W) - .015
                pts.append((x, yy, z))
            add_tube(f"Ceiling_Fresco_Frame_{i+1}_{yy:.0f}_Y", pts, .028, MAT['gold'], orn, sides=6)
        for x in (x_l, x_r):
            pts = [(x, y0 + (y1-y0)*k/24,
                    CORNICE_Z + VAULT_RISE * math.cos(math.pi*x/HALL_W) - .015) for k in range(25)]
            add_tube(f"Ceiling_Fresco_Frame_{i+1}_{x:.0f}_X", pts, .028, MAT['gold'], orn, sides=6)

        for xx in (x_l, x_r):
            for yy in (y0, y1):
                add_rosette(f"Ceiling_Corner_Rosette_{i+1}_{xx:.0f}_{yy:.0f}",
                            (xx, yy, CORNICE_Z + VAULT_RISE * math.cos(math.pi*xx/HALL_W) - .02),
                            .08, MAT['gold'], orn, normal=(0, 0, -1), petals=6)

    for i in range(6):
        y0 = 6.0 + i * 6.0 + .48
        y1 = 6.0 + (i + 1) * 6.0 - .48
        yc = (y0 + y1) / 2
        for side in (-1, 1):
            add_ceiling_medallion(side * 4.95, yc,
                                  CORNICE_Z + VAULT_RISE * math.cos(math.pi * 4.95 / HALL_W) - .03,
                                  side, i, orn)

def add_ceiling_medallion(x, y, z, side, idx, coll):

    add_rosette(f"Ceiling_Coffer_Rosette_{idx+1}_{'L' if side<0 else 'R'}",
                (x, y, z - .035), .16, MAT['gold'], coll,
                normal=(0, 0, -1), petals=10)

def add_rosette(name, loc, radius, mat, coll, normal=(0, 0, -1), petals=8):
    """A small gilded flower/rosette facing a wall or ceiling."""
    n = Vector(normal).normalized()

    up = Vector((0, 0, 1))
    if abs(n.dot(up)) > .92:
        up = Vector((0, 1, 0))
    u = up.cross(n).normalized()
    v = n.cross(u).normalized()
    objs = []
    c = Vector(loc)

    petal_mesh = bpy.data.meshes.new(name + "_petal_src")
    for k in range(petals):
        a = 2 * math.pi * k / petals
        dirv = (u * math.cos(a) + v * math.sin(a))
        center = c + dirv * (radius * .46) + n * (.006 * (k % 2))
        obj = add_uv_sphere(f"{name}_Petal_{k+1}", center, radius * .55, mat, coll,
                            scale=(1.0, .38, .13), segments=12, rings=8)

        side = n.cross(dirv).normalized()
        R = Matrix((dirv, side, n)).transposed()
        obj.rotation_euler = R.to_euler()
        objs.append(obj)

    add_uv_sphere(f"{name}_Boss", c + n * .03, radius * .29, mat, coll,
                  scale=(1, 1, .55), segments=14, rings=8)

    ring_pts = []
    for k in range(36):
        aa = 2 * math.pi * k / 36
        ring_pts.append(c + n * .012 + u * (math.cos(aa) * radius * .84) +
                        v * (math.sin(aa) * radius * .84))
    add_tube(f"{name}_Ring", ring_pts, radius * .052, mat, coll, sides=6, closed=True)
    return objs

def add_leaf(name, loc, width, height, thickness, mat, coll,
             rot_z=0.0, rot_x=0.0, curl=.5, tilt=0.0):
    """Stylised acanthus leaf relief, with a raised central spine."""
    nu, nv = 8, 12
    verts = []
    for j in range(nv + 1):
        v = j / nv

        prof = (math.sin(math.pi * min(1, v * 1.04)) ** .65) * (1 - .12 * v)
        for i in range(nu + 1):
            u = (i / nu) * 2 - 1
            y = u * width * .5 * prof
            z = v * height

            edge = (1 - abs(u)) ** 2
            lobe = .018 * math.sin(u * math.pi * 3 + v * 5) * (1 - v) ** .3
            depth = thickness * (0.35 + 1.4 * edge) + lobe * curl + .014 * (1 - abs(u)) * curl
            verts.append((y, depth, z))
    faces = []
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i
            b = a + 1
            c = (j + 1) * (nu + 1) + i + 1
            d = (j + 1) * (nu + 1) + i
            faces.append((a, b, c, d))
    obj = mesh_object(name, verts, faces, mat, coll, smooth=True)
    obj.location = loc
    obj.rotation_euler = (rot_x, 0, rot_z)

    if tilt:
        obj.rotation_euler = (rot_x, tilt, rot_z)
    sol = obj.modifiers.new("LeafThickness", 'SOLIDIFY')
    sol.thickness = .022
    sol.offset = 0
    return obj

def add_local_part(name, parent, local_center, dims, mat, coll, bevel=0.0,
                   rotation=(0, 0, 0)):
    obj = add_box(name, (0, 0, 0), dims, mat, coll, bevel=bevel)
    obj.parent = parent
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.location = local_center
    obj.rotation_euler = rotation
    return obj

def add_glass_pane(name, parent, local_center, dims, coll):
    obj = add_local_part(name, parent, local_center, dims, MAT['window_glass'], coll)
    obj.visible_shadow = False
    obj.visible_diffuse = False
    return obj

def add_door_leaf(name, yc, side_sign, open_angle, coll):
    """A glazed lower window leaf, hinged at one side.

    side_sign = -1 for the left-hand leaf (hinge at the left jamb),
    side_sign = +1 for the right-hand leaf (hinge at the right jamb).
    Both leaves extend inward toward the centre of the opening.
    """
    L = 1.52
    hinge_y = yc + side_sign * 1.56
    ext = -side_sign
    empty = bpy.data.objects.new(name + "_Pivot", None)
    empty.empty_display_type = 'PLAIN_AXES'
    empty.empty_display_size = .15
    coll.objects.link(empty)
    empty.location = (-6.035, hinge_y, WIN_BOTTOM)

    empty.rotation_euler = (0, 0, side_sign * open_angle)

    add_local_part(name + "_StileHinge", empty, (0, ext * .045, 2.2),
                   (.07, .09, 4.40), MAT['ivory'], coll, bevel=.008)
    add_local_part(name + "_StileFree", empty, (0, ext * (L - .045), 2.2),
                   (.07, .09, 4.40), MAT['ivory'], coll, bevel=.008)

    for k, zc in enumerate((.07, 4.33, .82, 1.54, 2.26, 2.98, 3.70)):
        thick = .14 if k < 2 else .045
        add_local_part(name + f"_Rail_{k+1}", empty, (0, ext * L / 2, zc),
                       (.066, L - .02, thick), MAT['ivory'], coll, bevel=.006)

    add_glass_pane(name + "_Glass", empty, (0, ext * L / 2, 2.20),
                   (.009, L - .12, 4.05), coll)

    add_local_part(name + "_BrassAstragal", empty, (-.038, ext * (L - .006), 2.20),
                   (.014, .018, 4.10), MAT['gold'], coll)

    add_local_part(name + "_HandlePlate", empty, (-.065, ext * (L - .16), 2.28),
                   (.025, .055, .34), MAT['gold'], coll, bevel=.01)
    add_local_part(name + "_Handle", empty, (-.105, ext * (L - .16), 2.20),
                   (.09, .035, .055), MAT['gold_plain'], coll, bevel=.014)

    for zz in (1.0, 3.4):
        add_local_part(name + f"_Hinge_{zz:.0f}", empty, (-.04, 0.0, zz),
                       (.035, .09, .14), MAT['gold'], coll, bevel=.008)
    return empty

def build_window_bay(collections, yc, index, open_angle=math.radians(11)):
    coll = collections['Openings']
    orn = collections['Ornament']
    arch = collections['Architecture']
    name = f"WindowBay_{index:02d}"

    for side in (-1, 1):
        add_box(f"{name}_RevealJamb_{'L' if side<0 else 'R'}",
                (-6.02, yc + side * 1.60, 3.4),
                (.32, .10, 4.5), MAT['ivory'], arch, bevel=.015)

    add_arched_frame(f"{name}_ArchReveal", yc, 1.50, WIN_SPRING, WIN_SPRING,
                     .10, .30, -5.99, MAT['ivory'], arch, toward=1.0,
                     segments=40, bevel=.01)

    add_box(f"{name}_MarbleSill", (-5.77, yc, WIN_BOTTOM - .045),
            (.42, 3.68, .10), MAT['cream'], arch, bevel=.022)
    add_box(f"{name}_Sill_GoldEdge", (-5.56, yc, WIN_BOTTOM - .10),
            (.035, 3.68, .038), MAT['gold'], orn)

    add_box(f"{name}_ApronField", (-5.885, yc, .78),
            (.05, 3.45, .55), MAT['ivory'], arch)
    for yy, zz, sy, sz in [(yc, .49, 3.56, .045), (yc, 1.05, 3.56, .045),
                           (yc-1.76, .78, .045, .50), (yc+1.76, .78, .045, .50)]:
        add_box(f"{name}_ApronMould", (-5.84, yy, zz), (.055, sy, sz),
                MAT['ivory'], arch, bevel=.01)
    add_box(f"{name}_Apron_GoldLine", (-5.80, yc, .44), (.018, 3.25, .02),
            MAT['gold'], orn)

    add_arched_frame(f"{name}_Architrave", yc, 1.60, WIN_BOTTOM, WIN_SPRING,
                     .24, .18, -5.745, MAT['ivory'], arch, toward=1.0,
                     segments=48, bevel=.018)
    add_arched_frame(f"{name}_GoldBead", yc, 1.58, WIN_BOTTOM + .015, WIN_SPRING,
                     .035, .06, -5.705, MAT['gold'], orn, toward=1.0,
                     segments=48, bevel=.005)

    pts = [(yc - 1.60, WIN_BOTTOM)]
    for k in range(49):
        a = math.pi - math.pi * k / 48
        pts.append((yc + 1.84 * math.cos(a), WIN_SPRING + 1.84 * math.sin(a)))
    pts.append((yc + 1.60, WIN_BOTTOM))
    add_tube(f"{name}_OuterGoldLip", [(-5.72, y, z) for y, z in pts], .025,
             MAT['gold'], orn, sides=7, samples=1)

    for side in (-1, 1):
        yy = yc + side * 1.86
        add_box(f"{name}_Ear_{side}_Panel", (-5.88, yy, 4.50),
                (.035, .22, 6.65), MAT['ivory'], arch)
        add_tube(f"{name}_Ear_{side}_GoldVert",
                 [(-5.84, yy+side*.09, 1.25), (-5.84, yy+side*.09, 7.30)],
                 .012, MAT['gold'], orn, sides=6)

    add_box(f"{name}_Keystone", (-5.66, yc, 7.34), (.20, .30, .44),
            MAT['cream'], orn, bevel=.025)
    add_box(f"{name}_KeystoneGold", (-5.53, yc, 7.48), (.10, .22, .22),
            MAT['gold'], orn, bevel=.022)
    add_leaf(f"{name}_KeystoneLeafL", (-5.56, yc - .22, 7.43),
             width=.14, height=.34, thickness=.025, mat=MAT['gold'], coll=orn,
             rot_z=math.radians(-90), tilt=math.radians(-20), curl=.7)
    add_leaf(f"{name}_KeystoneLeafR", (-5.56, yc + .22, 7.43),
             width=.14, height=.34, thickness=.025, mat=MAT['gold'], coll=orn,
             rot_z=math.radians(-90), tilt=math.radians(20), curl=.7)

    leafL = add_door_leaf(f"{name}_LeafL", yc, -1,
                          open_angle + math.radians(3), coll)
    leafR = add_door_leaf(f"{name}_LeafR", yc, +1,
                          math.radians(2.5), coll)

    transom = add_arch_surface(f"{name}_TransomGlass", yc, 1.55, WIN_SPRING,
                               WIN_SPRING, -6.03, MAT['window_glass'], coll,
                               toward=1.0, segments=48)
    transom.visible_shadow = False
    transom.visible_diffuse = False

    add_arched_frame(f"{name}_TransomArch", yc, 1.55, WIN_SPRING, WIN_SPRING,
                     .065, .055, -5.965, MAT['ivory'], arch, toward=1.0,
                     segments=42, bevel=.006)
    add_box(f"{name}_TransomRail", (-5.97, yc, WIN_SPRING + .02),
            (.065, 3.16, .07), MAT['ivory'], arch, bevel=.006)
    center = Vector((-5.95, yc, WIN_SPRING))
    for deg in (32, 58, 90, 122, 148):
        a = math.radians(deg)
        end = Vector((-5.95, yc + 1.54 * math.cos(a), WIN_SPRING + 1.54 * math.sin(a)))
        add_tube(f"{name}_TransomMuntin_{deg}", [center, end], .022,
                 MAT['ivory'], arch, sides=6)
    add_cyl=add_torus(f"{name}_TransomHub", center + Vector((.02, 0, 0)), .07, .022,
                      MAT['gold'], orn, rotation=(0, math.radians(90), 0))

    add_window_balcony(collections, yc, index)

    add_curtain_pair(collections, yc, index)
    return name

def add_window_balcony(collections, yc, index):
    ext = collections['Exterior']

    add_box(f"BalconyDeck_{index:02d}", (-7.0, yc, 1.06), (1.35, 4.2, .16),
            MAT['cream'], ext, bevel=.02)
    add_box(f"BalconyRailBase_{index:02d}", (-7.52, yc, 1.30),
            (.18, 4.05, .13), MAT['cream'], ext, bevel=.02)
    add_box(f"BalconyRailTop_{index:02d}", (-7.52, yc, 2.30),
            (.26, 4.10, .12), MAT['cream'], ext, bevel=.025)

    prof = [(.075, 0.0), (.11, .10), (.055, .25), (.095, .48),
            (.035, .64), (.055, .72), (.045, .84), (.08, .92)]
    for k in range(8):
        yy = yc - 1.75 + k * .50
        add_lathe(f"BalconyBaluster_{index:02d}_{k+1}", prof,
                  (-7.52, yy, 1.38), MAT['cream'], ext, segments=12)

def add_curtain_pair(collections, yc, index):
    coll = collections['Openings']
    orn = collections['Ornament']

    add_cylinder(f"CurtainRod_WindowBay_{index:02d}", (-5.45, yc, 8.18),
                 .035, .035, 4.85, MAT['gold'], coll,
                 vertices=16, rotation=(math.radians(90), 0, 0))
    for side in (-1, 1):
        add_uv_sphere(f"CurtainRodFinial_{index:02d}_{side}",
                      (-5.45, yc + side * 2.44, 8.18), .10, MAT['gold'], orn,
                      scale=(1, .55, 1), segments=14, rings=8)
        add_cylinder(f"CurtainRodFinialStem_{index:02d}_{side}",
                     (-5.45, yc + side * 2.40, 8.18), .05, .02, .22,
                     MAT['gold'], orn, vertices=12, rotation=(math.radians(90), 0, 0))
    for side, sname in ((-1, 'L'), (1, 'R')):
        add_sheer_panel(f"Curtain_WindowBay_{index:02d}_{sname}",
                        yc + side * 1.20, 1.12 if side < 0 else 1.06,
                        8.12, coll, seed=index * 10 + (0 if side < 0 else 1),
                        flip=side)

def add_sheer_panel(name, y_center, width, z_top, coll, seed=0, flip=1):
    rng = random.Random(seed * 977 + 12)
    nv = 68
    nu = 32
    verts = []
    uvs = []
    phase = rng.random() * 4
    for j in range(nv + 1):
        v = j / nv
        z = z_top - (z_top - .025) * (v ** 1.005)

        if v > .975:
            z = .018 + .025 * math.sin((v - .975) * 50 + phase)

        gather = 1.0 - .16 * (1 - v) ** 2
        for i in range(nu + 1):
            u = i / nu

            amp = (.040 + .105 * v ** 1.1)
            fold = (math.sin(u * math.pi * 7.0 + phase + v * .55) * amp +
                    math.sin(u * math.pi * 15.0 + 2.1 + v * .35) * amp * .30 +
                    math.sin(v * 2.8 + u * 2.0) * .018)

            x = -5.55 + .15 * v ** 1.4 + fold
            yy = y_center + (u - .5) * width * gather

            yy += (u - .5) * .09 * max(0, v - .9) ** 2
            verts.append((x, yy, z))
            uvs.append((u, 1 - v))
    faces = []
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i
            b = (j + 1) * (nu + 1) + i
            c = b + 1
            d = a + 1
            faces.append((a, b, c, d))
    obj = mesh_object(name, verts, faces, MAT['sheer'], coll, smooth=True, uv=uvs)

    sol = obj.modifiers.new("Cloth thickness", 'SOLIDIFY')
    sol.thickness = .004
    sol.offset = 0
    sub = obj.modifiers.new("Cloth smoothing", 'SUBSURF')
    sub.levels = 1
    sub.render_levels = 1

    for k in range(8):
        yy = y_center + (k / 7 - .5) * width * .9
        add_torus(f"{name}_Ring_{k+1}", (-5.45, yy, 8.16), .045, .008,
                  MAT['brass_dark'], coll, rotation=(math.radians(90), 0, 0),
                  major_segments=16, minor_segments=5)
    return obj

def build_all_windows(collections):
    for i, yc in enumerate(WINDOW_CENTERS):
        build_window_bay(collections, yc, i + 1, open_angle=math.radians(10 + i))

def add_wall_leaf(name, side, y, z, width, height, mat=None, rot_tilt=0.0,
                  curl=.6):
    """Place an acanthus leaf against a side wall, pointing upward."""
    mat = mat or MAT['gold']

    rz = math.radians(-90) if side < 0 else math.radians(90)
    return add_leaf(name, (side * 5.53, y, z), width=width, height=height,
                    thickness=.025, mat=mat, coll=COLLS['Ornament'],
                    rot_z=rz, curl=curl, tilt=rot_tilt)

def add_wall_scroll(name, side, y, z, sx, sz, xoff=0.0, mirror=False,
                    radius=.018, coll=None, turns=1.8):
    """Flat C/S scrollwork applied to a side wall; local x is along y, local y is up."""
    coll = coll or COLLS['Ornament']
    x = side * (5.86 - xoff)
    points = []
    for i in range(28):
        t = i / 27
        a = t * math.pi * turns + (math.pi * .2 if mirror else 0)
        r = t
        yy = y + sx * math.cos(a) * r * (1 if not mirror else -1)
        zz = z + sz * math.sin(a) * r
        points.append((x, yy, zz))
    return add_tube(name, points, radius, MAT['gold'], coll, sides=7)

def add_oval_ring(name, side, y, z, ry, rz, xoff=0.0, tube=.018, mat=None,
                  coll=None, segments=40):
    coll = coll or COLLS['Ornament']
    mat = mat or MAT['gold']
    x = side * (5.86 - xoff)
    pts = [(x, y + ry * math.cos(2*math.pi*k/segments), z + rz * math.sin(2*math.pi*k/segments))
           for k in range(segments)]
    return add_tube(name, pts, tube, mat, coll, sides=6, closed=True)

def add_mirror_crest(name, side, y, z_top, coll):
    orn = coll

    add_oval_ring(f"{name}_CartoucheOuter", side, y, z_top + .15, .23, .35,
                  xoff=.035, tube=.022, coll=orn)
    add_oval_ring(f"{name}_CartoucheInner", side, y, z_top + .15, .13, .22,
                  xoff=.055, tube=.012, coll=orn)
    add_wall_leaf(f"{name}_CartoucheLeaf", side, y, z_top - .02, .18, .36, curl=.9)
    add_uv_sphere(f"{name}_CartoucheBoss", (side * 5.75, y, z_top + .15), .075,
                  MAT['gold_plain'], orn, scale=(.6, 1.0, 1.2), segments=16, rings=8)

    for flip, sgn in ((False, -1), (True, 1)):
        pts = []
        for i in range(32):
            t = i / 31
            a = math.pi * (1.15 + 1.5 * t)
            rr = (1.15 - .62 * t)
            yy = y + sgn * (0.14 + .74 * t) + .22 * math.cos(a) * (1-t*.4)
            zz = z_top + .02 + .26 * math.sin(a) * (1-t*.2)
            x = side * 5.80
            pts.append((x, yy, zz))
        add_tube(f"{name}_CrestScroll_{'R' if sgn>0 else 'L'}", pts,
                 .030, MAT['gold'], orn, sides=8)

        add_wall_leaf(f"{name}_CrestLeaf_{sgn}", side, y + sgn * .88, z_top + .08,
                      .13, .30, curl=.9, rot_tilt=math.radians(sgn * 38))

    add_wall_leaf(f"{name}_CrownLeafC", side, y, z_top + .42, .14, .30, curl=.8)
    for sgn in (-1, 1):
        add_wall_leaf(f"{name}_CrownLeaf_{sgn}", side, y + sgn * .13, z_top + .34,
                      .10, .24, curl=.7, rot_tilt=math.radians(sgn*25))

    for sgn in (-1, 1):
        pts = []
        for i in range(18):
            t = i / 17
            pts.append((side * 5.76, y + sgn * (.50 + .08*math.sin(t*5)),
                        z_top - .20 - .62*t + .08*math.cos(t*4)))
        add_tube(f"{name}_Ribbon_{sgn}", pts, .014, MAT['gold'], orn, sides=6)

def build_mirror_niche(collections, side, yc, idx, with_crest=True,
                       over_console=True, name_prefix="Mirror_Niche"):
    """Arched pier glass with layered gold frame, mounted on the side wall."""
    arch = collections['Architecture']
    orn = collections['Ornament']
    s = 'L' if side < 0 else 'R'
    name = f"{name_prefix}_{s}{idx:02d}"
    toward = -side
    x_wall = side * 5.91
    mirror_x = side * 5.885
    hw, bot, spring = 1.15, 1.25, 5.02
    top = spring + hw

    mirror = add_arch_surface(name + "_SilveredGlass", yc, hw, bot, spring,
                              mirror_x, MAT['mirror'], collections['Openings'],
                              toward=toward, segments=64)
    mirror.visible_shadow = True

    add_arched_frame(name + "_DarkReveal", yc, hw + .010, bot - .010, spring,
                     .020, .03, side * 5.895, MAT['plain_black'],
                     collections['Openings'], toward=toward, segments=48)

    x_face = side * 5.795
    add_arched_frame(name + "_GoldFrame", yc, hw, bot, spring, .235, .18,
                     x_face, MAT['gold'], orn, toward=toward, segments=56,
                     bevel=.018)
    add_arched_frame(name + "_InnerBead", yc, hw + .015, bot + .01, spring,
                     .045, .07, side * 5.70, MAT['gold_plain'], orn,
                     toward=toward, segments=56, bevel=.006)

    pts = []
    for k in range(57):
        a = math.pi - math.pi * k / 56
        pts.append((side * 5.69, yc + (hw + .26) * math.cos(a),
                    spring + (hw + .26) * math.sin(a)))
    add_tube(name + "_OuterRope", pts, .026, MAT['gold'], orn, sides=7)
    pts2 = [(side * 5.68, yc + (hw + .035) * math.cos(math.pi - math.pi*k/56),
             spring + (hw + .035) * math.sin(math.pi - math.pi*k/56)) for k in range(57)]
    add_tube(name + "_InnerRope", pts2, .013, MAT['gold_plain'], orn, sides=6)

    for sgn in (-1, 1):
        add_rosette(name + f"_CornerRosette_{sgn}",
                    (side * 5.70, yc + sgn * (hw + .12), 5.85),
                    .075, MAT['gold'], orn, normal=(toward, 0, 0), petals=8)

    add_arched_frame(name + "_IvoryBolection", yc, hw + .30, bot - .03, spring,
                     .075, .075, side * 5.866, MAT['ivory'], arch,
                     toward=toward, segments=48, bevel=.008)
    if with_crest:
        add_mirror_crest(name, side, yc, top + .40, orn)

    add_sconce(f"Sconce_{s}{idx:02d}_L", side, yc - (hw + .48), 4.25,
               collections['Fixtures'], scale=.92)
    add_sconce(f"Sconce_{s}{idx:02d}_R", side, yc + (hw + .48), 4.25,
               collections['Fixtures'], scale=.92)
    if over_console:
        add_console(collections, side, yc, idx)
    return name

def add_console(collections, side, yc, idx):
    coll = collections['Furniture']
    orn = collections['Ornament']
    s = 'L' if side < 0 else 'R'
    toward = -side
    x_wall = side * 5.91

    x_center = x_wall + toward * .30
    top_z = 1.01

    add_box(f"Console_{s}{idx:02d}_MarbleTop", (x_center, yc, top_z),
            (.56, 1.82, .075), MAT['cream'], coll, bevel=.022)
    add_box(f"Console_{s}{idx:02d}_GoldEdge", (x_center + toward * .285, yc, top_z - .005),
            (.030, 1.82, .048), MAT['gold'], orn, bevel=.006)
    add_box(f"Console_{s}{idx:02d}_Apron", (x_center + toward * .24, yc, .88),
            (.075, 1.68, .17), MAT['gold'], coll, bevel=.018)

    x_face = x_center + toward * .30
    for sgn in (-1, 0, 1):
        add_wall_scroll(f"Console_{s}{idx:02d}_ApronScroll_{sgn}", side,
                        yc + sgn * .42, .88, .38, .12, xoff=0,
                        radius=.017, coll=coll, turns=1.2)
    add_wall_leaf(f"Console_{s}{idx:02d}_ApronLeaf", side, yc, .88, .18, .25, curl=.6)

    for sy in (-1, 1):
        for sx in (-1, 1):

            x_off = -0.19 if sx < 0 else .19
            yy = yc + sy * .76
            p0 = (x_center + toward * x_off, yy, .93)
            p1 = (x_center + toward * (x_off + .07), yy, .63)
            p2 = (x_center + toward * (x_off - .045), yy, .32)
            p3 = (x_center + toward * (x_off + .06), yy + sy * .015, .075)
            pts = [p0, p1, p2, p3]
            curve = catmull_rom(pts, 8)
            radii = [.045 - .025 * (i / (len(curve)-1)) for i in range(len(curve))]
            tube_mesh(f"Console_{s}{idx:02d}_Leg_{sy}_{sx}", curve, radii,
                      MAT['gold'], coll, sides=8)

            add_torus(f"Console_{s}{idx:02d}_Foot_{sy}_{sx}",
                      (x_center + toward * (x_off + .055), yy + sy*.015, .065),
                      .055, .018, MAT['gold'], coll,
                      rotation=(0, math.radians(90), 0), major_segments=16,
                      minor_segments=6, scale=(1, 1.2, 1))

    pts = []
    for k in range(25):
        t = k / 24
        pts.append((x_center + toward * (-.19 + .38 * t),
                    yc - .76 + 1.52 * t, .23 + .05 * math.sin(t * math.pi * 2)))
    add_tube(f"Console_{s}{idx:02d}_Stretcher", pts, .018, MAT['gold'], coll, sides=6)
    add_oval_ring(f"Console_{s}{idx:02d}_StretcherBoss", side, yc, .27,
                  .085, .12, tube=.013, coll=coll)

    add_urn(collections, side, yc, top_z + .04, idx, scale=.92)

    if side < 0 and idx in (2, 3):
        add_stool(collections, side, yc + .95, idx, name_suffix="A")
    elif side > 0 and idx in (2, 4):
        add_stool(collections, side, yc - .95, idx, name_suffix="B")

def add_urn(collections, side, yc, z0, idx, scale=1.0):
    coll = collections['Furniture']
    orn = collections['Ornament']
    s = 'L' if side < 0 else 'R'
    x = side * 5.62

    prof = [(.10, 0.00), (.15, .035), (.13, .075), (.20, .13), (.27, .28),
            (.29, .40), (.25, .50), (.16, .60), (.12, .635), (.16, .66),
            (.14, .68), (.08, .72), (.07, .76), (.13, .79), (.10, .82),
            (.055, .845), (.04, .86), (.00, .90)]
    prof = [(r * scale, z * scale) for r, z in prof]
    obj = add_lathe(f"Urn_{s}{idx:02d}_Porcelain", prof, (x, yc, z0),
                    MAT['porcelain'], coll, segments=40)

    for k, (rr, zz) in enumerate(((.155, .015), (.16, .67), (.14, .785), (.065, .91))):
        add_torus(f"Urn_{s}{idx:02d}_GoldBand_{k}", (x, yc, z0+zz*scale),
                  rr*scale, .018*scale, MAT['gold'], orn,
                  rotation=(0, 0, 0), major_segments=32, minor_segments=6)
    add_uv_sphere(f"Urn_{s}{idx:02d}_Finial", (x, yc, z0 + .96*scale),
                  .055*scale, MAT['gold'], orn, scale=(1, 1, 1.35), segments=14, rings=8)

    for sgn in (-1, 1):
        pts = []
        for k in range(18):
            t = k / 17
            a = math.pi * (1.15 - .95 * t)
            pts.append((x + .04*scale + .04*math.sin(t*math.pi),
                        yc + sgn * (.19 + .14 * math.sin(a)) * scale,
                        z0 + (.49 + .10 * math.cos(a)) * scale))
        add_tube(f"Urn_{s}{idx:02d}_Handle_{sgn}", pts, .015*scale,
                 MAT['gold'], orn, sides=6, samples=1)

    add_torus(f"Urn_{s}{idx:02d}_BellyRing", (x, yc, z0 + .41*scale),
              .286*scale, .012*scale, MAT['gold'], orn,
              major_segments=40, minor_segments=5)
    return obj

def add_stool(collections, side, yc, idx, name_suffix=""):
    coll = collections['Furniture']
    orn = collections['Ornament']
    toward = -side
    x_center = side * 5.58 + toward * .10

    add_box(f"Stool_{idx:02d}{name_suffix}_SeatCushion", (x_center, yc, .56),
            (.52, .78, .12), MAT['velvet'], coll, bevel=.055, smooth=True)
    add_box(f"Stool_{idx:02d}{name_suffix}_SeatFrame", (x_center, yc, .47),
            (.56, .82, .09), MAT['gold'], coll, bevel=.025)
    add_box(f"Stool_{idx:02d}{name_suffix}_Apron", (x_center, yc, .41),
            (.50, .72, .08), MAT['gold'], orn, bevel=.012)
    for sx in (-1, 1):
        for sy in (-1, 1):
            xx = x_center + sx * .20
            yy = yc + sy * .31
            pts = [(xx, yy, .40), (xx + toward*.055*sx, yy+sy*.015, .25),
                   (xx - toward*.015, yy+sy*.025, .10),
                   (xx + toward*.045, yy+sy*.015, .035)]
            curve = catmull_rom(pts, 6)
            radii = [.026 - .014*(i/(len(curve)-1)) for i in range(len(curve))]
            tube_mesh(f"Stool_{idx:02d}{name_suffix}_Leg_{sx}_{sy}", curve, radii,
                      MAT['gold'], coll, sides=7)

    add_rosette(f"Stool_{idx:02d}{name_suffix}_ApronRosette",
                (x_center + toward * .285, yc, .43), .06, MAT['gold'], orn,
                normal=(toward, 0, 0), petals=8)
    return

def add_sconce(name, side, y, z, coll, scale=1.0, lit=False):
    """A three-candle gilded wall sconce."""
    orn = COLLS['Ornament']
    toward = -side
    xb = side * 5.86

    add_oval_ring(name + "_Backplate", side, y, z, .19*scale, .39*scale,
                  xoff=.035, tube=.025*scale, coll=orn)
    add_wall_leaf(name + "_BackLeafTop", side, y, z + .22*scale, .15*scale,
                  .27*scale, curl=.8)
    add_wall_leaf(name + "_BackLeafBottom", side, y, z - .22*scale, .12*scale,
                  .22*scale, curl=.7)
    for sgn in (-1, 1):
        add_wall_leaf(name + f"_BackLeaf_{sgn}", side, y + sgn*.12*scale,
                      z + .05*scale, .10*scale, .20*scale,
                      curl=.7, rot_tilt=math.radians(sgn*55))

    for k, (dy, dx, dz) in enumerate(((-.26, .34, .34), (0, .42, .42), (.26, .34, .34))):
        arm_pts = [
            (xb + toward*.04, y, z + .02),
            (xb + toward*.22*scale, y + dy*.5, z + .10*scale),
            (xb + toward*dx*scale, y + dy, z + .05*scale),
            (xb + toward*(dx+.04)*scale, y + dy, z + dz*scale),
        ]
        curve = catmull_rom(arm_pts, 7)
        tubes = tube_mesh(f"{name}_Arm_{k}", curve,
                          [.026*scale]*(len(curve)-1) + [.021*scale],
                          MAT['gold'], orn, sides=7)

        cup = (xb + toward*(dx+.055)*scale, y+dy, z + dz*scale + .02)
        add_torus(f"{name}_ArmCup_{k}", cup, .050*scale, .014*scale,
                  MAT['gold'], orn, rotation=(0, 0, 0), major_segments=18,
                  minor_segments=6)
        add_cylinder(f"{name}_Candle_{k}", (cup[0], cup[1], cup[2]+.15*scale),
                     .015*scale, .018*scale, .26*scale, MAT['wax'], coll,
                     vertices=12)
        add_flame(f"{name}_Flame_{k}", (cup[0], cup[1], cup[2]+.30*scale),
                  .048*scale, MAT['flame'], orn)

        add_crystal_drop(f"{name}_Drop_{k}", (cup[0], cup[1], cup[2]-.13*scale),
                         .028*scale, MAT['crystal'], orn)
    if lit:
        lampdata = bpy.data.lights.new(name + "_Light", 'POINT')
        lampdata.energy = 8.0 * scale
        lampdata.color = (1.0, .62, .28)
        lampdata.shadow_soft_size = .18
        lamp = bpy.data.objects.new(name + "_Light", lampdata)
        coll.objects.link(lamp)
        lamp.location = (xb + toward * .33 * scale, y, z + .25)

def add_flame(name, loc, scale, mat, coll):

    prof = [(0.0, 0.0), (.45, .22), (.62, .5), (.48, .76), (.20, 1.0), (0, 1.12)]
    prof = [(r*scale, z*scale) for r, z in prof]
    return add_lathe(name, prof, loc, mat, coll, segments=12, caps=True)

def add_arch_prism_y(name, center_x, half_width, bottom, spring, y0, y1,
                     coll=None):
    pts = [(center_x - half_width, bottom)]
    for k in range(33):
        a = math.pi - math.pi * k / 32
        pts.append((center_x + half_width * math.cos(a), spring + half_width * math.sin(a)))
    pts.append((center_x + half_width, bottom))
    n = len(pts)
    verts = [(x, y0, z) for x, z in pts] + [(x, y1, z) for x, z in pts]
    faces = [tuple(range(n - 1, -1, -1)), tuple(n + i for i in range(n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    return mesh_object(name, verts, faces, None, coll or bpy.context.scene.collection)

def add_arched_frame_x(name, center_x, half_width, bottom, spring, thickness,
                       depth, y_face, mat, coll, toward=1.0, segments=48,
                       bevel=0.0):
    """Arched frame in the XZ plane, extruded in Y (for an end wall)."""
    def make_loop(hw, zb, zs):
        pts = [(center_x - hw, zb)]
        for k in range(segments + 1):
            a = math.pi - math.pi * k / segments
            pts.append((center_x + hw * math.cos(a), zs + hw * math.sin(a)))
        pts.append((center_x + hw, zb))
        return pts
    inner = make_loop(half_width, bottom, spring)
    outer = make_loop(half_width + thickness, bottom - thickness, spring)
    n = len(inner)
    front_y = y_face
    back_y = y_face + toward * depth
    verts = []
    for y in (front_y, back_y):
        for x, z in inner:
            verts.append((x, y, z))
        for x, z in outer:
            verts.append((x, y, z))
    bi, bo, bib, bob = 0, n, 2*n, 3*n
    faces = []
    for i in range(n - 1):
        j = i + 1
        faces.append((bi+i, bi+j, bo+j, bo+i))
        faces.append((bib+i, bob+i, bob+j, bib+j))
        faces.append((bo+i, bo+j, bob+j, bob+i))
        faces.append((bi+i, bib+i, bib+j, bi+j))
    faces.append((bi+n-1, bi, bo, bo+n-1))
    faces.append((bib+n-1, bob+n-1, bob, bib))
    faces.append((bo+n-1, bob+n-1, bob, bo))
    faces.append((bi+n-1, bib+n-1, bib, bi))
    obj = mesh_object(name, verts, faces, mat, coll, smooth=False)
    if bevel > 0:
        mod = obj.modifiers.new("Chamfer", 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = 'ANGLE'
    return obj

def add_arch_surface_x(name, center_x, half_width, bottom, spring, y, mat,
                       coll, toward=1.0, segments=48, uv=True):
    pts = [(center_x - half_width, bottom)]
    for k in range(segments + 1):
        a = math.pi - math.pi * k / segments
        pts.append((center_x + half_width * math.cos(a), spring + half_width * math.sin(a)))
    pts.append((center_x + half_width, bottom))
    verts = [(x, y, z) for x, z in pts]
    faces = [tuple(range(len(verts)))]
    if toward < 0:
        faces = [tuple(reversed(faces[0]))]
    obj = mesh_object(name, verts, faces, mat, coll)
    me = obj.data
    me.calc_loop_triangles()
    if me.polygons:
        me.update()
        if me.polygons[0].normal.y * toward < 0:
            me.flip_normals()
    if uv:
        lay = me.uv_layers.new(name="UVMap")
        xs = [p[0] for p in pts]; zs = [p[1] for p in pts]
        x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
        for poly in me.polygons:
            for li in poly.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                lay.data[li].uv = ((co.x - x0) / (x1 - x0), (co.z - z0) / (z1 - z0))
    return obj

def add_overmantel_mirror(collections, yc, bottom, spring, half_width, name):
    side = 1
    toward = -1
    orn = collections['Ornament']
    glass = add_arch_surface(f"{name}_Glass", yc, half_width, bottom, spring,
                             5.905, MAT['mirror'], collections['Openings'],
                             toward=toward, segments=48)
    add_arched_frame(f"{name}_Frame", yc, half_width, bottom, spring, .20, .14,
                     5.81, MAT['gold'], orn, toward=toward, segments=48,
                     bevel=.015)
    add_wall_crest_simple(collections, yc, spring + half_width + .35, name)
    return glass

def add_wall_crest_simple(collections, yc, z, name):
    orn = collections['Ornament']
    add_oval_ring(f"{name}_CrestOval", 1, yc, z, .18, .27, xoff=.03,
                  tube=.018, coll=orn)
    for sgn in (-1, 1):
        pts = []
        for i in range(18):
            t = i / 17
            a = math.pi * (0.3 + 1.35 * t)
            pts.append((5.81, yc + sgn * (.12 + .45*t) + .1*math.cos(a),
                        z + .06 + .16*math.sin(a)))
        add_tube(f"{name}_CrestScroll_{sgn}", pts, .022, MAT['gold'], orn, sides=6)
    add_wall_leaf(f"{name}_CrestLeaf", 1, yc, z - .06, .14, .28, curl=.8)

def add_fireplace(collections, yc, idx=1):
    coll = collections['Furniture']
    orn = collections['Ornament']
    name = f"Fireplace_R{idx:02d}"

    firebox = add_arch_surface(f"{name}_SootyOpening", yc, .83, .10, 1.08,
                               5.885, MAT['soot'], collections['Openings'],
                               toward=-1, segments=40)

    add_arched_frame(f"{name}_FireboxGoldTrim", yc, .85, .10, 1.08, .075, .10,
                     5.80, MAT['gold'], orn, toward=-1, segments=40,
                     bevel=.01)

    for k in range(4):
        yy = yc - .45 + k * .22
        add_cylinder(f"{name}_Log_{k+1}", (5.75, yy, .16 + .05*(k%2)),
                     .055, .050, .95, MAT['dark_velvet'], coll,
                     vertices=10, rotation=(math.radians(90), 0, math.radians(90)))
    add_uv_sphere(f"{name}_Embers", (5.69, yc, .17), .35, MAT['fire'], coll,
                  scale=(.55, 1.6, .22), segments=16, rings=8)

    for sgn in (-1, 1):
        add_box(f"{name}_Pier_{sgn}", (5.58, yc + sgn*1.05, .86),
                (.60, .40, 1.62), MAT['red_marble'], coll, bevel=.035)
        add_box(f"{name}_PierGoldPanel_{sgn}", (5.27, yc + sgn*1.05, .86),
                (.035, .26, 1.24), MAT['gold'], orn, bevel=.01)
        add_leaf(f"{name}_PierLeaf_{sgn}", (5.26, yc + sgn*1.05, .33),
                 width=.16, height=.45, thickness=.025, mat=MAT['gold'], coll=orn,
                 rot_z=math.radians(90), curl=.8)

        add_box(f"{name}_Corbel_{sgn}", (5.31, yc + sgn*1.02, 1.52),
                (.22, .24, .33), MAT['cream'], coll, bevel=.03)
        add_leaf(f"{name}_CorbelLeaf_{sgn}", (5.20, yc + sgn*1.02, 1.39),
                 width=.12, height=.22, thickness=.02, mat=MAT['gold'], coll=orn,
                 rot_z=math.radians(90), curl=.6)
    add_box(f"{name}_Lintel", (5.60, yc, 1.54),
            (.55, 2.85, .34), MAT['red_marble'], coll, bevel=.04)
    add_box(f"{name}_LintelGold", (5.32, yc, 1.46),
            (.035, 2.55, .11), MAT['gold'], orn, bevel=.01)

    add_box(f"{name}_CarvedFrieze", (5.33, yc, 1.66),
            (.055, 1.42, .16), MAT['statue'], coll, bevel=.015)
    add_oval_ring(f"{name}_FriezeMedallion", 1, yc, 1.66, .34, .095,
                  xoff=.02, tube=.013, coll=orn)
    add_rosette(f"{name}_FriezeRosette", (5.26, yc, 1.66), .075,
                MAT['gold'], orn, normal=(-1, 0, 0), petals=10)

    add_box(f"{name}_MantelWhite", (5.36, yc, 1.83),
            (.80, 3.16, .14), MAT['cream'], coll, bevel=.035)
    add_box(f"{name}_MantelGoldEdge", (5.02, yc, 1.81),
            (.035, 3.16, .055), MAT['gold'], orn)
    add_box(f"{name}_Hearth", (5.30, yc, .055),
            (1.12, 3.35, .11), MAT['cream'], coll, bevel=.018)
    add_box(f"{name}_Headrail", (5.90, yc, 1.99),
            (.05, 2.95, .14), MAT['gold'], orn)

    add_overmantel_mirror(collections, yc, 2.16, 4.42, 1.05, name + "_Overmantel")

    for sgn in (-1, 1):
        add_candelabrum(f"{name}_Candelabrum_{sgn}", 1, yc + sgn * 1.18, 1.98,
                        collections['Fixtures'], scale=.80)

    fd = bpy.data.lights.new(name + "_EmberGlow", 'POINT')
    fd.energy = 12.0
    fd.color = (1.0, .27, .06)
    fd.shadow_soft_size = .35
    lamp = bpy.data.objects.new(name + "_EmberGlow", fd)
    collections['CameraLights'].objects.link(lamp)
    lamp.location = (5.55, yc, .35)

def add_candelabrum(name, side, y, z, coll, scale=1.0):
    orn = COLLS['Ornament']
    toward = -side
    x = side * 5.38

    add_lathe(f"{name}_Stem", [(.16,0), (.13,.03), (.08,.08), (.055,.16),
                               (.07,.25), (.035,.42), (.045,.55), (.025,.62)],
              (x, y, z), MAT['gold'], coll, segments=24)

    branches = [(-.32, .38, .17), (-.17, .48, .30), (0, .55, .40),
                (.17, .48, .30), (.32, .38, .17)]
    for k, (dy, up, spread) in enumerate(branches):
        pts = [(x, y, z + .52), (x + toward*.10*scale, y + dy*.45, z + .58),
               (x + toward*.20*scale, y + dy, z + .54),
               (x + toward*.22*scale, y + dy, z + .52 + up*scale)]
        curve = catmull_rom(pts, 6)
        tube_mesh(f"{name}_Branch_{k}", curve,
                  [.017*scale]*len(curve), MAT['gold'], coll, sides=6)
        cup = (x + toward*.22*scale, y + dy, z + .56 + up*scale)
        add_torus(f"{name}_Cup_{k}", cup, .043*scale, .012*scale, MAT['gold'], coll,
                  major_segments=16, minor_segments=5)
        add_cylinder(f"{name}_Candle_{k}", (cup[0], cup[1], cup[2]+.14*scale),
                     .013*scale, .016*scale, .25*scale, MAT['wax'], coll, vertices=10)
        add_flame(f"{name}_Flame_{k}", (cup[0], cup[1], cup[2]+.28*scale),
                  .03*scale, MAT['flame'], orn)
    add_uv_sphere(f"{name}_Finial", (x, y, z+.72*scale), .055*scale,
                  MAT['gold'], coll, scale=(.8, 1, 1.4), segments=14, rings=8)

def add_statue(collections, side, yc, variant=0, scale=1.0, end=False,
               name="Statue"):
    coll = collections['Fixtures']
    fixture = collections['Fixtures']
    orn = collections['Ornament']
    toward = -side
    if end:
        base_x, base_y = 0.0, yc
        ped_h = .82 * scale
        pedestal_mat = MAT['grey_marble']
    else:
        base_x = side * (WALL_INNER - .62)
        base_y = yc
        ped_h = .76 * scale
        pedestal_mat = MAT['grey_marble']

    add_box(f"{name}_PedestalPlinth", (base_x, base_y, ped_h*.12),
            (.82*scale, .82*scale, ped_h*.24), MAT['red_marble'], coll, bevel=.035)
    add_box(f"{name}_PedestalDie", (base_x, base_y, ped_h*.50),
            (.66*scale, .66*scale, ped_h*.62), pedestal_mat, coll, bevel=.03)
    add_box(f"{name}_PedestalGoldBand", (base_x, base_y, ped_h*.77),
            (.73*scale, .73*scale, .035*scale), MAT['gold'], orn)
    add_box(f"{name}_PedestalCap", (base_x, base_y, ped_h*.90),
            (.80*scale, .80*scale, .12*scale), MAT['cream'], coll, bevel=.025)
    add_box(f"{name}_PedestalInset", (base_x + toward*.34, base_y, ped_h*.49),
            (.02*scale, .44*scale, ped_h*.45), MAT['cream'], coll)
    figure_z = ped_h
    H = 1.92 * scale

    center_shift_x = toward * .015
    nu, nv = 48, 22
    verts = []
    uvs = []
    for j in range(nv + 1):
        v = j / nv
        z = figure_z + v * .98 * H

        rr = (.31 - .13 * v + .035 * math.sin(v * math.pi * 1.2)) * scale
        fold = (.028 * math.sin(v * 9 + .4) + .020 * math.sin(v * 15 + 2.2)) * (1 - .45*v) * scale

        lean = toward * .035 * math.sin(v * math.pi) * scale
        for i in range(nu):
            a = 2 * math.pi * i / nu
            r = rr + fold * math.sin(a * 6 + 1.0) + .010 * math.sin(a * 12 + v * 3)
            x = base_x + center_shift_x + lean + r * math.cos(a)
            yy = base_y + r * math.sin(a) * .82
            verts.append((x, yy, z))
            uvs.append((i / nu, v))
    faces = []
    for j in range(nv):
        for i in range(nu):
            ni = (i + 1) % nu
            a = j * nu + i
            b = j * nu + ni
            c = (j + 1) * nu + ni
            d = (j + 1) * nu + i
            faces.append((a, b, c, d))

    faces.append(tuple(range(nu - 1, -1, -1)))
    top_start = nv * nu
    faces.append(tuple(top_start + i for i in range(nu)))
    skirt = mesh_object(f"{name}_DrapedRobe", verts, faces, MAT['statue'], coll,
                        smooth=True, uv=uvs)

    torso_z = figure_z + 1.02 * H
    add_uv_sphere(f"{name}_Torso", (base_x + center_shift_x + toward*.018, base_y, torso_z),
                  .28*scale, MAT['statue'], coll, scale=(.78, .56, 1.12),
                  segments=28, rings=16, smooth=True)
    add_uv_sphere(f"{name}_ChestDrape", (base_x + toward*.10, base_y, torso_z + .09*scale),
                  .22*scale, MAT['statue'], coll, scale=(.72, .5, .8),
                  segments=24, rings=12)

    sash_pts = []
    for k in range(22):
        t = k / 21
        a = math.pi * (0.15 + 1.1 * t)
        sash_pts.append((base_x + toward*(.16 + .10*math.sin(a)),
                         base_y + .22*scale*math.cos(a),
                         torso_z - .17*scale + .4*scale*t))
    add_tube(f"{name}_Sash", sash_pts, .052*scale, MAT['statue'], coll, sides=8)

    head_z = figure_z + 1.38 * H
    add_cylinder(f"{name}_Neck", (base_x + center_shift_x, base_y, head_z - .16*scale),
                 .075*scale, .065*scale, .17*scale, MAT['statue'], coll, vertices=16)
    add_uv_sphere(f"{name}_Head", (base_x + center_shift_x + toward*.025,
                                   base_y + .015*scale, head_z),
                  .125*scale, MAT['statue'], coll, scale=(.87, .82, 1.10),
                  segments=28, rings=18)
    add_uv_sphere(f"{name}_Hair", (base_x + center_shift_x, base_y - .015*scale,
                                   head_z + .035*scale), .134*scale,
                  MAT['statue'], coll, scale=(.90, .84, .93), segments=24, rings=14)
    add_uv_sphere(f"{name}_HairBun", (base_x + center_shift_x - toward*.03,
                                      base_y - .12*scale, head_z + .12*scale),
                  .075*scale, MAT['statue'], coll, scale=(1.0, .8, 1.05),
                  segments=18, rings=10)

    if variant == 1:
        arm_r = [(base_x + toward*.15*scale, base_y + .18*scale, torso_z + .10*scale),
                 (base_x + toward*.28*scale, base_y + .33*scale, torso_z + .18*scale),
                 (base_x + toward*.35*scale, base_y + .23*scale, torso_z + .48*scale),
                 (base_x + toward*.42*scale, base_y + .10*scale, torso_z + .66*scale)]
        arm_l = [(base_x + toward*.15*scale, base_y - .18*scale, torso_z + .10*scale),
                 (base_x + toward*.26*scale, base_y - .26*scale, torso_z - .10*scale),
                 (base_x + toward*.19*scale, base_y - .15*scale, torso_z - .38*scale)]
    else:
        arm_r = [(base_x + toward*.15*scale, base_y + .18*scale, torso_z + .10*scale),
                 (base_x + toward*.26*scale, base_y + .27*scale, torso_z - .10*scale),
                 (base_x + toward*.20*scale, base_y + .15*scale, torso_z - .39*scale)]
        arm_l = [(base_x + toward*.15*scale, base_y - .18*scale, torso_z + .10*scale),
                 (base_x + toward*.25*scale, base_y - .27*scale, torso_z - .12*scale),
                 (base_x + toward*.17*scale, base_y - .13*scale, torso_z - .37*scale)]
    for label, arm in (("R", arm_r), ("L", arm_l)):
        curve = catmull_rom(arm, 10)

        radii = [.065*scale*(1 - .35*(i/(len(curve)-1))) for i in range(len(curve))]
        tube_mesh(f"{name}_Arm_{label}", curve, radii, MAT['statue'], coll, sides=8)
        add_uv_sphere(f"{name}_Hand_{label}", arm[-1], .052*scale,
                      MAT['statue'], coll, scale=(.8, .8, 1.2), segments=14, rings=8)

    if variant == 1:
        x0, y0, z0 = arm_r[-1]
        verts2 = []
        for j in range(9):
            v = j / 8
            for i in range(7):
                u = i / 6
                xx = x0 + toward * (.02 + .28 * u)
                yy = y0 + (.50 * u - .22 * v)
                zz = z0 - .78 * v + .03 * math.sin(u * 8 + v * 4)
                verts2.append((xx, yy, zz))
        faces2 = []
        for j in range(8):
            for i in range(6):
                a = j*7+i; b=a+1; c=(j+1)*7+i+1; d=(j+1)*7+i
                faces2.append((a,b,c,d))
        mesh_object(f"{name}_FlowingVeil", verts2, faces2, MAT['statue'], coll,
                    smooth=True)

    add_cylinder(f"{name}_Foot", (base_x, base_y, figure_z + .02),
                 .22*scale, .25*scale, .04, MAT['statue'], coll, vertices=24)
    return f"{name}"

def build_right_wall_furniture(collections):

    for idx, yc in enumerate(RIGHT_MIRRORS, start=1):
        build_mirror_niche(collections, +1, yc, idx, with_crest=True,
                           over_console=True)
    add_fireplace(collections, 21.0, 1)

    niche_name = "StatueNiche_R01"
    add_arch_surface(niche_name + "_Back", 27.0, 1.30, .45, 4.65,
                     5.905, MAT['red_marble'], collections['Openings'],
                     toward=-1, segments=48)
    add_arched_frame(niche_name + "_GoldFrame", 27.0, 1.30, .45, 4.65,
                     .18, .12, 5.82, MAT['gold'], collections['Ornament'],
                     toward=-1, segments=48, bevel=.015)
    add_statue(collections, +1, 27.0, variant=1, scale=.94,
               name="Statue_R_Muse")
    add_sconce("Sconce_R_Statue_L", +1, 25.35, 4.5, collections['Fixtures'], .95)
    add_sconce("Sconce_R_Statue_R", +1, 28.65, 4.5, collections['Fixtures'], .95)

    add_bust_display(collections, +1, 24.1, 3.75, "Bust_R_01")
    add_bust_display(collections, +1, 29.9, 3.75, "Bust_R_02")

def add_bust_display(collections, side, yc, z, name):
    coll = collections['Fixtures']
    orn = collections['Ornament']
    toward = -side

    add_box(name + "_Bracket", (side*5.78, yc, z), (.42, .38, .08),
            MAT['gold'], orn, bevel=.018)
    pts = [(side*5.93, yc-.14, z-.24), (side*5.72, yc, z-.05),
           (side*5.93, yc+.14, z-.24)]
    add_tube(name + "_BracketScroll", pts, .028, MAT['gold'], orn, sides=6)
    add_uv_sphere(name + "_Pedestal", (side*5.74, yc, z+.10), .16,
                  MAT['cream'], coll, scale=(.75, .9, .5), segments=20, rings=10)

    add_uv_sphere(name + "_Chest", (side*5.72, yc, z+.25), .19,
                  MAT['statue'], coll, scale=(.72, 1.1, .65), segments=22, rings=12)
    add_uv_sphere(name + "_Head", (side*5.71, yc, z+.42), .115,
                  MAT['statue'], coll, scale=(.85, .85, 1.10), segments=24, rings=14)
    add_uv_sphere(name + "_Hair", (side*5.715, yc-.015, z+.455), .12,
                  MAT['statue'], coll, scale=(.9, .88, .9), segments=18, rings=10)

def build_end_wall(collections):
    arch = collections['Architecture']
    open_coll = collections['Openings']
    orn = collections['Ornament']
    fixtures = collections['Fixtures']

    end = add_box("End_Wall_Main", (0, Y_END + .2, CORNICE_Z/2 + 1.3),
                  (HALL_W, .40, CORNICE_Z + 2.6), MAT['plaster'], arch)
    cutter = add_arch_prism_y("CUT_End_Portal", 0, 2.45, .08, 5.55,
                              Y_END - .2, Y_END + .6, coll=arch)
    mod = end.modifiers.new("End portal", 'BOOLEAN')
    mod.operation = 'DIFFERENCE'; mod.solver = 'FAST'; mod.object = cutter
    bpy.context.view_layer.objects.active = end
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)

    add_arched_frame_x("EndPortal_WhiteArchitrave", 0, 2.45, .08, 5.55,
                       .30, .28, Y_END - .04, MAT['cream'], arch,
                       toward=-1, segments=64, bevel=.02)
    add_arched_frame_x("EndPortal_GoldBead", 0, 2.43, .10, 5.55,
                       .045, .07, Y_END - .32, MAT['gold'], orn,
                       toward=-1, segments=64, bevel=.006)

    for sgn in (-1, 1):
        add_box(f"EndPortal_Pilaster_{sgn}_Plinth", (sgn*3.05, Y_END-.25, .30),
                (.90, .52, .60), MAT['cream'], arch, bevel=.03)
        add_box(f"EndPortal_Pilaster_{sgn}_Shaft", (sgn*3.05, Y_END-.22, 4.15),
                (.70, .36, 6.65), MAT['grey_marble'], arch, bevel=.02)
        for k in range(4):
            add_box(f"EndPortal_Pilaster_{sgn}_Flute_{k}",
                    (sgn*3.05 + (k-1.5)*.13, Y_END-.405, 4.15),
                    (.018, .015, 6.35), MAT['gold_dark'], orn)
        add_box(f"EndPortal_Pilaster_{sgn}_Capital", (sgn*3.05, Y_END-.22, 7.65),
                (.92, .48, .42), MAT['gold'], orn, bevel=.04)
        add_leaf(f"EndPortal_Pilaster_{sgn}_CapLeaf", (sgn*3.05, Y_END-.47, 7.55),
                 width=.22, height=.34, thickness=.025, mat=MAT['gold'], coll=orn,
                 rot_z=math.pi, curl=.6)

    add_box("EndPortal_Entablature", (0, Y_END-.18, 7.95),
            (9.2, .55, .46), MAT['cream'], arch, bevel=.025)
    add_box("EndPortal_EntablatureGold", (0, Y_END-.48, 8.02),
            (9.25, .035, .13), MAT['gold'], orn)
    add_box("EndPortal_Cornice", (0, Y_END-.22, 8.24),
            (9.6, .68, .16), MAT['ivory'], arch, bevel=.025)

    y = Y_END - .03
    lun_verts = []
    nu = 32; nv = 16
    for j in range(nv + 1):
        v = j / nv
        z = 8.35 + v * 1.9
        x = 3.9 * (1 - .30 * v)

        lun_verts.append((x, y, z))

    lx = 4.15; z0 = 8.34; z1 = 10.25
    verts = []
    for j in range(25):
        v = j / 24
        for i in range(33):
            u = i / 32
            x = (u * 2 - 1) * lx
            z = z0 + (z1 - z0) * (v ** .92)

            if v > .65:
                z = z0 + (z1-z0) * v
            verts.append((x, y, z))
    faces = []
    for j in range(24):
        for i in range(32):
            a = j*33+i; b=a+1; c=(j+1)*33+i+1; d=(j+1)*33+i
            faces.append((a,b,c,d))
    lun_mat = make_fresco_material("M_End_Lunette_Fresco", 'fresco_lunette.png', strength=.20)
    lun = mesh_object("End_Lunette_Painting", verts, faces, lun_mat, orn)

    add_box("EndLunette_Bolection", (0, y-.045, (z0+z1)/2),
            (2*lx+.34, .10, z1-z0+.34), MAT['ivory'], arch, bevel=.028)
    for xx in (-lx-.10, lx+.10):
        add_box(f"EndLunette_GoldStile_{xx:.1f}", (xx, y-.10, (z0+z1)/2),
                (.16, .10, z1-z0+.18), MAT['gold'], orn, bevel=.018)
        add_tube(f"EndLunette_Frame_V_{xx}", [(xx, y-.10, z0), (xx, y-.10, z1)],
                 .026, MAT['gold_plain'], orn, sides=6)
    for zz in (z0-.09, z1+.09):
        add_box(f"EndLunette_GoldRail_{zz:.2f}", (0, y-.10, zz),
                (2*lx+.36, .10, .16), MAT['gold'], orn, bevel=.018)
        add_tube(f"EndLunette_Frame_H_{zz:.2f}", [(-lx, y-.10, zz), (lx, y-.10, zz)],
                 .024, MAT['gold_plain'], orn, sides=6)
    for xx in (-lx-.02, lx+.02):
        for zz in (z0-.02, z1+.02):
            add_rosette(f"EndLunette_CornerRosette_{xx:.1f}_{zz:.1f}",
                        (xx, y-.13, zz), .11, MAT['gold'], orn,
                        normal=(0, -1, 0), petals=8)
    add_oval_ring("EndLunette_Crest", 1, 0, 10.18, .58, .30, xoff=-5.86,
                  tube=.030, coll=orn)
    add_rosette("EndLunette_CrestRosette", (0, y-.10, 10.22), .20,
                MAT['gold'], orn, normal=(0, -1, 0), petals=12)

    for k, deg in enumerate((20, 48, 90, 132, 160)):
        a = math.radians(deg)
        add_rosette(f"EndPortal_ArchivoltRosette_{k+1}",
                    (2.58 * math.cos(a), Y_END - .035,
                     5.55 + 2.58 * math.sin(a)),
                    .12, MAT['gold'], orn, normal=(0, -1, 0), petals=8)

    add_box("Apse_Wall_L", (-3.35, Y_END + 2.2, 4.7), (.36, 4.4, 9.4),
            MAT['plaster'], arch)
    add_box("Apse_Wall_R", (3.35, Y_END + 2.2, 4.7), (.36, 4.4, 9.4),
            MAT['plaster'], arch)
    add_box("Apse_End_Wall", (0, Y_END + 4.72, 4.7), (7.0, .40, 9.4),
            MAT['plaster'], arch)
    add_box("Apse_Ceiling", (0, Y_END + 2.2, 9.2), (6.7, 4.5, .35),
            MAT['plaster'], arch)
    add_box("Apse_Floor", (0, Y_END + 2.2, -.02), (6.7, 4.5, .08),
            MAT['floor'], arch)

    aw_y = Y_END + 4.26
    aw_w = 1.85; aw_bot = .95; aw_spring = 4.95
    add_arch_surface_x("ApseWindow_Glass", 0, aw_w, aw_bot, aw_spring, aw_y,
                       MAT['window_glass'], open_coll, toward=-1, segments=56)

    add_arched_frame_x("ApseWindow_Frame", 0, aw_w, aw_bot, aw_spring, .16, .16,
                       aw_y-.05, MAT['ivory'], arch, toward=-1,
                       segments=56, bevel=.012)
    for k in range(1, 6):
        z = aw_bot + (aw_spring - aw_bot) * k / 6
        add_box(f"ApseWindow_Bar_{k}", (0, aw_y-.13, z), (2*aw_w-.12, .035, .035),
                MAT['ivory'], arch)
    add_box("ApseWindow_CentralMullion", (0, aw_y-.13, (aw_bot+aw_spring)/2),
            (.045, .04, aw_spring-aw_bot), MAT['ivory'], arch)

    for deg in (40, 75, 105, 140):
        a = math.radians(deg)
        add_tube(f"ApseWindow_Fan_{deg}",
                 [(-.02, aw_y-.14, aw_spring),
                  (aw_w*math.cos(a), aw_y-.14, aw_spring+aw_w*math.sin(a))],
                 .024, MAT['ivory'], arch, sides=5)
    add_arched_frame_x("ApseWindow_GoldTrim", 0, aw_w, aw_bot, aw_spring,
                       .035, .05, aw_y-.2, MAT['gold'], orn, toward=-1,
                       segments=48)

    add_arch_surface_x("ApseWindow_DaylightBacking", 0, aw_w+.55, aw_bot-.15,
                       aw_spring+.55, aw_y+.018,
                       image_emission_material("M_Apse_Daylight", 'exterior_garden.png',
                                                strength=4.0, rough=.9),
                       collections['Exterior'], toward=-1, segments=56)

    add_box("Apse_Step1", (0, Y_END+3.7, .08), (2.2, 1.0, .16),
            MAT['cream'], arch, bevel=.025)
    add_box("Apse_Step2", (0, Y_END+3.7, .19), (1.85, .8, .14),
            MAT['cream'], arch, bevel=.02)
    add_statue(collections, +1, Y_END+3.15, variant=1, scale=1.25,
               end=True, name="Statue_End_Luminous")

    for sgn in (-1, 1):
        add_box(f"Apse_Pilaster_{sgn}", (sgn*2.65, aw_y-.42, 4.0),
                (.45, .28, 7.4), MAT['grey_marble'], arch, bevel=.02)
        add_box(f"Apse_PilasterGold_{sgn}", (sgn*2.65, aw_y-.59, 7.72),
                (.55, .16, .22), MAT['gold'], orn, bevel=.02)

    add_box("EndPortal_Threshold", (0, Y_END+.20, .04), (4.9, .55, .09),
            MAT['cream'], arch, bevel=.018)
    return end

def _crystal_geometry(sides=6, aspect=1.0):

    verts = [(0, 0, .58 * aspect)]
    for z, r in ((.24, .18), (-.16, .34)):
        for i in range(sides):
            a = 2 * math.pi * i / sides
            verts.append((r * math.cos(a), r * math.sin(a), z * aspect))
    verts.append((0, 0, -.78 * aspect))
    faces = []
    b1 = 1
    b2 = 1 + sides
    for i in range(sides):
        ni = (i + 1) % sides
        faces.append((0, b1 + i, b1 + ni))
        faces.append((b1 + i, b2 + i, b2 + ni, b1 + ni))
        faces.append((b2 + i, len(verts) - 1, b2 + ni))
    return verts, faces

def add_crystal_drop(name, loc, scale, mat, coll, rotation=None):
    v, f = _crystal_geometry(6, 1.7)
    verts = [(x*scale, y*scale, z*scale) for x, y, z in v]
    obj = mesh_object(name, verts, f, mat, coll, smooth=False)
    obj.location = loc
    if rotation:
        obj.rotation_euler = rotation
    return obj

def add_crystal_chain(builder, points, spacing=.045, size=.022, aspect=1.6,
                      seed=0, alternate=True):
    """Add a closely beaded crystal chain along a 3D polyline to the builder."""
    rng = random.Random(seed)
    pts = [Vector(p) for p in points]
    v, f = _crystal_geometry(6, aspect)
    lengths = [0.0]
    for i in range(1, len(pts)):
        lengths.append(lengths[-1] + (pts[i] - pts[i-1]).length)
    total = lengths[-1]
    if total <= 1e-6:
        return
    count = max(2, int(total / spacing))
    for k in range(count + 1):
        d = total * k / count

        for i in range(len(pts) - 1):
            if lengths[i] <= d <= lengths[i + 1] and lengths[i+1] > lengths[i]:
                t = (d - lengths[i]) / (lengths[i+1] - lengths[i])
                p = pts[i].lerp(pts[i+1], t)
                break
        else:
            p = pts[-1]
        sc = size * rng.uniform(.72, 1.25)
        if alternate and k % 2:
            sc *= .82
        rot = Euler((0, 0, rng.uniform(0, math.pi*2)))
        mat = Matrix.Translation(p) @ rot.to_matrix().to_4x4() @ Matrix.Diagonal((sc, sc, sc*1.05, 1))
        builder.append(v, f, mat)

class MeshBuilder:
    def __init__(self):
        self.verts = []
        self.faces = []
        self.uvs = []

    def append(self, verts, faces, matrix=None):
        off = len(self.verts)
        for v in verts:
            p = Vector(v)
            if matrix is not None:
                p = matrix @ p
            self.verts.append(tuple(p))
        for face in faces:
            self.faces.append(tuple(off + i for i in face))

    def build(self, name, mat, coll, smooth=False):
        if not self.verts:
            return None
        return mesh_object(name, self.verts, self.faces, mat, coll, smooth=smooth)

def add_crystal_ring(builder, center, radius, z, count=14, size=.025, seed=0,
                     phase=0.0):
    rng = random.Random(seed)
    v, f = _crystal_geometry(6, 1.5)
    for k in range(count):
        a = phase + 2 * math.pi * k / count
        p = Vector((center[0] + radius * math.cos(a),
                    center[1] + radius * math.sin(a),
                    z + rng.uniform(-.035, .035)))
        sc = size * rng.uniform(.7, 1.2)
        rot = Euler((rng.uniform(-.1,.1), rng.uniform(-.1,.1), a))
        mat = Matrix.Translation(p) @ rot.to_matrix().to_4x4() @ Matrix.Diagonal((sc, sc, sc, 1))
        builder.append(v, f, mat)

def add_chandelier(collections, yc, name, scale=1.0, tier_count=2,
                   attach_z=10.96, z_top=9.52, seed=1, light_energy=32.0):
    """Large multi-tier crystal chandelier with gilded arms and candlelight."""
    fixtures = collections['Fixtures']
    orn = collections['Ornament']
    rng = random.Random(seed)
    crystals = MeshBuilder()

    canopy_z = attach_z - .02
    add_rosette(f"{name}_CanopyRosette", (0, yc, canopy_z), .30*scale,
                MAT['gold'], orn, normal=(0, 0, -1), petals=12)
    chain_links = []
    z = canopy_z - .06
    idx = 0
    while z > z_top + .02:
        rot = (math.radians(90), 0, math.radians(90 * (idx % 2)))
        link = add_torus(f"{name}_ChainLink_{idx+1}", (0, yc, z),
                         .085*scale, .018*scale, MAT['gold'], fixtures,
                         rotation=rot, major_segments=16, minor_segments=6,
                         scale=(1, 1.35, 1))
        chain_links.append(link)
        z -= .13
        idx += 1

    add_lathe(f"{name}_CrownCap",
              [(.02, 0), (.30, -.10), (.34, -.20), (.26, -.31), (.11, -.37),
               (.08, -.45)], (0, yc, z_top), MAT['gold'], fixtures, segments=32)
    add_lathe(f"{name}_CentralShaft",
              [(.065, 0), (.11, -.22), (.055, -.45), (.12, -.62), (.075, -.78),
               (.13, -.92), (.08, -1.10), (.16, -1.28), (.11, -1.5),
               (.055, -1.75), (.14, -1.92), (.09, -2.15), (.02, -2.25)],
              (0, yc, z_top-.30), MAT['gold'], fixtures, segments=24)

    add_torus(f"{name}_BasketRing", (0, yc, z_top-2.32*scale),
              .52*scale, .035*scale, MAT['gold'], fixtures,
              major_segments=40, minor_segments=8)
    add_torus(f"{name}_BasketLower", (0, yc, z_top-2.84*scale),
              .30*scale, .022*scale, MAT['gold'], fixtures,
              major_segments=32, minor_segments=6)

    for k in range(16):
        a = 2 * math.pi * k / 16
        pts = [(0, yc, z_top-2.30*scale),
               (.58*scale*math.cos(a), yc+.58*scale*math.sin(a), z_top-2.52*scale),
               (.52*scale*math.cos(a), yc+.52*scale*math.sin(a), z_top-2.84*scale),
               (.30*scale*math.cos(a), yc+.30*scale*math.sin(a), z_top-3.08*scale)]
        add_tube(f"{name}_BasketRib_{k+1}", catmull_rom(pts, 5), .012*scale,
                 MAT['gold'], fixtures, sides=5)

        chain_pts = [(p[0], p[1], p[2]) for p in pts[2:]]
        end_z = z_top - (4.02 + .42 * (1 + math.sin(k*2.3)) * .5) * scale
        chain_pts.append((.30*scale*math.cos(a), yc+.30*scale*math.sin(a), end_z))
        add_crystal_chain(crystals, catmull_rom(chain_pts, 8), spacing=.040*scale,
                          size=.040*scale, seed=seed*100+k)

    add_crystal_drop(f"{name}_CentralDropLong", (0, yc, z_top-4.25*scale),
                     .26*scale, MAT['crystal'], fixtures)
    add_cylinder(f"{name}_CentralDropRod", (0, yc, z_top-3.70*scale),
                 .018*scale, .011*scale, 1.10*scale, MAT['gold'], fixtures, vertices=8)

    arm_tips = []
    for tier in range(tier_count):
        n_arms = 8 if tier == 0 else 6
        ring_r = (1.02 if tier == 0 else .62) * scale
        arm_z = z_top - (1.18 if tier == 0 else .68) * scale
        tip_z = z_top - (0.78 if tier == 0 else .38) * scale
        phase = math.pi / n_arms
        tips = []
        for k in range(n_arms):
            a = phase + 2 * math.pi * k / n_arms
            r = .085 * scale
            start = (r*math.cos(a), yc + r*math.sin(a), z_top-.48*scale)
            mid1 = (.48*scale*math.cos(a), yc + .48*scale*math.sin(a), arm_z)
            mid2 = (.86*ring_r*math.cos(a), yc + .86*ring_r*math.sin(a), arm_z-.06*scale)
            end = (ring_r*math.cos(a), yc + ring_r*math.sin(a), tip_z)
            pts = [start, mid1, mid2, end]
            curve = catmull_rom(pts, 8)
            tube_mesh(f"{name}_Arm_{tier}_{k+1}", curve,
                      [.031*scale - .011*scale*(i/(len(curve)-1)) for i in range(len(curve))],
                      MAT['gold'], fixtures, sides=7)

            add_uv_sphere(f"{name}_ArmLeaf_{tier}_{k+1}",
                          (mid2[0], mid2[1], mid2[2]+.03*scale),
                          .055*scale, MAT['gold'], fixtures,
                          scale=(.7, 1.4, .45), segments=12, rings=6)

            cup = (end[0], end[1], end[2]+.04*scale)
            add_torus(f"{name}_Cup_{tier}_{k+1}", cup, .065*scale, .017*scale,
                      MAT['gold'], fixtures, major_segments=20, minor_segments=6)
            add_cylinder(f"{name}_Candle_{tier}_{k+1}",
                         (cup[0], cup[1], cup[2]+.16*scale), .018*scale,
                         .021*scale, .30*scale, MAT['wax'], fixtures, vertices=12)
            add_flame(f"{name}_Flame_{tier}_{k+1}",
                      (cup[0], cup[1], cup[2]+.34*scale), .060*scale,
                      MAT['flame'], orn)
            tips.append((end[0], end[1], end[2]-.06*scale))

            drop_end = (end[0] + .03*math.cos(a), end[1] + .03*math.sin(a),
                        end[2] - (0.55 if tier==0 else .36)*scale)
            add_crystal_chain(crystals, catmull_rom([(end[0], end[1], end[2]-.02),
                                                     (end[0]+.03*math.cos(a),
                                                      end[1]+.03*math.sin(a),
                                                      end[2]-.25*scale),
                                                     drop_end], 5),
                              spacing=.041*scale, size=.039*scale,
                              seed=seed*1000+tier*77+k)
        arm_tips.append((tips, ring_r))

        for k in range(n_arms):
            p0 = Vector(tips[k]); p1 = Vector(tips[(k+1) % n_arms])
            mid = (p0 + p1) / 2
            mid.z -= (.44 if tier==0 else .25) * scale
            add_crystal_chain(crystals, catmull_rom([p0, mid, p1], 10),
                              spacing=.045*scale, size=.038*scale,
                              seed=seed*2000+tier*53+k)

            add_tube(f"{name}_SwagWire_{tier}_{k+1}",
                     catmull_rom([p0, mid, p1], 10), .006*scale,
                     MAT['brass_dark'], fixtures, sides=4)

    for r, zz, count in ((.76, z_top-1.34, 20), (.48, z_top-1.86, 16),
                         (.32, z_top-2.36, 12)):
        add_crystal_ring(crystals, (0, yc), r*scale, zz*scale + (1-scale)*z_top,
                         count=count, size=.044*scale, seed=seed*3000+int(r*1000))

    for k in range(12):
        a = 2*math.pi*k/12
        r = .36*scale
        p0 = (r*math.cos(a), yc+r*math.sin(a), z_top-.50*scale)
        p1 = (r*.88*math.cos(a), yc+r*.88*math.sin(a), z_top-1.20*scale)
        add_crystal_chain(crystals, catmull_rom([p0, p1], 4),
                          spacing=.043*scale, size=.038*scale,
                          seed=seed*4000+k)

    for k in range(8):
        a = 2*math.pi*k/8
        add_tube(f"{name}_BasketString_{k}",
                 [(.30*scale*math.cos(a), yc+.30*scale*math.sin(a), z_top-2.84*scale),
                  (.16*scale*math.cos(a), yc+.16*scale*math.sin(a), z_top-3.30*scale),
                  (0, yc, z_top-3.32*scale)], .009*scale,
                 MAT['brass_dark'], fixtures, sides=4)

    for k in range(14):
        a = 2*math.pi*k/14
        top_r = .62*scale
        mid_r = .42*scale
        bot_r = .16*scale
        p0 = (top_r*math.cos(a), yc + top_r*math.sin(a), z_top-1.05*scale)
        p1 = (mid_r*math.cos(a), yc + mid_r*math.sin(a), z_top-2.05*scale)
        p2 = (bot_r*math.cos(a), yc + bot_r*math.sin(a), z_top-2.95*scale)
        add_crystal_chain(crystals, catmull_rom([p0, p1, p2], 8),
                          spacing=.042*scale, size=.045*scale,
                          seed=seed*5000+k)
        add_crystal_drop(f"{name}_CascadeDrop_{k+1}",
                         (p2[0], p2[1], z_top-3.22*scale),
                         .072*scale, MAT['crystal'], fixtures)
    crystals.build(f"{name}_Crystals", MAT['crystal'], fixtures)

    ld = bpy.data.lights.new(name + "_WarmGlow", 'POINT')
    ld.energy = light_energy
    ld.color = (1.0, .61, .30)
    ld.shadow_soft_size = .55 * scale
    lamp = bpy.data.objects.new(name + "_WarmGlow", ld)
    collections['CameraLights'].objects.link(lamp)
    lamp.location = (0, yc, z_top - 1.35*scale)

    add_rosette(f"{name}_TopRosette", (0, yc, z_top+.10), .13*scale,
                MAT['gold'], orn, normal=(0,0,-1), petals=8)
    return

def build_chandeliers(collections):
    add_chandelier(collections, 16.0, "Chandelier_Main", scale=1.12,
                   tier_count=2, attach_z=10.96, z_top=8.78, seed=5,
                   light_energy=110.0)
    add_chandelier(collections, 24.0, "Chandelier_Mid", scale=.86,
                   tier_count=2, attach_z=10.96, z_top=9.40, seed=9,
                   light_energy=55.0)
    add_chandelier(collections, 33.0, "Chandelier_Far", scale=.69,
                   tier_count=2, attach_z=10.96, z_top=9.62, seed=13,
                   light_energy=32.0)

def add_exterior(coll):

    x = -14.0
    verts = [(x, -14, -2), (x, 60, -2), (x, 60, 24), (x, -14, 24)]
    faces = [(0, 1, 2, 3)]
    obj = mesh_object("Exterior_Garden_Backdrop_Left", verts, faces,
                      MAT['exterior_sky'], coll)
    obj.visible_shadow = False
    obj.visible_diffuse = False
    obj.visible_glossy = False

    uvl = obj.data.uv_layers.new(name="UVMap")
    for poly in obj.data.polygons:
        for li in poly.loop_indices:
            co = obj.data.vertices[obj.data.loops[li].vertex_index].co
            if poly.normal.y > 0:
                uvl.data[li].uv = ((co.y + 14) / 17.0,
                                   .40 + (co.z - 1.2) * (.55 / 6.0))
            else:
                uvl.data[li].uv = (1 - (co.y + 14) / 17.0,
                                   .40 + (co.z - 1.2) * (.55 / 6.0))

    y = 48.0
    verts2 = [(-7, y, -1), (7, y, -1), (7, y, 16), (-7, y, 16)]
    faces2 = [(0, 1, 2, 3)]
    obj2 = mesh_object("Exterior_Garden_Backdrop_End", verts2, faces2,
                       MAT['exterior_sky'], coll)
    obj2.visible_shadow = False
    uvl2 = obj2.data.uv_layers.new(name="UVMap")
    for poly in obj2.data.polygons:
        for li in poly.loop_indices:
            co = obj2.data.vertices[obj2.data.loops[li].vertex_index].co
            uvl2.data[li].uv = ((co.x + 7) / 14, (co.z + 1) / 17)

    sun_mat = bpy.data.materials.new("M_Sun_Glint")
    sun_mat.use_nodes = True
    nt = sun_mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (1.0, .96, .86, 1)
    em.inputs['Strength'].default_value = 1800.0
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12,
                                         radius=.16, location=(-11.75, 13.68, 7.68))
    sunobj = bpy.context.object
    sunobj.name = "Sun_Glint_Source"
    sunobj.data.materials.append(sun_mat)
    move_to_collection(sunobj, coll)
    sunobj.visible_shadow = False

    for ob in coll.objects:
        ob.visible_shadow = False

def add_light_area(name, loc, size, energy, color, direction, coll,
                   spread=math.pi):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.shape = 'RECTANGLE'
    data.size = size[0]
    data.size_y = size[1]
    data.color = color
    data.spread = spread
    obj = bpy.data.objects.new(name, data)
    coll.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = Vector(direction).normalized().to_track_quat('-Z', 'Y').to_euler()
    return obj

def add_light_point(name, loc, energy, color, radius, coll):
    data = bpy.data.lights.new(name, 'POINT')
    data.energy = energy
    data.color = color
    data.shadow_soft_size = radius
    obj = bpy.data.objects.new(name, data)
    coll.objects.link(obj)
    obj.location = loc
    return obj

def build_lighting(collections):
    lights = collections['CameraLights']

    world = bpy.data.worlds.new("World_Daylight") if not bpy.data.worlds else bpy.data.worlds[0]
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    bg.inputs['Color'].default_value = (.54, .66, .84, 1)
    bg.inputs['Strength'].default_value = .18
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])

    sun_data = bpy.data.lights.new("Sun_Daylight_5200K", 'SUN')
    sun_data.energy = 1500.0
    sun_data.angle = math.radians(.8)
    sun_data.color = (1.0, .925, .805)
    sun = bpy.data.objects.new("Sun_Daylight_5200K", sun_data)
    lights.objects.link(sun)
    direction = Vector((0.75, 0.35, -0.56)).normalized()
    sun.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    sun.location = (-18, 4, 22)

    for i, yc in enumerate(WINDOW_CENTERS):
        add_light_area(f"Window_SkyFill_{i+1}", (-7.2, yc, 4.0),
                       (3.6, 5.4), 45.0, (.92, .95, 1.0),
                       (1.0, -.02, -.20), lights, spread=math.radians(145))

    add_light_area("Interior_Bounce_Fill", (0, 23.0, 9.5), (7.8, 19.0),
                   95.0, (1.0, .93, .84), (0, .10, -1.0), lights,
                   spread=math.radians(160))
    add_light_area("Entrance_Bounce_Fill", (0, 1.5, 3.4), (8.0, 5.6),
                   30.0, (1.0, .92, .84), (0, 1, .18), lights,
                   spread=math.radians(150))

    add_light_area("Apse_Window_KeyLight", (0, 46.05, 4.2), (3.9, 5.8),
                   360.0, (1.0, .94, .84), (0, -1, -.04), lights,
                   spread=math.radians(130))
    add_light_area("Apse_Soft_RimLight", (0, 45.2, 7.4), (2.4, 2.4),
                   54.0, (1.0, .89, .72), (0, -1, -.55), lights,
                   spread=math.radians(150))

    for i, yc in enumerate((9.0, 21.0, 33.0)):
        add_light_point(f"Warm_Sconce_Glow_{i+1}", (-5.35, yc, 4.7),
                        6.0, (1.0, .55, .22), .16, lights)
    add_light_point("End_Statue_Rim", (0, 45.6, 4.0), 90.0,
                    (1.0, .86, .68), .5, lights)
    add_light_point("End_Statue_FrontFill", (0, 42.2, 3.0), 65.0,
                    (.82, .88, 1.0), .8, lights)
    add_light_point("Near_Window_WarmBounce", (-4.2, 10.0, 2.1), 20.0,
                    (1.0, .76, .48), 1.0, lights)

    add_light_area("Vault_Bounce_Fill", (0, 20.0, 7.45), (8.5, 16.0),
                   90.0, (1.0, .90, .76), (0, -.06, 1.0), lights,
                   spread=math.radians(125))
    add_light_area("Far_Vault_Bounce_Fill", (0, 36.0, 7.65), (6.0, 9.0),
                   50.0, (1.0, .89, .75), (0, -.04, 1.0), lights,
                   spread=math.radians(125))

    add_light_area("End_Lunette_Fill", (0, 36.5, 6.4), (7.0, 3.4),
                   80.0, (1.0, .90, .76), (0, 1.0, .38), lights,
                   spread=math.radians(125))
    return sun

def add_camera(collections):
    cam_data = bpy.data.cameras.new("Camera_Main")
    cam = bpy.data.objects.new("Camera_Main", cam_data)
    collections['CameraLights'].objects.link(cam)
    cam.location = (-2.20, 5.50, 1.65)
    cam.rotation_euler = (math.radians(90), 0, math.radians(16.0))
    cam_data.lens = 24.0
    cam_data.sensor_width = 36.0
    cam_data.sensor_fit = 'HORIZONTAL'
    cam_data.shift_y = 0.13
    cam_data.shift_x = 0.0
    cam_data.clip_start = .05
    cam_data.clip_end = 120.0
    bpy.context.scene.camera = cam

    cam_data.dof.use_dof = False
    return cam

def configure_render():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 96
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = .025
    scene.cycles.use_denoising = True
    try:
        scene.cycles.denoiser = 'OPENIMAGEDENOISE'
        scene.cycles.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
        scene.cycles.denoising_prefilter = 'ACCURATE'
    except Exception:
        pass
    scene.cycles.max_bounces = 8
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 5
    scene.cycles.transmission_bounces = 8
    scene.cycles.transparent_max_bounces = 16
    scene.cycles.sample_clamp_indirect = 4.0
    scene.cycles.caustics_reflective = False
    scene.cycles.caustics_refractive = False
    scene.cycles.use_light_tree = True
    scene.render.resolution_x = 1536
    scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.color_depth = '8'
    scene.render.fps = 24
    scene.render.filepath = str(ROOT / "final.png")
    try:
        scene.cycles.pixel_filter_type = 'BLACKMAN_HARRIS'
        scene.cycles.filter_width = 1.3
    except Exception:
        pass

    scene.view_settings.view_transform = 'AgX'
    try:
        scene.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        pass
    scene.view_settings.exposure = -.30
    scene.view_settings.gamma = 1.0
    scene.display_settings.display_device = 'sRGB'

    scene.use_nodes = False

def save_and_export():
    scene = bpy.context.scene

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    try:
        bpy.ops.file.make_paths_relative()
    except Exception as e:
        print("make_paths_relative:", e)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    try:
        bpy.ops.export_scene.gltf(filepath=str(GLB_PATH), export_format='GLB',
                                  use_selection=False, export_apply=True,
                                  export_texcoords=True, export_normals=True,
                                  export_tangents=False, export_materials='EXPORT',
                                  export_cameras=True, export_lights=True,
                                  export_yup=True,
                                  export_hierarchy_full_collections=True)
    except Exception as e:
        print("GLB export failed:", e)
    print("Saved:", BLEND_PATH, "and", GLB_PATH)

def main():
    reset_scene()
    global COLLS
    s = bpy.context.scene
    s.unit_settings.system = 'METRIC'
    s.unit_settings.scale_length = 1.0
    root = s.collection
    COLLS = {
        'Architecture': make_collection("Architecture", root),
        'Openings': make_collection("Openings", root),
        'Ornament': make_collection("Ornament", root),
        'Furniture': make_collection("Furniture", root),
        'Fixtures': make_collection("Fixtures", root),
        'CameraLights': make_collection("CameraLights", root),
        'Exterior': make_collection("Exterior", root),
    }

    for name, parent in (("WindowBays", COLLS['Openings']),
                         ("MirrorNiches", COLLS['Openings']),
                         ("EndPortal", COLLS['Openings'])):
        make_collection(name, parent)
    create_materials()
    print("[build] architecture")
    build_floor(COLLS)
    build_side_walls(COLLS)
    add_baseboard_and_wainscot(COLLS)
    add_wall_panels(COLLS)
    add_pilaster_kit(COLLS)
    build_cornice(COLLS)
    build_ceiling(COLLS)
    print("[build] windows and curtains")
    build_all_windows(COLLS)
    print("[build] mirrors and consoles")
    for i, yc in enumerate(MIRROR_LEFT, start=1):
        build_mirror_niche(COLLS, -1, yc, i, with_crest=True,
                           over_console=True)
    print("[build] right-wall furniture")
    build_right_wall_furniture(COLLS)
    print("[build] end wall / apse")
    build_end_wall(COLLS)
    print("[build] chandeliers")
    build_chandeliers(COLLS)
    print("[build] exterior")
    add_exterior(COLLS['Exterior'])
    print("[build] camera and lighting")
    add_camera(COLLS)
    build_lighting(COLLS)
    configure_render()

    bpy.context.view_layer.update()
    print("[build] saving")
    save_and_export()
    print("[build] done")

if __name__ == "__main__":
    main()
