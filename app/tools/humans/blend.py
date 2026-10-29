"""Blender side of the human builder: objects, armature, skinning, shape keys, decimation, export, preview."""
from __future__ import annotations

import math

import bpy  # noqa: I001 (bpy first: it makes bmesh and mathutils importable)
import bmesh
import numpy as np
from mathutils import Vector

from mh import Piece


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)


def material(name: str, color=(0.8, 0.8, 0.8, 1), rough=0.7):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bsdf = m.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Roughness'].default_value = rough
    return m


def armature(name: str, bones: dict) -> bpy.types.Object:
    arm = bpy.data.armatures.new(name)
    ob = bpy.data.objects.new(name, arm)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for bn, (h, t, roll, _) in bones.items():
        eb = arm.edit_bones.new(bn)
        eb.head = Vector(h)
        eb.tail = Vector(t)
        eb.roll = roll
    for bn, (_, _, _, parent) in bones.items():
        if parent:
            arm.edit_bones[bn].parent = arm.edit_bones[parent]
            arm.edit_bones[bn].use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    ob.select_set(False)
    return ob


def mesh_object(p: Piece, rig: bpy.types.Object | None, mat_color=(0.8, 0.8, 0.8, 1)) -> bpy.types.Object:
    me = bpy.data.meshes.new(p.name)
    me.from_pydata(p.V.tolist(), [], p.F)
    me.update()
    uvl = me.uv_layers.new(name='UVMap')
    flat = [uv for f in p.UV for uv in f]
    uvl.data.foreach_set('uv', np.array(flat, np.float32).ravel())
    if p.uv2 is not None:
        uv2 = me.uv_layers.new(name='UV2')
        uv2.data.foreach_set('uv', np.array([uv for f in p.uv2 for uv in f], np.float32).ravel())
    if p.colors is not None:
        ca = me.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
        ca.data.foreach_set('color', p.colors.astype(np.float32).ravel())
    for poly in me.polygons:
        poly.use_smooth = True
    ob = bpy.data.objects.new(p.name, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(material(p.material, mat_color))
    if rig is not None:
        groups: dict[str, bpy.types.VertexGroup] = {}
        for vi, wd in enumerate(p.W):
            # four strongest influences, normalised (what a game engine skins with)
            top = sorted(wd.items(), key=lambda kv: -kv[1])[:4]
            s = sum(w for _, w in top) or 1
            for bn, w in top:
                g = groups.get(bn) or ob.vertex_groups.new(name=bn)
                groups[bn] = g
                g.add([vi], w / s, 'REPLACE')
        ob.parent = rig
        mod = ob.modifiers.new('Armature', 'ARMATURE')
        mod.object = rig
    return ob


def subdivide(ob: bpy.types.Object, cuts=1, smooth=1.0, times=1):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    for _ in range(times):
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True, smoothness=smooth)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()


def coords(ob) -> np.ndarray:
    a = np.empty(len(ob.data.vertices) * 3)
    ob.data.vertices.foreach_get('co', a)
    return a.reshape(-1, 3)


def set_coords(ob, V: np.ndarray):
    ob.data.vertices.foreach_set('co', V.astype(np.float64).ravel())
    ob.data.update()


def add_shape_keys(ob: bpy.types.Object, keys: dict[str, np.ndarray]):
    """keys: name -> absolute coordinates for every vertex (same order)."""
    if not keys:
        return
    if ob.data.shape_keys is None:
        ob.shape_key_add(name='Basis', from_mix=False)
    for name, V in keys.items():
        k = ob.shape_key_add(name=name, from_mix=False)
        k.data.foreach_set('co', V.astype(np.float64).ravel())
        k.value = 0.0


def decimate(ob: bpy.types.Object, ratio: float, protect: np.ndarray | None = None):
    """Collapse decimation; protected vertices (weight 0) keep their place (the face)."""
    if ratio >= 0.999:
        return
    mod = ob.modifiers.new('Decimate', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = ratio
    mod.use_collapse_triangulate = False
    if protect is not None:
        g = ob.vertex_groups.new(name='_decimate')
        free = [i for i in range(len(ob.data.vertices)) if not protect[i]]
        g.add(free, 1.0, 'REPLACE')
        mod.vertex_group = '_decimate'
        mod.vertex_group_factor = 1.0
    # the decimate must run before the armature: move it to the top and apply it
    bpy.context.view_layer.objects.active = ob
    while ob.modifiers[0].name != 'Decimate':
        bpy.ops.object.modifier_move_up(modifier='Decimate')
    bpy.ops.object.modifier_apply(modifier='Decimate')
    if protect is not None:
        ob.vertex_groups.remove(ob.vertex_groups['_decimate'])


def export_glb(path: str, objects: list[bpy.types.Object]):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_yup=True,
        export_skins=True, export_morph=True, export_morph_normal=False, export_animations=False,
        export_texcoords=True, export_normals=True, export_materials='EXPORT', export_image_format='NONE',
        export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_apply=False,
    )


def preview(path: str, size=(720, 900), cam_loc=(0.0, -2.6, 0.95), look=(0.0, 0.0, 0.75), lens=55, samples=24):
    """A quick Cycles render to look at a character (CPU)."""
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = samples
    scn.cycles.use_denoising = True
    try:
        scn.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    scn.render.resolution_x, scn.render.resolution_y = size
    scn.render.film_transparent = False
    scn.view_settings.view_transform = 'AgX'
    world = bpy.data.worlds.new('w')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.7, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    scn.world = world
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.lens = lens
    scn.collection.objects.link(cam)
    cam.location = Vector(cam_loc)
    d = Vector(look) - Vector(cam_loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scn.camera = cam
    for name, loc, energy, size_ in [('key', (-2.2, -2.4, 3.2), 380, 1.6), ('fill', (2.6, -1.8, 1.6), 120, 2.5), ('rim', (1.2, 2.6, 2.8), 260, 1.0)]:
        L = bpy.data.lights.new(name, 'AREA')
        L.energy = energy
        L.size = size_
        lo = bpy.data.objects.new(name, L)
        lo.location = Vector(loc)
        lo.rotation_euler = (Vector((0, 0, 0.9)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        scn.collection.objects.link(lo)
    ground = bpy.data.meshes.new('ground')
    ground.from_pydata([(-6, -6, 0), (6, -6, 0), (6, 6, 0), (-6, 6, 0)], [], [(0, 1, 2, 3)])
    g = bpy.data.objects.new('ground', ground)
    g.data.materials.append(material('ground', (0.42, 0.24, 0.15, 1), 0.95))
    scn.collection.objects.link(g)
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)
