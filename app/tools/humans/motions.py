"""
Motion capture for the Jeux players: the CMU Graphics Lab Motion Capture Database (free to use,
including in commercial products; not to be resold as data), in the MotionBuilder-friendly BVH
conversion by B. Hahne (github.com/una-dinosauria/cmu-mocap), retargeted onto our game_engine rig.

Retargeting: every BVH starts with a T-pose. For each mapped bone, the motion is the source bone's
world rotation relative to that T-pose, applied to our bone after a one-off alignment of our rest
pose (MakeHuman's A-pose) onto the T-pose. The hips move with the source, scaled to our leg length.
Locomotion is cut to its cleanest gait cycle, looped, put in place (the game moves the player), and
its speed recorded so the feet do not slide. Kicks remember the frame the foot meets the ball.

Run:  python3 tools/humans/motions.py   ->  public/jeux/humans/motions.glb + motions.json
"""
from __future__ import annotations

import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
from mathutils import Matrix, Quaternion, Vector  # noqa: E402

import blend  # noqa: E402
import mh  # noqa: E402

CMU = os.environ.get('CMU_BVH', '/home/claude/assets-src/cmu-mocap/data')
OUT = os.path.join(os.path.dirname(__file__), '../../public/jeux/humans')
SHEETS = os.environ.get('SHEETS_DIR', '/tmp/motion-sheets')
FPS = 30

# our bone <- (source bone, source bone the direction points to)
MAP = {
    'pelvis': ('Hips', None), 'spine_01': ('LowerBack', None), 'spine_02': ('Spine', None), 'spine_03': ('Spine1', None),
    'neck_01': ('Neck', None), 'head': ('Head', None),
    'clavicle_l': ('LeftShoulder', 'LeftArm'), 'upperarm_l': ('LeftArm', 'LeftForeArm'), 'lowerarm_l': ('LeftForeArm', 'LeftHand'), 'hand_l': ('LeftHand', 'LeftHandIndex1'),
    'clavicle_r': ('RightShoulder', 'RightArm'), 'upperarm_r': ('RightArm', 'RightForeArm'), 'lowerarm_r': ('RightForeArm', 'RightHand'), 'hand_r': ('RightHand', 'RightHandIndex1'),
    'thigh_l': ('LeftUpLeg', 'LeftLeg'), 'calf_l': ('LeftLeg', 'LeftFoot'), 'foot_l': ('LeftFoot', 'LeftToeBase'), 'ball_l': ('LeftToeBase', '_tail'),
    'thigh_r': ('RightUpLeg', 'RightLeg'), 'calf_r': ('RightLeg', 'RightFoot'), 'foot_r': ('RightFoot', 'RightToeBase'), 'ball_r': ('RightToeBase', '_tail'),
}
ORDER = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head', 'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l',
         'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r', 'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'thigh_r', 'calf_r', 'foot_r', 'ball_r']
SWAP = {**{k: k.replace('_l', '_r') for k in MAP if k.endswith('_l')}, **{k: k.replace('_r', '_l') for k in MAP if k.endswith('_r')}}

