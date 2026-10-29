"""
Export the players and their motion capture for the Unity match game (Lionceaux Football).

  python3 tools/humans/export_unity.py <out_dir> [archetype ...]

Characters: the same bodies as the web game (MakeHuman/MPFB, CC0), dressed for football only (shirt,
shorts, socks, boots, keeper gloves and long sleeves, the hair styles), without the facial expression
shape keys, re-posed into a T-pose and exported as FBX with that pose as rest, so Unity's Humanoid
avatar maps cleanly and any humanoid clip (ours, or Mixamo later) plays on every body.

Motions: the CMU clips retargeted by motions.py, baked as actions on the A-pose rig and exported in one
FBX (one take per clip). FBX stores each bone's full local transform, so a clip baked on the A-pose rig
describes the same bone frames as the T-pose characters: Unity reads it through the boy's avatar.
"""
from __future__ import annotations

import json
import math
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402

import blend  # noqa: E402
import build as BUILD  # noqa: E402
import mh  # noqa: E402
import motions as MO  # noqa: E402

FOOTBALL = ['shirt', 'shorts', 'socks', 'boots', 'gloves', 'longsleeves']
ARCHETYPES = ['boy', 'boyLean', 'boyBig', 'man']
CLIPS = ['idle', 'jog', 'run', 'sprint', 'strafeL', 'strafeR', 'walkBack', 'walk', 'kickR', 'kickR2', 'kickR3',
         'celebrate', 'happy', 'jumpJoy', 'sad', 'highFive', 'throw', 'getUp', 'slip', 'point', 'wave']


def fbx(path: str, objects, anim: bool):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.fbx(
        filepath=path, use_selection=True, object_types={'ARMATURE', 'MESH'}, add_leaf_bones=False,
        primary_bone_axis='Y', secondary_bone_axis='X', armature_nodetype='NULL', axis_forward='-Z', axis_up='Y',
        apply_unit_scale=True, apply_scale_options='FBX_SCALE_ALL', mesh_smooth_type='FACE', use_mesh_modifiers=False,
        colors_type='LINEAR', use_custom_props=False, path_mode='STRIP', use_armature_deform_only=False,
        bake_anim=anim, bake_anim_use_all_bones=True, bake_anim_use_nla_strips=False, bake_anim_use_all_actions=anim,
        bake_anim_force_startend_keying=True, bake_anim_step=1.0, bake_anim_simplify_factor=0.0,
    )


def aim(arm, bone: str, want: Vector):
    """Rotate a pose bone (armature space) so its head->tail points along `want`."""
    pb = arm.pose.bones[bone]
    M = pb.matrix.copy()
    d = (pb.tail - pb.head).normalized()
    q = d.rotation_difference(want.normalized())
    R = q.to_matrix() @ M.to_3x3()
    N = R.to_4x4()
    N.translation = M.translation
    pb.matrix = N
    bpy.context.view_layer.update()


def tpose(arm, meshes):
    """Arms out sideways and legs straight down, then make that the rest pose (meshes deformed to it)."""
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    for s, sx in (('l', 1.0), ('r', -1.0)):
        for b in ('upperarm', 'lowerarm', 'hand'):
            aim(arm, f'{b}_{s}', Vector((sx, 0.0, 0.0)))
        for b in ('thigh', 'calf'):
            aim(arm, f'{b}_{s}', Vector((0.0, 0.0, -1.0)))
    bpy.ops.object.mode_set(mode='OBJECT')
    for ob in meshes:
        if ob.data.shape_keys:
            ob.shape_key_clear()
        mod = next((m for m in ob.modifiers if m.type == 'ARMATURE'), None)
        if mod is None:
            continue
        with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.select_all(action='SELECT')
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    for ob in meshes:
        m = ob.modifiers.new('Armature', 'ARMATURE')
        m.object = arm


# footballers: more muscle and athletic proportions than the story's townspeople
ATHLETE = {'boy': dict(muscle=0.62, weight=0.4, proportions=0.85), 'boyLean': dict(muscle=0.64, weight=0.33, proportions=0.88),
           'boyBig': dict(muscle=0.8, weight=0.55, proportions=0.88), 'man': dict(muscle=0.78, weight=0.45, proportions=0.92)}


def character(name: str, out: str):
    import dataclasses
    spec = BUILD.ARCHETYPES[name]
    if name in ATHLETE:
        spec = dict(spec, macro=dataclasses.replace(spec['macro'], **ATHLETE[name]))
        BUILD.ARCHETYPES[name] = spec
    BUILD.BODY_DECIMATE = 0.85
    keep_hair = [h for h in spec['hair'] if h in ('crop', 'afro', 'twists', 'puff', 'long', 'ponytail')]
    BUILD.ARCHETYPES[name] = dict(spec, wardrobe=[w for w in FOOTBALL if w in spec['wardrobe'] or w in ('gloves', 'longsleeves')], hair=keep_hair)
    arm, objs = BUILD.build(name, export=False)
    meshes = list(objs.values())
    tpose(arm, meshes)
    arm.name = 'rig'
    path = os.path.join(out, f'{name}.fbx')
    fbx(path, [arm] + meshes, anim=False)
    # skin detail maps (scalp, lips, brows / palms, nails, lids) for the runtime skin texture
    src = os.path.join(BUILD.OUT, f'{name}_skinA.png')
    if os.path.exists(src):
        shutil.copy(src, os.path.join(out, f'{name}_skinA.png'))
        shutil.copy(os.path.join(BUILD.OUT, f'{name}_skinB.png'), os.path.join(out, f'{name}_skinB.png'))
    h = max(v[2] for o in meshes if o.name == 'body' for v in [(o.matrix_world @ vv.co) for vv in o.data.vertices])
    print(f'[{name}] {path} {os.path.getsize(path) / 1e6:.2f} MB, height {h:.2f} m, pieces {sorted(objs)}')
    return {'height': float(h), 'kid': bool(spec['kid']), 'pieces': sorted(objs)}


