"""
The people who watch: static figures baked from the real characters in poses from the motion
library (standing, waiting, sitting on a wall, cheering), joined into one mesh each, decimated, with
a region code in the vertex colours (skin, shirt, shorts or skirt, hair, shoes, eyes) so the game can
dress every instance differently. Run: python3 tools/humans/crowd.py -> public/jeux/humans/crowd_*.glb
"""
from __future__ import annotations

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import blend  # noqa: E402
import build as BLD  # noqa: E402
import motions as MO  # noqa: E402

OUT = BLD.OUT
REGION = {'skin': 0.1, 'shirt': 0.3, 'bottom': 0.5, 'hair': 0.7, 'shoes': 0.85, 'eye': 0.97}

MAN = ['body', 'forearms', 'eye_l', 'eye_r', 'hair_crop', 'shirt', 'trousers', 'shoe_l', 'shoe_r']
# name: (archetype, clip, seconds into the clip, pieces[, triangles])
VARIANTS = {
    'kidStand': ('boy', 'idleRelaxed', 1.0, ['body', 'calves', 'thighs', 'forearms', 'feet', 'eye_l', 'eye_r', 'hair_crop', 'shirt', 'shorts']),
    'kidWait': ('boy', 'idle', 2.2, ['body', 'calves', 'thighs', 'forearms', 'feet', 'eye_l', 'eye_r', 'hair_afro', 'shirt', 'shorts']),
    'kidSit': ('boy', 'sitIdle', 1.5, ['body', 'calves', 'thighs', 'forearms', 'feet', 'eye_l', 'eye_r', 'hair_crop', 'shirt', 'shorts']),
    'kidCheer': ('girl', 'jumpJoy', 1.2, ['body', 'calves', 'thighs', 'forearms', 'feet', 'eye_l', 'eye_r', 'hair_crop', 'hair_puff', 'shirt', 'shorts']),
    'manStand': ('man', 'idleRelaxed', 2.0, ['body', 'forearms', 'eye_l', 'eye_r', 'hair_crop', 'shirt', 'trousers', 'shoe_l', 'shoe_r']),
    'womanStand': ('woman', 'idleRelaxed', 0.5, ['body', 'forearms', 'feet', 'eye_l', 'eye_r', 'hair_wrap', 'wrap_knot', 'dress_top', 'skirt']),
    # the stadium: far away and by the thousand, so a lighter cut of each figure
    'fanSit': ('man', 'sitIdle', 1.5, MAN, 560),
    'fanStand': ('man', 'idleRelaxed', 2.0, MAN, 560),
    'fanCheer': ('man', 'jumpJoy', 1.2, MAN, 560),
    'fanWomanSit': ('woman', 'sitIdle', 1.5, ['body', 'forearms', 'feet', 'eye_l', 'eye_r', 'hair_wrap', 'wrap_knot', 'dress_top', 'skirt'], 560),
}


def region_of(name: str) -> float:
    if name in ('body', 'calves', 'thighs', 'forearms', 'feet'):
        return REGION['skin']
    if name in ('shirt', 'longsleeves', 'dress_top'):
        return REGION['shirt']
    if name in ('shorts', 'trousers', 'skirt'):
        return REGION['bottom']
    if name.startswith('hair_') or name == 'wrap_knot' or name == 'beard':
        return REGION['hair']
    if name.startswith(('shoe_', 'trainer_', 'boot_', 'sock_')):
        return REGION['shoes']
    if name.startswith('eye_'):
        return REGION['eye']
    return REGION['skin']


def bake(name: str, fbx_dir: str | None = None):
    arch, clip, t, keep = VARIANTS[name][:4]
    target_tris = VARIANTS[name][4] if len(VARIANTS[name]) > 4 else 2600
    arm, objs = BLD.build(arch, export=False)
    tgt = MO.Target(arm)
    basis, loc, info, world, pel = MO.make_clip(clip, MO.CLIPS[clip], tgt, None, None)
    i = min(len(loc) - 1, int(t * MO.FPS))
    for b, mats in basis.items():
        pb = arm.pose.bones[b]
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = Matrix(mats[i].tolist()).to_quaternion()
    arm.pose.bones['pelvis'].location = Vector(loc[i])
    bpy.context.view_layer.update()
    seat = float((arm.matrix_world @ arm.pose.bones['pelvis'].head)[2]) - 0.075
    dg = bpy.context.evaluated_depsgraph_get()
    baked = []
    for n in keep:
        o = objs.get(n)
        if o is None:
            continue
        ev = o.evaluated_get(dg)
        me = bpy.data.meshes.new_from_object(ev, depsgraph=dg)
        for ca in list(me.color_attributes):
            me.color_attributes.remove(ca)
        while me.uv_layers:
            me.uv_layers.remove(me.uv_layers[0])
        ca = me.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
        r = region_of(n)
        ca.data.foreach_set('color', np.tile([r, 0, 0, 1], len(me.vertices)).astype(np.float32))
        me.color_attributes.active_color = ca
        nob = bpy.data.objects.new(f'{name}_{n}', me)
        nob.matrix_world = o.matrix_world.copy()
        bpy.context.scene.collection.objects.link(nob)
        baked.append(nob)
    for o in list(objs.values()) + [arm]:
        bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in baked:
        o.select_set(True)
    bpy.context.view_layer.objects.active = baked[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if tris > target_tris:
        blend.decimate(ob, target_tris / tris)
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if fbx_dir:
        # the Unity match game: FBX, the region code in the vertex colours, no uvs
        os.makedirs(fbx_dir, exist_ok=True)
        bpy.ops.object.select_all(action='DESELECT')
        ob.select_set(True)
        bpy.ops.export_scene.fbx(filepath=os.path.join(fbx_dir, f'crowd_{name}.fbx'), use_selection=True, object_types={'MESH'},
                                 axis_forward='-Z', axis_up='Y', apply_unit_scale=True, apply_scale_options='FBX_SCALE_ALL',
                                 mesh_smooth_type='FACE', colors_type='LINEAR', bake_anim=False)
        print(f'[crowd {name}] {tris} tris -> fbx')
        bpy.data.objects.remove(ob)
        return {'seat': round(seat, 3), 'kid': arch in ('boy', 'girl', 'boyLean', 'boyBig')}
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f'crowd_{name}.glb'), export_format='GLB', use_selection=True, export_yup=True,
                              export_animations=False, export_skins=False, export_morph=False, export_normals=True, export_texcoords=False,
                              export_materials='NONE', export_vertex_color='ACTIVE', export_all_vertex_colors=False)
    print(f'[crowd {name}] {tris} tris, {os.path.getsize(os.path.join(OUT, f"crowd_{name}.glb")) / 1e3:.0f} kB')
    return {'seat': round(seat, 3), 'kid': arch in ('boy', 'girl', 'boyLean', 'boyBig')}


if __name__ == '__main__':
    import json
    meta = {}
    for n in [a for a in sys.argv[1:] if not a.startswith('-')] or list(VARIANTS):
        meta[n] = bake(n)
    path = os.path.join(OUT, 'crowd.json')
    old = json.load(open(path)) if os.path.exists(path) else {}
    old.update(meta)
    json.dump(old, open(path, 'w'), indent=1)