# name: (file, mode, options)
#   mode 'loop': cleanest cycle in [t0, t1] (seconds), lengths in [lmin, lmax]; travel: fwd/back/left/right
#   mode 'clip': the window [t0, t1]; 'event': 'kickL'/'kickR' finds the strike and keeps [before, after] around it
CLIPS: dict[str, tuple[str, str, dict]] = {
    'idle': ('141_20', 'clip', dict(t0=1.2, t1=5.5, loop=True)),
    'idleRelaxed': ('142_13', 'clip', dict(t0=1.0, t1=5.0, loop=True)),
    'walk': ('08_02', 'loop', dict(t0=0.5, t1=6, lmin=0.9, lmax=1.35, travel='fwd')),
    'walkSad': ('91_13', 'loop', dict(t0=0.6, t1=8, lmin=0.95, lmax=1.6, travel='fwd', vmin=0.25)),
    'walkOld': ('142_12', 'loop', dict(t0=0.6, t1=8, lmin=0.9, lmax=1.7, travel='fwd', vmin=0.25)),
    'walkBack': ('141_31', 'loop', dict(t0=0.6, t1=8, lmin=0.8, lmax=1.4, travel='back')),
    'jog': ('35_17', 'loop', dict(t0=0.4, t1=6, lmin=0.55, lmax=0.85, travel='fwd')),
    'run': ('09_01', 'loop', dict(t0=0.3, t1=4, lmin=0.5, lmax=0.8, travel='fwd')),
    'sprint': ('16_55', 'loop', dict(t0=0.3, t1=4, lmin=0.45, lmax=0.75, travel='fwd')),
    'strafeL': ('127_13', 'loop', dict(t0=0.4, t1=5, lmin=0.45, lmax=1.0, travel='left')),
    'strafeR': ('127_14', 'loop', dict(t0=0.4, t1=5, lmin=0.45, lmax=1.0, travel='right')),
    'kickR': ('10_01', 'event', dict(event='kickR', before=0.9, after=0.8)),
    'kickR2': ('10_02', 'event', dict(event='kickR', before=0.9, after=0.8)),
    'kickR3': ('11_01', 'event', dict(event='kickR', before=0.9, after=0.8)),
    'celebrate': ('142_09', 'clip', dict(t0=0.8, t1=5.5)),
    'happy': ('80_43', 'clip', dict(t0=0.8, t1=5.5)),
    'jumpJoy': ('49_02', 'clip', dict(t0=0.8, t1=4.5)),
    'sad': ('79_71', 'clip', dict(t0=1.0, t1=6.0, loop=True)),
    'cry': ('79_72', 'clip', dict(t0=1.0, t1=6.0, loop=True)),
    'laugh': ('79_70', 'clip', dict(t0=1.0, t1=5.0, loop=True)),
    'talk': ('18_08', 'clip', dict(t0=1.0, t1=7.0, loop=True)),
    'argue': ('80_48', 'clip', dict(t0=1.0, t1=7.0, loop=True)),
    'wave': ('141_16', 'clip', dict(t0=0.6, t1=3.6)),
    'shrug': ('141_21', 'clip', dict(t0=0.6, t1=3.2)),
    'point': ('13_27', 'clip', dict(t0=1.0, t1=5.0)),
    'throw': ('111_33', 'clip', dict(t0=0.6, t1=3.6)),
    'sitDown': ('75_17', 'clip', dict(t0=0.6, t1=5.0)),
    'sitIdle': ('13_04', 'clip', dict(t0=2.0, t1=7.0, loop=True)),
    'sitGround': ('82_05', 'clip', dict(t0=2.0, t1=8.0, loop=True)),
    'getUp': ('111_06', 'clip', dict(t0=0.5, t1=4.0)),
    'slip': ('90_17', 'clip', dict(t0=0.5, t1=3.5)),
    'dance': ('60_01', 'clip', dict(t0=2.0, t1=8.0, loop=True)),
    'sew': ('79_05', 'clip', dict(t0=2.0, t1=8.0, loop=True)),
    'highFive': ('141_22', 'clip', dict(t0=0.5, t1=3.5)),
    'mope': ('141_27', 'clip', dict(t0=0.6, t1=5.0, loop=True)),
}


def bvh_path(code: str) -> str:
    subj = code.split('_')[0].zfill(3)
    return os.path.join(CMU, subj, f'{code}.bvh')


def import_bvh(code: str):
    bpy.ops.import_anim.bvh(filepath=bvh_path(code), global_scale=1.0, rotate_mode='NATIVE', axis_forward='-Z', axis_up='Y',
                            update_scene_fps=False, update_scene_duration=False, use_fps_scale=False)
    ob = bpy.context.object
    return ob