def rest_to_tpose(arm, acts):
    def rest_local(b):
        return (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local.copy()
    R = {b.name: rest_local(b) for b in arm.data.bones}
    scene = bpy.context.scene
    samples = []
    for act in acts:
        arm.animation_data.action = act
        f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
        frames = []
        for f in range(f0, f1 + 1):
            scene.frame_set(f)
            frames.append({pb.name: pb.matrix_basis.copy() for pb in arm.pose.bones})
        samples.append((act.name, frames))
    arm.animation_data.action = None
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    bpy.context.view_layer.update()
    # the same T-pose the bodies get
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    for s_, sx in (('l', 1.0), ('r', -1.0)):
        for b in ('upperarm', 'lowerarm', 'hand'):
            aim(arm, f'{b}_{s_}', Vector((sx, 0.0, 0.0)))
        for b in ('thigh', 'calf'):
            aim(arm, f'{b}_{s_}', Vector((0.0, 0.0, -1.0)))
    bpy.ops.pose.select_all(action='SELECT')
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    R2 = {b.name: rest_local(b) for b in arm.data.bones}
    conv = {n: R2[n].inverted() @ R[n] for n in R}
    for a in acts:
        a.name = a.name + '__A'
    out = []
    for name, frames in samples:
        act = bpy.data.actions.new(name)
        act.use_fake_user = True
        arm.animation_data.action = act
        for i, fr in enumerate(frames):
            for pb in arm.pose.bones:
                Q2 = conv[pb.name] @ fr[pb.name]
                loc, rot, _sc = Q2.decompose()
                pb.rotation_quaternion = rot
                pb.keyframe_insert('rotation_quaternion', frame=i + 1, group=pb.name)
                if pb.name == 'pelvis':
                    pb.location = loc
                    pb.keyframe_insert('location', frame=i + 1, group=pb.name)
        act.frame_range = (1, len(frames))
        out.append(act)
    for a in acts:
        a.use_fake_user = False
        bpy.data.actions.remove(a)
    for pb in arm.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    return out


def clips(out: str):
    blend.reset()
    bpy.context.scene.render.fps = MO.FPS
    vb = mh.shape(mh.Macro(gender=1.0, age=10.5, muscle=0.5, weight=0.42, height=0.55))
    rig, _ = mh.rig_data()
    B = mh.bones(vb, rig)
    arm = blend.armature('rig', B)
    tgt = MO.Target(arm)
    meta = {}
    acts = []
    for name in CLIPS:
        spec = MO.CLIPS[name]
        variants = [(name, spec)]
        if name.startswith('kickR'):
            variants.append((name.replace('kickR', 'kickL'), (spec[0], spec[1], dict(spec[2], mirror=True, event='kickL'))))
        for nm, sp in variants:
            try:
                basis, loc, info, _w, _p = MO.make_clip(nm, sp, tgt, None, None)
            except Exception as e:
                print('  !!', nm, e)
                continue
            act = MO.bake(tgt, nm, basis, loc)
            acts.append(act)
            meta[nm] = {k: v for k, v in info.items() if k in ('loop', 'speed', 'contact', 'duration', 'frames', 'fps', 'source')}
            print('  clip', nm, meta[nm])
    # re-express every clip over the T-pose rest the bodies use: the bones' armature-space poses stay
    # exactly the same, only their rest changes (Q' = R'^-1 R Q per bone), so Unity can build this file's
    # own Humanoid avatar from the same T-pose and retarget it to every body
    acts = rest_to_tpose(arm, acts)
    # a one-triangle mesh skinned to the pelvis, so the file has the same node layout as the bodies
    # (file / rig / Root ...); with the rig alone, Unity folds the rig node into the file's root
    me = bpy.data.meshes.new('clipmesh')
    p0 = Vector(B['pelvis'][0])
    me.from_pydata([tuple(p0), tuple(p0 + Vector((0.01, 0, 0))), tuple(p0 + Vector((0, 0, 0.01)))], [], [(0, 1, 2)])
    ob = bpy.data.objects.new('clipmesh', me)
    bpy.context.scene.collection.objects.link(ob)
    vg = ob.vertex_groups.new(name='pelvis')
    vg.add([0, 1, 2], 1.0, 'REPLACE')
    ob.parent = arm
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    # every action exported as its own take
    arm.animation_data.action = acts[0]
    for a in acts:
        a.use_fake_user = True
    path = os.path.join(out, 'motions.fbx')
    fbx(path, [arm, ob], anim=True)
    json.dump({'fps': MO.FPS, 'clips': meta, 'credit': 'CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu)'},
              open(os.path.join(out, 'motions.json'), 'w'), indent=1)
    print(f'motions {path} {os.path.getsize(path) / 1e6:.2f} MB, {len(acts)} clips')


if __name__ == '__main__':
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    names = [a for a in sys.argv[2:] if not a.startswith('-')]
    info = {}
    if '--no-clips' not in sys.argv:
        clips(out)
    for n in names or ARCHETYPES:
        info[n] = character(n, out)
    json.dump(info, open(os.path.join(out, 'characters.json'), 'w'), indent=1)