def sample_source(ob, frames: list[int]):
    """World rotation (3x3) and head position of each source bone, per frame (frame 1 is the T-pose)."""
    names = [b.name for b in ob.pose.bones]
    R = {n: [] for n in names}
    P = {n: [] for n in names}
    T = {n: [] for n in names}
    mw = ob.matrix_world
    for f in frames:
        bpy.context.scene.frame_set(f)
        for pb in ob.pose.bones:
            m = mw @ pb.matrix
            R[pb.name].append(np.array(m.to_3x3().normalized()))
            P[pb.name].append(np.array(m.translation))
            T[pb.name].append(np.array(mw @ pb.tail))
    return {n: np.array(R[n]) for n in names}, {n: np.array(P[n]) for n in names}, {n: np.array(T[n]) for n in names}


def rot_between(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    v = np.cross(a, b)
    c = float(a @ b)
    if c < -0.9999:
        axis = np.cross(a, [1, 0, 0])
        if np.linalg.norm(axis) < 1e-3:
            axis = np.cross(a, [0, 1, 0])
        return np.array(Quaternion(Vector(axis).normalized(), math.pi).to_matrix())
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx / (1 + c)


def yaw(angle: float) -> np.ndarray:
    c, s = math.cos(angle), math.sin(angle)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


class Target:
    """Our rig (armature space, rest): world rest rotations, rest locals, parents."""

    def __init__(self, arm_ob):
        self.ob = arm_ob
        self.bones = {b.name: b for b in arm_ob.data.bones}
        self.rest = {n: np.array(b.matrix_local.to_3x3()) for n, b in self.bones.items()}
        self.head = {n: np.array(b.head_local) for n, b in self.bones.items()}
        self.tail = {n: np.array(b.tail_local) for n, b in self.bones.items()}
        self.parent = {n: (b.parent.name if b.parent else None) for n, b in self.bones.items()}
        self.matrix_local = {n: np.array(b.matrix_local) for n, b in self.bones.items()}


def retarget(code: str, tgt: Target, mirror=False):
    """Returns per frame (30 fps): basis quaternions for mapped bones, pelvis world position."""
    for o in list(bpy.data.objects):
        if o.type == 'ARMATURE' and o is not tgt.ob:
            bpy.data.objects.remove(o)
    src = import_bvh(code)
    a = src.animation_data.action
    n_src = int(a.frame_range[1])
    step = 4  # 120 fps -> 30 fps
    frames = [1] + list(range(2, n_src + 1, step))
    R, P, TL = sample_source(src, frames)
    bpy.data.objects.remove(src)
    bpy.data.actions.remove(a)
    if mirror:
        # mirror across the body's left/right plane (x): swap sides, reflect
        Mx = np.diag([-1.0, 1, 1])
        sw = {k.replace('Left', '#').replace('Right', 'Left').replace('#', 'Right'): k for k in R}
        R = {k: np.array([Mx @ r @ Mx for r in R[sw[k]]]) for k in R}
        P = {k: P[sw[k]] * np.array([-1, 1, 1]) for k in P}
        TL = {k: TL[sw[k]] * np.array([-1, 1, 1]) for k in TL}
    # T-pose = frame 0 of our sample
    out_rot = {b: [] for b in ORDER}
    # alignment of our rest directions onto the T-pose directions
    align = {}
    for b in ORDER:
        s, to = MAP[b]
        if to is None or b in ('pelvis',):
            align[b] = np.eye(3)
            continue
        ds = (TL[s][0] - P[s][0]) if to == '_tail' else (P[to][0] - P[s][0])
        dt = tgt.tail[b] - tgt.head[b]
        align[b] = rot_between(dt, ds)
    # the source hips start where our pelvis is; the leg length decides the scale
    src_hip = P['Hips'][0]
    src_ground = min(P['LeftToeBase'][0][2], P['RightToeBase'][0][2]) - 0.0
    scale = (tgt.head['pelvis'][2]) / max(1e-6, src_hip[2] - src_ground)
    pel = []
    for f in range(1, len(frames)):
        world = {}
        for b in ORDER:
            s, _ = MAP[b]
            delta = R[s][f] @ R[s][0].T
            world[b] = delta @ align[b] @ tgt.rest[b]
        for b in ORDER:
            out_rot[b].append(world[b])
        pos = (P['Hips'][f] - src_hip) * scale
        pel.append(pos)
    out = {b: np.array(v) for b, v in out_rot.items()}
    level_gaze(out, tgt)
    return out, np.array(pel), scale


def axis_angle(axis: np.ndarray, deg: float) -> np.ndarray:
    a = axis / np.linalg.norm(axis)
    t = np.radians(deg)
    K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    return np.eye(3) + np.sin(t) * K + (1 - np.cos(t)) * K @ K


def head_pitch(world: dict, tgt: 'Target') -> np.ndarray:
    """Per frame, how far up (degrees) the face looks: the rest face direction carried by the head."""
    W, R0 = world['head'], tgt.rest['head']
    f = np.array([w @ np.linalg.inv(R0) @ np.array([0, -1.0, 0]) for w in W])
    return np.degrees(np.arcsin(np.clip(f[:, 2], -1, 1)))


def level_gaze(world: dict, tgt: 'Target'):
    """The CMU actors' T-poses carry their heads a little low, so relative to it most clips look up at
    the sky. A clip whose face looks up on average is brought back to a level gaze (the neck takes 40%
    of the turn, the head the rest); clips that look down on purpose (sad, sitting, kicking) keep theirs."""
    mean = float(head_pitch(world, tgt).mean())
    if mean <= 4.0:
        return
    th = min(22.0, mean - 1.0)
    inv_c = np.linalg.inv(tgt.rest['spine_03'])
    for f in range(len(world['head'])):
        side = world['spine_03'][f] @ inv_c @ np.array([1.0, 0, 0])
        world['neck_01'][f] = axis_angle(side, 0.4 * th) @ world['neck_01'][f]
        world['head'][f] = axis_angle(side, th) @ world['head'][f]


def world_to_basis(tgt: Target, world: dict[str, np.ndarray], pel: np.ndarray):
    """Local pose (Blender basis) per bone per frame from desired armature-space rotations."""
    n = len(pel)
    basis = {}
    cur = {}
    for b in ['Root'] + ORDER:
        par = tgt.parent[b]
        Lrest = (np.linalg.inv(tgt.rest[par]) @ tgt.rest[b]) if par else tgt.rest[b]
        if b not in world:
            cur[b] = np.array([(cur[par][i] if par else np.eye(3)) @ Lrest for i in range(n)])
            continue
        q = []
        for i in range(n):
            P = (cur[par][i] if par else np.eye(3)) @ Lrest
            q.append(np.linalg.inv(P) @ world[b][i])
        basis[b] = np.array(q)
        cur[b] = world[b]
    # pelvis location in its own rest space (parent Root is never posed)
    M = tgt.matrix_local['pelvis']
    rest_head = tgt.head['pelvis']
    loc = np.array([np.linalg.inv(M[:3, :3]) @ ((rest_head + p) - M[:3, 3]) for p in pel])
    return basis, loc


def quat(m: np.ndarray) -> np.ndarray:
    q = Matrix(m.tolist()).to_quaternion()
    return np.array([q.w, q.x, q.y, q.z])


def continuity(Q: np.ndarray) -> np.ndarray:
    for i in range(1, len(Q)):
        if Q[i] @ Q[i - 1] < 0:
            Q[i] = -Q[i]
    return Q


def forward_of(world_pelvis_rot: np.ndarray, P_l: np.ndarray, P_r: np.ndarray) -> np.ndarray:
    r = P_l - P_r
    f = np.cross(r, [0, 0, 1.0])
    f[2] = 0
    return f / (np.linalg.norm(f) + 1e-9)


def best_loop(feat: np.ndarray, i0: int, i1: int, lmin: int, lmax: int, pel: np.ndarray | None = None, vmin=0.0):
    best = (1e9, i0, lmin)
    for s in range(i0, max(i0 + 1, i1 - lmax)):
        for L in range(lmin, lmax + 1):
            if s + L >= len(feat):
                break
            if pel is not None and vmin > 0:
                d_xy = pel[s + L, :2] - pel[s, :2]
                if np.linalg.norm(d_xy) / (L / FPS) < vmin:
                    continue
            d = float(np.abs(feat[s] - feat[s + L]).sum())
            if d < best[0]:
                best = (d, s, L)
    return best[1], best[2], best[0]


def make_clip(name: str, spec, tgt: Target, foot_l_idx, foot_r_idx):
    code, mode, o = spec
    world, pel, scale = retarget(code, tgt, mirror=o.get('mirror', False))
    n = len(pel)
    # features for loops: leg and arm rotations
    feat = np.concatenate([world[b].reshape(n, -1) for b in ('thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'upperarm_l', 'upperarm_r')], 1)
    info = {'source': f'CMU {code}', 'fps': FPS}
    if mode == 'loop':
        s, L, err = best_loop(feat, int(o['t0'] * FPS), int(o['t1'] * FPS), int(o['lmin'] * FPS), int(o['lmax'] * FPS), pel, o.get('vmin', 0.45))
        sl = slice(s, s + L + 1)
        info.update(loop=True, err=round(err, 3))
    elif mode == 'event':
        # the strike: the frame where the kicking foot moves fastest
        foot = 'foot_r' if o['event'] == 'kickR' else 'foot_l'
        pos = pel + 0  # pelvis path; the foot speed comes from its rotation change, good enough as a marker
        sp = np.linalg.norm(np.diff(world[foot].reshape(n, -1), axis=0), axis=1)
        k = int(np.argmax(sp[int(0.8 * FPS):])) + int(0.8 * FPS)
        a, b = max(0, k - int(o['before'] * FPS)), min(n - 1, k + int(o['after'] * FPS))
        sl = slice(a, b + 1)
        info.update(loop=False, contact=round((k - a) / FPS, 3))
    else:
        a, b = int(o['t0'] * FPS), min(n - 1, int(o['t1'] * FPS))
        sl = slice(a, b + 1)
        info.update(loop=bool(o.get('loop')))
    world = {k: v[sl] for k, v in world.items()}
    pel = pel[sl]
    m = len(pel)
    # heading: make the travel (or the body, when standing) point where our character looks (-y)
    travel = o.get('travel')
    if travel:
        d = pel[-1] - pel[0]
        d[2] = 0
        ang_now = math.atan2(d[1], d[0])
        want = {'fwd': -math.pi / 2, 'back': math.pi / 2, 'left': 0.0, 'right': math.pi}[travel]
        speed = float(np.linalg.norm(d)) / max(1e-6, (m - 1) / FPS)
        info['speed'] = round(speed, 3)
    else:
        # the body's forward at the start
        fl = world['thigh_l'][0] @ np.array([0, 0, 1.0])
        ang_now = 0
        r = (tgt.head['thigh_l'] - tgt.head['thigh_r'])
        rw = world['pelvis'][0] @ np.linalg.inv(tgt.rest['pelvis']) @ r
        f = np.cross(rw, [0, 0, 1.0])
        ang_now = math.atan2(f[1], f[0])
        want = -math.pi / 2
    Y = yaw(want - ang_now)
    world = {k: np.array([Y @ r for r in v]) for k, v in world.items()}
    pel = (Y @ pel.T).T
    if travel or info.get('loop'):
        # in place: the game moves the player; keep the height and the sway, remove the drift
        t = np.linspace(0, 1, m)[:, None]
        drift = pel[0] + (pel[-1] - pel[0]) * t
        drift[:, 2] = 0
        pel = pel - drift
        pel[:, :2] -= pel[:, :2].mean(0) * 0
    else:
        pel[:, :2] -= pel[0, :2]
    basis, loc = world_to_basis(tgt, world, pel)
    if info.get('loop'):
        # blend the last frames into the first so the cycle has no seam
        k = min(6, m // 4)
        for b in basis:
            for j in range(k):
                w = (j + 1) / (k + 1)
                i = m - k - 1 + j
                qa, qb = Quaternion(Matrix(basis[b][i].tolist()).to_quaternion()), Quaternion(Matrix(basis[b][0].tolist()).to_quaternion())
                basis[b][i] = np.array(qa.slerp(qb, w).to_matrix())
        for j in range(k):
            w = (j + 1) / (k + 1)
            i = m - k - 1 + j
            loc[i] = loc[i] * (1 - w) + loc[0] * w
    info['frames'] = m
    info['duration'] = round((m - 1) / FPS, 3)
    return basis, loc, info, world, pel


def bake(tgt: Target, name: str, basis, loc):
    ob = tgt.ob
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    if ob.animation_data is None:
        ob.animation_data_create()
    ob.animation_data.action = act
    m = len(loc)
    for b, mats in basis.items():
        pb = ob.pose.bones[b]
        pb.rotation_mode = 'QUATERNION'
        Q = continuity(np.array([quat(x) for x in mats]))
        for i in range(m):
            pb.rotation_quaternion = Quaternion(Q[i])
            pb.keyframe_insert('rotation_quaternion', frame=i + 1, group=b)
    pb = ob.pose.bones['pelvis']
    for i in range(m):
        pb.location = Vector(loc[i])
        pb.keyframe_insert('location', frame=i + 1, group='pelvis')
    # back to rest for the next one
    for pb in ob.pose.bones:
        pb.rotation_quaternion = Quaternion()
        pb.location = Vector()
    act.frame_range = (1, m)
    return act


def sheet(name: str, tgt: Target, world, pel, path: str):
    """A strip of stick figures to check a clip by eye."""
    from PIL import Image, ImageDraw
    n = len(pel)
    picks = np.linspace(0, n - 1, min(10, n)).astype(int)
    W, H = 110, 190
    im = Image.new('RGB', (W * len(picks), H), (245, 245, 240))
    dr = ImageDraw.Draw(im)
    for c, i in enumerate(picks):
        pos = {}
        for b in ['Root'] + ORDER:
            par = tgt.parent[b]
            if b == 'Root':
                pos[b] = np.zeros(3)
                continue
            if b == 'pelvis':
                pos[b] = tgt.head['pelvis'] + pel[i]
                continue
            R = world[par][i] if par in world else np.eye(3)
            Rr = tgt.rest[par] if par in tgt.rest else np.eye(3)
            pos[b] = pos[par] + R @ np.linalg.inv(Rr) @ (tgt.head[b] - tgt.head[par])
        for b in ORDER:
            par = tgt.parent[b]
            if par in pos and par != 'Root':
                a, bb = pos[par], pos[b]
                # side view (y forward = left on the picture), z up
                pa = (c * W + W / 2 + a[1] * 60 - a[0] * 25, H - 10 - a[2] * 60 * 1.0)
                pb_ = (c * W + W / 2 + bb[1] * 60 - bb[0] * 25, H - 10 - bb[2] * 60 * 1.0)
                col = (200, 40, 40) if b.endswith('_l') else (40, 70, 200) if b.endswith('_r') else (30, 30, 30)
                dr.line([pa, pb_], fill=col, width=3)
        dr.text((c * W + 4, 4), f'{name} {i}', fill=(0, 0, 0))
    im.save(path)


def to_gltf_q(m3: np.ndarray) -> list[float]:
    """A bone-local rotation as glTF writes it (x, y, z, w): bone spaces are not converted, only the root is."""
    q = Matrix(m3.tolist()).to_quaternion()
    return [q.x, q.y, q.z, q.w]


def to_gltf_t(t: np.ndarray) -> list[float]:
    return [float(t[0]), float(t[1]), float(t[2])]


def locals_for(tgt: Target, basis: dict, loc: np.ndarray):
    """Per frame glTF-space local rotations (mapped bones) and the pelvis translation: local = rest_local @ basis."""
    n = len(loc)
    rot = {}
    for b in ORDER:
        par = tgt.parent[b]
        L = np.linalg.inv(tgt.matrix_local[par]) @ tgt.matrix_local[b] if par else tgt.matrix_local[b]
        q = []
        for i in range(n):
            q.append(to_gltf_q(L[:3, :3] @ basis[b][i]))
        Q = np.array(q)
        for i in range(1, n):
            if Q[i] @ Q[i - 1] < 0:
                Q[i] = -Q[i]
        rot[b] = Q
    par = tgt.parent['pelvis']
    L = np.linalg.inv(tgt.matrix_local[par]) @ tgt.matrix_local['pelvis']
    pos = np.array([to_gltf_t(L[:3, 3] + L[:3, :3] @ loc[i]) for i in range(n)])
    return rot, pos


def rest_locals(tgt: Target):
    out = {}
    for b in ORDER:
        par = tgt.parent[b]
        L = np.linalg.inv(tgt.matrix_local[par]) @ tgt.matrix_local[b] if par else tgt.matrix_local[b]
        out[b] = {'q': to_gltf_q(L[:3, :3]), 't': to_gltf_t(L[:3, 3])}
    return out


def main(only: list[str] | None = None):
    blend.reset()
    vb = mh.shape(mh.Macro(gender=1.0, age=10.5, muscle=0.5, weight=0.42, height=0.55))
    rig, _ = mh.rig_data()
    B = mh.bones(vb, rig)
    arm = blend.armature('rig', B)
    tgt = Target(arm)
    os.makedirs(SHEETS, exist_ok=True)
    meta: dict = {'fps': FPS, 'bones': ORDER, 'rest': rest_locals(tgt), 'pelvisY': float(tgt.head['pelvis'][2]), 'clips': {}}
    chunks: list[np.ndarray] = []
    offset = 0

    def add(name, basis, loc, info):
        nonlocal offset
        rot, pos = locals_for(tgt, basis, loc)
        n = len(loc)
        block = np.concatenate([np.stack([rot[b] for b in ORDER], 1).reshape(n, -1), pos], 1).astype(np.float32)
        chunks.append(block.ravel())
        info = dict(info, offset=offset, frames=n)
        offset += block.size
        meta['clips'][name] = info
        print(f'  {name}: {info}')

    names = only or list(CLIPS)
    for name in names:
        spec = CLIPS[name]
        try:
            basis, loc, info, world, pel = make_clip(name, spec, tgt, None, None)
        except Exception as e:  # a missing file or a bad window should not stop the library
            print('  !!', name, e)
            continue
        add(name, basis, loc, info)
        sheet(name, tgt, world, pel, os.path.join(SHEETS, f'{name}.png'))
        if name.startswith('kickR'):
            spec_m = (spec[0], spec[1], dict(spec[2], mirror=True, event='kickL'))
            basis, loc, info, world, pel = make_clip(name, spec_m, tgt, None, None)
            add(name.replace('kickR', 'kickL'), basis, loc, info)
    os.makedirs(OUT, exist_ok=True)
    np.concatenate(chunks).astype('<f4').tofile(os.path.join(OUT, 'motions.bin'))
    json.dump(meta, open(os.path.join(OUT, 'motions.json'), 'w'))
    print('motions:', os.path.getsize(os.path.join(OUT, 'motions.bin')) / 1e6, 'MB')
    # check: our rest locals equal the exported body's nodes (same conversion as the glTF exporter)
    try:
        import struct
        f = open(os.path.join(OUT, 'boy.glb'), 'rb').read()
        L = struct.unpack('<I', f[12:16])[0]
        j = json.loads(f[20:20 + L])
        nodes = {n['name']: n for n in j['nodes']}
        for b in ('pelvis', 'thigh_l', 'upperarm_r', 'head'):
            print('   rest check', b, np.round(meta['rest'][b]['q'], 3), np.round(nodes[b].get('rotation', [0, 0, 0, 1]), 3), np.round(meta['rest'][b]['t'], 3), np.round(nodes[b].get('translation', [0, 0, 0]), 3))
    except Exception as e:
        print('   rest check skipped', e)


if __name__ == '__main__':
    main([a for a in sys.argv[1:] if not a.startswith('-')] or None)
