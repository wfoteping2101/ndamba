"""
Clothes cut from the body itself: select the body faces a garment covers (by the bone that moves
each vertex and how far along that bone it sits), smooth away the anatomy, push the shell out along
the normals, straighten the hems, flare them a little. The garment keeps the body's skin weights
vertex for vertex, so it never separates from the body when the player runs.

Each garment gets its own uv layout (cylindrical around the torso, around each sleeve) that the game
paints at runtime (club colours, collar, number), and vertex colours that mark its hems (trim bands).
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

import mh
from mh import Piece

TORSO = {'pelvis', 'spine_01', 'spine_02', 'spine_03', 'clavicle_l', 'clavicle_r', 'neck_01', 'thigh_l', 'thigh_r'}


@dataclass
class Body:
    vb: np.ndarray                 # all base vertices (Blender metres)
    B: dict                        # bones
    W: list                        # weight table (all vertices)

    def __post_init__(self):
        b = mh.base()
        self.fids = b['groups']['body']
        self.faces = [b['faces'][i][0] for i in self.fids]
        n = mh.BODY_N
        self.V = self.vb[:n]
        self.dom = np.array(mh.dominant(self.W, range(n)))
        self.N = mh.vertex_normals(self.V, self.faces)
        self.t = np.array([mh.along(self.V[i], self.B[self.dom[i]]) if self.dom[i] in self.B else 0.0 for i in range(n)])
        z = lambda bn, end=0: float(self.B[bn][end][2])
        self.hipZ = (z('thigh_l') + z('thigh_r')) / 2
        self.shoulderZ = (z('upperarm_l') + z('upperarm_r')) / 2
        self.neckZ = z('neck_01')
        self.kneeZ = (z('calf_l') + z('calf_r')) / 2
        self.ankleZ = (z('foot_l') + z('foot_r')) / 2
        self.height = float(self.V[:, 2].max())
        self.hidden = np.zeros(n, bool)
        # how far (m) a skin vertex sinks under a close-fitting edge (the collar): no poking through,
        # and the skin still runs on under the edge, so no hole shows when you look into the collar
        self.inset = np.zeros(n)

    def mask(self, bones: set[str]) -> np.ndarray:
        return np.isin(self.dom, list(bones))

    def cut(self, name: str, sel: np.ndarray, material: str) -> Piece:
        faces = [i for i, f in enumerate(self.faces) if sel[f].all()]
        return mh.piece_from_base(name, self.vb, [self.fids[i] for i in faces], self.W, material)


def transfer_weights(body: Body, p: Piece, k=6, smooth_iters=3, visible_only=True):
    """Skin weights from the body surface nearest to each garment vertex (not from the vertex it was cut
    from: smoothing moved it), blended over k neighbours and smoothed over the garment, like cloth."""
    V = body.V
    bones: list[str] = sorted({b for w in body.W[:mh.BODY_N] for b in w})
    bi = {b: i for i, b in enumerate(bones)}
    Wb = np.zeros((mh.BODY_N, len(bones)))
    for v in range(mh.BODY_N):
        for b, w in body.W[v].items():
            Wb[v, bi[b]] = w
    out = np.zeros((len(p.V), len(bones)))
    for a in range(0, len(p.V), 512):
        P = p.V[a:a + 512]
        d2 = ((P[:, None, :] - V[None, :, :]) ** 2).sum(-1)
        idx = np.argpartition(d2, k, axis=1)[:, :k]
        dd = np.take_along_axis(d2, idx, 1)
        w = 1 / (np.sqrt(dd) + 1e-3)
        w /= w.sum(1, keepdims=True)
        out[a:a + 512] = (Wb[idx] * w[:, :, None]).sum(1)
    if smooth_iters:
        E = mh.edges_of(p.F)
        for _ in range(smooth_iters):
            S = np.zeros_like(out)
            C = np.zeros(len(out))
            np.add.at(S, E[:, 0], out[E[:, 1]])
            np.add.at(S, E[:, 1], out[E[:, 0]])
            np.add.at(C, E[:, 0], 1)
            np.add.at(C, E[:, 1], 1)
            C[C == 0] = 1
            out = 0.5 * out + 0.5 * S / C[:, None]
    out /= out.sum(1, keepdims=True) + 1e-9
    p.W = [{bones[j]: float(row[j]) for j in np.nonzero(row > 1e-3)[0]} for row in out]
    return p


def _shell(body: Body, p: Piece, offset, smooth_iters=6, hide_rings=2, taubin=False, axis=None, rules=None, min_gap=0.0035) -> Piece:
    """Smooth, offset, and hide the body faces well inside the garment. Near a hem the offset is kept
    perpendicular to the limb (`axis(i, pos) -> unit vector or None`) and the hem is re-snapped after."""
    src = p.src
    bnd = mh.boundary_verts(p.F)
    V = mh.smooth(p.V, p.F, smooth_iters, 0.5, pin=np.array(sorted(bnd), int), taubin=taubin)
    N = mh.vertex_normals(V, p.F)
    if axis is not None:
        dist = mh.ring_distance(len(V), p.F, bnd, 3)
        for i in np.nonzero(dist <= 2)[0]:
            a = axis(int(i), V[i])
            if a is None:
                continue
            n = N[i] - (N[i] @ a) * a
            ln = np.linalg.norm(n)
            if ln > 1e-6:
                N[i] = n / ln
    off = offset(src, V) if callable(offset) else np.full(len(V), offset)
    p.V = V + N * off[:, None]
    # smoothing pulls the shell inwards over convex parts (collarbones, shoulder blades): nothing of the
    # body may come through, so every vertex keeps a minimum gap above the skin it came from
    Nb = body.N[src]
    gap = ((p.V - body.V[src]) * Nb).sum(1)
    p.V = p.V + Nb * np.clip(min_gap - gap, 0, None)[:, None]
    if rules is not None:
        _straighten(body, p, rules)
    d = mh.ring_distance(len(V), p.F, bnd, maxd=hide_rings + 1)
    deep = src[d >= hide_rings]
    body.hidden[deep] = True
    return transfer_weights(body, p)


def _hem_rings(p: Piece, which: np.ndarray, maxd=4) -> np.ndarray:
    """Distance in rings from the boundary vertices selected by `which` (a bool per vertex)."""
    bnd = mh.boundary_verts(p.F)
    seeds = {i for i in bnd if which[i]}
    return mh.ring_distance(len(p.V), p.F, seeds, maxd=maxd)


def _straighten(body: Body, p: Piece, rules):
    """Snap boundary vertices onto their hem: rules = [(predicate(src, pos) -> bool, fn(src, pos) -> pos)]."""
    for i in mh.boundary_verts(p.F):
        s = p.src[i]
        for pred, fn in rules:
            if pred(s, p.V[i]):
                p.V[i] = fn(s, p.V[i])
                break


def _proj_bone(body: Body, bone: str, tcut: float):
    h, t = body.B[bone][0], body.B[bone][1]
    d = t - h
    L = np.linalg.norm(d)
    u = d / L

    def fn(_s, pos):
        k = (pos - h) @ u
        return pos - (k - tcut * L) * u
    return fn


def _along_all(body: Body, bone: str) -> np.ndarray:
    h, t = body.B[bone][0], body.B[bone][1]
    d = t - h
    return (body.V - h) @ d / float(d @ d)


def _dist_axis(body: Body, bone: str) -> np.ndarray:
    h, t = body.B[bone][0], body.B[bone][1]
    d = (t - h) / np.linalg.norm(t - h)
    r = body.V - h
    return np.linalg.norm(r - np.outer(r @ d, d), axis=1)


def _torso_uv(body: Body, P: np.ndarray, hem: float, top: float):
    """u around the body (front centre 0.25, wearer's left 0.5, back centre 0.75, seam under the right arm)."""
    cy = float(body.V[body.mask({'spine_02'}), 1].mean())
    phi = np.arctan2(P[:, 0], -(P[:, 1] - cy))
    u = np.mod(phi + math.pi / 2, 2 * math.pi) / (2 * math.pi)
    v = np.clip((P[:, 2] - hem) / max(1e-6, top - hem), 0, 1)
    return u, v


def _sleeve_uv(body: Body, P: np.ndarray, bone: str, tcut: float):
    h, t = body.B[bone][0], body.B[bone][1]
    d = t - h
    L = np.linalg.norm(d)
    ax = d / L
    up = np.array([0, 0, 1.0])
    up = up - (up @ ax) * ax
    up /= np.linalg.norm(up)
    side = np.cross(ax, up)
    r = P - h
    psi = np.arctan2(r @ side, r @ up)
    u = psi / (2 * math.pi) + 0.5
    v = np.clip((r @ ax) / (L * max(tcut, 1e-3)), 0, 1)
    return u, v


def _per_loop(p: Piece, uv_vert: np.ndarray, wrap_u=True):
    """Per-loop uvs from per-vertex uvs, unwrapping faces that cross the u seam."""
    out = []
    for f in p.F:
        us = uv_vert[f, 0].copy()
        if wrap_u and us.max() - us.min() > 0.5:
            us[us < 0.5] += 1.0
        out.append([(float(us[k]), float(uv_vert[f[k], 1])) for k in range(len(f))])
    return out


def _region_uv(u, v, rect):
    x0, y0, w, h = rect
    return np.stack([x0 + u * w, y0 + v * h], 1)


# kit texture atlas (0..1, y up): torso | left sleeve / right sleeve
TORSO_RECT = (0.01, 0.01, 0.72, 0.72)
SLEEVE_L_RECT = (0.78, 0.02, 0.2, 0.46)
SLEEVE_R_RECT = (0.78, 0.52, 0.2, 0.46)
SHORTS_RECT = (0.0, 0.0, 1.0, 1.0)


def shirt(body: Body, sleeve: float = 0.55, long_sleeves=False, hem: float = -0.04, loose=0.011, name='shirt',
          hem_flare=0.9, cuff_flare=0.6, shoulder_ease=0.0) -> Piece:
    """A football shirt (short sleeves) or a long-sleeved top. hem: fraction of the hip->shoulder height.
    hem_flare / cuff_flare: how far the hems stand off, in units of `loose` (negative: gathered, as on a
    coat's elastic cuffs); shoulder_ease: how much less the shell stands off on the top of the shoulders
    (a thick shell pushed straight out along the normals rose there like shoulder pads)."""
    hemZ = body.hipZ + (body.shoulderZ - body.hipZ) * hem
    z = body.V[:, 2]
    torso = body.mask(TORSO) & (z > hemZ)
    # a round crew neckline: lower in front, a little higher at the back, cut on a smooth curve rather
    # than along the mesh's faces (which left a ragged collar)
    sx0 = abs(float(body.B['upperarm_l'][0][0]))
    k = sx0 / 0.17
    nb = body.B['neck_01'][0]

    def neck_rel(P):
        rel = P - nb
        c = np.cos(np.arctan2(rel[:, 0], -rel[:, 1]))
        line = nb[2] - 0.03 * k * np.clip(c, 0, 1) ** 1.6 + 0.012 * k * np.clip(-c, 0, 1)
        return np.hypot(rel[:, 0], rel[:, 1]), line
    rad, line = neck_rel(body.V)
    torso &= ~((z > line) & (rad < 0.085 * k))
    torso &= ~((body.dom == 'neck_01') & (body.t > 0.3))
    arms_up = body.mask({'upperarm_l', 'upperarm_r'})
    arms = arms_up & (body.t < (1.2 if long_sleeves else sleeve))
    if long_sleeves:
        arms |= body.mask({'lowerarm_l', 'lowerarm_r'}) & (body.t < sleeve)
    sel = torso | arms
    p = body.cut(name, sel, name)
    # hems: bottom (torso, low), sleeve ends, neck
    arm_bone = {'upperarm_l': 'upperarm_l', 'upperarm_r': 'upperarm_r', 'lowerarm_l': 'lowerarm_l', 'lowerarm_r': 'lowerarm_r'}
    end_bone = ('lowerarm' if long_sleeves else 'upperarm')
    sx = abs(float(body.B['upperarm_l'][0][0]))
    def at_neck(pos):
        r_, l_ = neck_rel(pos[None, :])
        return r_[0] < 0.095 * k and pos[2] > l_[0] - 0.05 * k

    def to_neckline(_s, pos):
        _, l_ = neck_rel(pos[None, :])
        return np.array([pos[0], pos[1], l_[0]])
    # which hem a border vertex belongs to is decided by the bone its skin follows, not by where it
    # is: on a broad man the hips reach further out than the shoulders, and the hem corners there were
    # being sent to the cuffs (long blades from the hips to the wrists)
    def on_arm(s, side):
        d = str(body.dom[s])
        return d.endswith('_' + side) and d.split('_')[0] in ('upperarm', 'lowerarm', 'hand')
    rules = [
        (lambda s, pos: at_neck(pos), to_neckline),
        (lambda s, pos: on_arm(s, 'l'), _proj_bone(body, f'{end_bone}_l', sleeve)),
        (lambda s, pos: on_arm(s, 'r'), _proj_bone(body, f'{end_bone}_r', sleeve)),
        (lambda s, pos: pos[2] < hemZ + 0.08, lambda s, pos: np.array([pos[0], pos[1], hemZ])),
    ]
    _straighten(body, p, rules)
    src = p.src
    is_arm = np.array([on_arm(s_, 'l') or on_arm(s_, 'r') for s_ in src])
    bottom = (~is_arm) & (p.V[:, 2] < hemZ + 0.03)
    cuff = is_arm
    neck = (~is_arm) & np.array([at_neck(v) for v in p.V])
    bnd = mh.boundary_verts(p.F)
    d_bottom = mh.ring_distance(len(p.V), p.F, {i for i in bnd if bottom[i]}, 5)
    d_cuff = mh.ring_distance(len(p.V), p.F, {i for i in bnd if cuff[i]}, 5)
    d_neck = mh.ring_distance(len(p.V), p.F, {i for i in bnd if neck[i]}, 5)

    def offset(_src, _V):
        o = np.full(len(_V), loose)
        o += np.clip(1 - d_bottom / 4, 0, 1) * loose * hem_flare     # the hem hangs away from the belly
        o += np.clip(1 - d_cuff / 3, 0, 1) * loose * cuff_flare      # sleeves flare
        o -= np.clip(1 - d_neck / 2, 0, 1) * loose * 0.45            # the collar sits on the neck
        if shoulder_ease:
            nz = body.N[_src, 2]
            high = np.clip((body.V[_src, 2] - (body.shoulderZ - 0.1)) / 0.08, 0, 1)
            o *= 1 - shoulder_ease * np.clip((nz - 0.25) / 0.5, 0, 1) * high
        return o
    def shirt_axis(i, pos):
        if is_arm[i]:
            bn = f'{end_bone}_l' if pos[0] > 0 else f'{end_bone}_r'
            d = body.B[bn][1] - body.B[bn][0]
            return d / np.linalg.norm(d)
        if pos[2] < hemZ + 0.06:
            return np.array([0, 0, 1.0])
        return None
    p = _shell(body, p, offset, smooth_iters=8, axis=shirt_axis, rules=rules)
    # the collar sits close to the skin: the chest and the back of the neck under it are not drawn
    # (posed and skinned slightly differently, they would show through in a ragged line)
    near = sel & (rad < 0.13 * k)
    body.inset[np.nonzero(near & (z < line - 0.002 * k) & (z >= line - 0.06 * k))[0]] = 0.007
    body.hidden[np.nonzero(near & (z < line - 0.06 * k))[0]] = True
    # uvs: torso cylinder, sleeves
    P = p.V
    uv = np.zeros((len(P), 2))
    tu, tv = _torso_uv(body, P, hemZ, body.neckZ + 0.02)
    uv[:] = _region_uv(tu, tv, TORSO_RECT)
    for side, rect in (('l', SLEEVE_L_RECT), ('r', SLEEVE_R_RECT)):
        m = np.isin(body.dom[src], [f'upperarm_{side}', f'lowerarm_{side}'])
        L = 1.0 if not long_sleeves else 1.0
        su, sv = _sleeve_uv(body, P[m], f'upperarm_{side}', sleeve if not long_sleeves else 2.0)
        uv[m] = _region_uv(su, sv, rect)
    p.UV = _per_loop(p, uv)
    # hem bands in the vertex colours: r collar, g cuffs, b bottom hem
    p.colors = np.stack([np.clip(1 - d_neck / 2.0, 0, 1), np.clip(1 - d_cuff / 1.6, 0, 1), np.clip(1 - d_bottom / 1.6, 0, 1), np.ones(len(P))], 1)
    return p


def _loops(F) -> list[list[int]]:
    """Every boundary loop of a mesh, each in order round the loop."""
    cnt: dict[tuple[int, int], int] = {}
    for f in F:
        for i in range(len(f)):
            a, b = f[i], f[(i + 1) % len(f)]
            k = (min(a, b), max(a, b))
            cnt[k] = cnt.get(k, 0) + 1
    nxt: dict[int, list[int]] = {}
    for (a, b), c in cnt.items():
        if c == 1:
            nxt.setdefault(a, []).append(b)
            nxt.setdefault(b, []).append(a)
    seen: set[int] = set()
    out = []
    for start in sorted(nxt):
        if start in seen:
            continue
        loop, prev, cur = [start], None, start
        seen.add(start)
        while True:
            nb = [v for v in nxt[cur] if v != prev and (v not in seen or v == start)]
            if not nb or nb[0] == start:
                break
            prev, cur = cur, nb[0]
            loop.append(cur)
            seen.add(cur)
        out.append(loop)
    return out


def coat(body: Body, name='coat') -> Piece:
    """A padded winter coat: long sleeves gathered at the wrists, a hem gathered on the hips, eased over the
    shoulders, and a stand-up collar closed round the neck (an open crew neck on a thick shell read as a
    sack). The collar is new geometry raised from the neckline, so it takes its weights afresh."""
    p = shirt(body, sleeve=0.95, long_sleeves=True, hem=-0.12, loose=0.03, name=name,
              hem_flare=0.25, cuff_flare=-0.45, shoulder_ease=0.55)
    sx0 = abs(float(body.B['upperarm_l'][0][0]))
    k = sx0 / 0.17
    nb = body.B['neck_01'][0]
    loops = _loops(p.F)
    neck = max(loops, key=lambda L: float(p.V[L, 2].mean()))
    # the neck's own radius, round its axis at the collar's height
    nv = body.V[body.mask({'neck_01'})]
    r_neck = float(np.median(np.hypot(nv[:, 0] - nb[0], nv[:, 1] - nb[1])))
    cy = float(nb[1]) + 0.004 * k
    ztop = float(nb[2]) + 0.04 * k
    n = len(neck)
    P0 = p.V[neck]
    ang = np.arctan2(P0[:, 1] - cy, P0[:, 0] - nb[0])
    rad0 = np.hypot(P0[:, 0] - nb[0], P0[:, 1] - cy)
    front = np.clip(-np.sin(ang), 0, 1)          # -y is the front
    rc = r_neck + 0.02 * k + 0.004 * k * front  # the collar stands a finger off the neck
    zt = ztop - 0.012 * k * front               # a little lower in front, where the zip opens

    def ring(r, z):
        return np.stack([nb[0] + np.cos(ang) * r, cy + np.sin(ang) * r, z], 1)
    z0 = P0[:, 2]
    rings = [
        ring((rad0 * 0.55 + rc * 0.45), z0 + (zt - z0) * 0.22),
        ring(rc + 0.003 * k, z0 + (zt - z0) * 0.6),
        ring(rc, zt),
        ring(rc - 0.006 * k, zt + 0.002 * k),       # the rolled top edge
        ring(rc - 0.009 * k, zt - 0.025 * k),       # the inside, down towards the neck
    ]
    base = len(p.V)
    p.V = np.vstack([p.V] + rings)
    idx = [list(neck)] + [list(range(base + i * n, base + (i + 1) * n)) for i in range(len(rings))]
    # orientation: follow the neighbouring faces of the neckline (the outside of the coat)
    a, b = neck[0], neck[1]
    flip = any(f[(f.index(a) + 1) % len(f)] == b for f in p.F if a in f and b in f)
    newF = []
    for r in range(len(idx) - 1):
        for j in range(n):
            q = [idx[r][j], idx[r][(j + 1) % n], idx[r + 1][(j + 1) % n], idx[r + 1][j]]
            newF.append(q[::-1] if not flip else q)
    p.F = p.F + newF
    # uvs: the top of the torso band; vertex colours: the collar band
    tu, tv = _torso_uv(body, p.V, body.hipZ + (body.shoulderZ - body.hipZ) * -0.12, body.neckZ + 0.02)
    uv = _region_uv(tu, tv, TORSO_RECT)
    for f in newF:
        us = uv[f, 0].copy()
        if us.max() - us.min() > 0.5:
            us[us < 0.5] += 0.72
        p.UV.append([(float(us[m]), float(uv[f[m], 1])) for m in range(len(f))])
    extra = np.tile(np.array([[1.0, 0.0, 0.0, 1.0]]), (len(p.V) - base, 1))
    p.colors = np.vstack([p.colors, extra])
    p.src = np.concatenate([p.src, -np.ones(len(p.V) - base, int)])
    return transfer_weights(body, p)


def shorts(body: Body, length: float = 0.45, waist: float = 0.14, loose=0.009, trousers=False, name='shorts') -> Piece:
    """Shorts (thigh fraction `length`) or long trousers (to the ankle). waist: fraction hip->shoulder."""
    waistZ = body.hipZ + (body.shoulderZ - body.hipZ) * waist
    z = body.V[:, 2]
    sel = body.mask({'pelvis', 'spine_01', 'thigh_l', 'thigh_r'}) & (z < waistZ)
    if not trousers:
        # how far down the nearest thigh each vertex is (the crotch and inner thighs belong to the pelvis bone)
        tl = _along_all(body, 'thigh_l')
        tr = _along_all(body, 'thigh_r')
        near_l = _dist_axis(body, 'thigh_l') < _dist_axis(body, 'thigh_r')
        tt = np.where(near_l, tl, tr)
        sel &= ~(tt > length)
    if trousers:
        sel |= body.mask({'calf_l', 'calf_r'}) & (body.t < 0.93)
    p = body.cut(name, sel, name)
    end = 'calf' if trousers else 'thigh'
    tcut = 0.93 if trousers else length
    near_l_src = _dist_axis(body, f'{end}_l') < _dist_axis(body, f'{end}_r')
    rules = [
        (lambda s, pos: pos[2] > waistZ - 0.04, lambda s, pos: np.array([pos[0], pos[1], waistZ])),
        (lambda s, pos: near_l_src[s], _proj_bone(body, f'{end}_l', tcut)),
        (lambda s, pos: True, _proj_bone(body, f'{end}_r', tcut)),
    ]
    _straighten(body, p, rules)
    src = p.src
    bnd = mh.boundary_verts(p.F)
    d_leg = mh.ring_distance(len(p.V), p.F, {i for i in bnd if p.V[i][2] < waistZ - 0.05}, 5)
    d_waist = mh.ring_distance(len(p.V), p.F, {i for i in bnd if p.V[i][2] > waistZ - 0.02}, 5)

    def offset(_src, _V):
        o = np.full(len(_V), loose)
        o += np.clip(1 - d_leg / 4, 0, 1) * loose * (0.6 if trousers else 1.1)
        o -= np.clip(1 - d_waist / 2, 0, 1) * loose * 0.4
        return o
    def leg_axis(i, pos):
        if pos[2] > waistZ - 0.05:
            return np.array([0, 0, 1.0])
        bn = f'{end}_l' if near_l_src[p.src[i]] else f'{end}_r'
        d = body.B[bn][1] - body.B[bn][0]
        return d / np.linalg.norm(d)
    p = _shell(body, p, offset, smooth_iters=8, axis=leg_axis, rules=rules)
    # uv: cylinder around the pelvis, seam at the back centre (front 0.5, wearer's left 0.75)
    P = p.V
    cy = float(body.V[body.mask({'pelvis'}), 1].mean())
    phi = np.arctan2(P[:, 0], -(P[:, 1] - cy))
    u = np.mod(phi + math.pi, 2 * math.pi) / (2 * math.pi)
    bottom = body.ankleZ if trousers else float(P[:, 2].min())
    v = np.clip((P[:, 2] - bottom) / max(1e-6, waistZ - bottom), 0, 1)
    p.UV = _per_loop(p, np.stack([u, v], 1))
    p.colors = np.stack([np.clip(1 - d_waist / 1.6, 0, 1), np.clip(1 - d_leg / 1.6, 0, 1), np.zeros(len(P)), np.ones(len(P))], 1)
    return p


def socks(body: Body, side: str, top: float = 0.12, name=None) -> Piece:
    sel = (body.mask({f'calf_{side}'}) & (body.t > top)) | body.mask({f'foot_{side}', f'ball_{side}'})
    p = body.cut(name or f'sock_{side}', sel, name or f'sock{side.upper()}')
    _straighten(body, p, [(lambda s, pos: body.dom[s] == f'calf_{side}', _proj_bone(body, f'calf_{side}', top))])
    bnd = mh.boundary_verts(p.F)
    d_top = mh.ring_distance(len(p.V), p.F, bnd, 4)
    p = _shell(body, p, lambda s, V: np.full(len(V), 0.0035) + np.clip(1 - d_top / 2, 0, 1) * 0.002, smooth_iters=2, hide_rings=2)
    P = p.V
    v = np.clip((P[:, 2] - 0) / max(1e-6, P[:, 2].max()), 0, 1)
    p.UV = [[(0.5, float(v[k])) for k in f] for f in p.F]
    p.colors = np.stack([np.clip(1 - d_top / 2.5, 0, 1), np.zeros(len(P)), np.zeros(len(P)), np.ones(len(P))], 1)
    return p


def shoe(body: Body, side: str, ankle: float = 0.9, kind='boot', name=None) -> Piece:
    # (kind 'slide': a flat sole round the foot and one wide strap over the instep, worn over socks)
    """A football boot / trainer / town shoe built as a last around the foot: rounded heel, a toe box
    that narrows and drops, a flat sole on the ground (trainers: thicker, white). Weighted to the foot and
    toe bones. The bare foot underneath is hidden."""
    foot = body.mask({f'foot_{side}', f'ball_{side}'})
    P = body.V[foot]
    fh = body.B[f'foot_{side}'][0]
    bt = body.B[f'ball_{side}'][1]
    fwd = (bt - fh)
    fwd[2] = 0
    fwd /= np.linalg.norm(fwd)
    across = np.cross([0, 0, 1.0], fwd)
    rel = P - fh
    a = rel @ fwd
    c = rel @ across
    s0, s1 = float(a.min()) - 0.006, float(a.max()) + 0.008
    sole_t = 0.012 if kind == 'trainer' else 0.008
    rings, seg = 18, 24
    V, F = [], []
    ss = np.linspace(0, 1, rings)
    for s_ in ss:
        x = s0 + (s1 - s0) * s_
        band = np.abs(a - x) < (s1 - s0) / rings * 1.2
        if band.any():
            cl, cr = float(c[band].min()), float(c[band].max())
            top = float(P[band, 2].max())
        else:
            cl, cr, top = -0.03, 0.03, 0.05
        cm = (cl + cr) / 2
        hw = (cr - cl) / 2 + 0.006
        h = top + 0.005
        # round the heel and the toe
        if s_ < 0.12:
            k = np.sqrt(max(0.0, 1 - ((0.12 - s_) / 0.12) ** 2))
            hw *= 0.35 + 0.65 * k
        if s_ > 0.82:
            k = np.sqrt(max(0.0, 1 - ((s_ - 0.82) / 0.18) ** 2))
            hw *= 0.25 + 0.75 * k
            h = sole_t + (h - sole_t) * (0.35 + 0.65 * k)
        if kind == 'boot' and s_ < 0.45:
            h = min(h, body.ankleZ + 0.012)
        if kind == 'slide':
            # flat everywhere but the strap (a band across the instep, a little above the sock)
            h = top + 0.009 if 0.4 < s_ < 0.62 else 0.007
            hw += 0.004
        for j in range(seg):
            th = 2 * math.pi * j / seg
            cx, cz = math.cos(th), math.sin(th)
            # superellipse: flat sole, rounded upper
            ex = np.sign(cx) * abs(cx) ** 0.7
            ez = np.sign(cz) * abs(cz) ** (0.55 if cz > 0 else 0.25)
            z = (sole_t * 0.5 - 0.004) + (ez * 0.5 + 0.5) * (h - sole_t * 0.5 + 0.004) if cz > 0 else -0.004 + (1 + ez) * sole_t * 0.6
            pos = fh + fwd * x + across * (cm + ex * hw)
            pos[2] = max(-0.004, z)
            V.append(pos)
    for i in range(rings - 1):
        for j in range(seg):
            a0 = i * seg + j
            a1 = i * seg + (j + 1) % seg
            F.append([a0, a1, a1 + seg, a0 + seg])
    # close both ends
    for end, flip in ((0, True), (rings - 1, False)):
        cidx = len(V)
        V.append(np.mean([V[end * seg + j] for j in range(seg)], axis=0))
        for j in range(seg):
            a0 = end * seg + j
            a1 = end * seg + (j + 1) % seg
            F.append([a1, a0, cidx] if flip else [a0, a1, cidx])
    V = np.array(V)
    rel = V - fh
    srel = (rel @ fwd - s0) / (s1 - s0)
    W = [{f'foot_{side}': float(np.clip((0.78 - t) / 0.2, 0, 1)), f'ball_{side}': float(np.clip((t - 0.58) / 0.2, 0, 1))} for t in srel]
    W = [{k: v / (sum(w.values()) or 1) for k, v in w.items() if v > 0} or {f'foot_{side}': 1.0} for w in W]
    sole = (V[:, 2] < sole_t * 0.9).astype(float)
    nm = name or f'shoe_{side}'
    p = Piece(nm, V, F, [[(0.5, 0.5)] * len(f) for f in F], W, nm, src=None)
    p.colors = np.stack([sole, np.zeros(len(V)), np.zeros(len(V)), np.ones(len(V))], 1)
    return p


def hide_body(body: Body, piece: Piece) -> Piece:
    """The body without the faces hidden under the clothes (and the skin under close edges sunk in)."""
    ins = body.inset[np.minimum(piece.src, len(body.inset) - 1)]
    if ins.any():
        N = mh.vertex_normals(piece.V, piece.F)
        piece.V = piece.V - N * ins[:, None]
    keep = [k for k, f in enumerate(piece.F) if not body.hidden[piece.src[f]].all()]
    used = sorted({v for k in keep for v in piece.F[k]})
    remap = {v: i for i, v in enumerate(used)}
    return Piece(piece.name, piece.V[used], [[remap[v] for v in piece.F[k]] for k in keep], [piece.UV[k] for k in keep],
                 [piece.W[v] for v in used], piece.material, src=piece.src[used], colors=None if piece.colors is None else piece.colors[used])


def skirt(body: Body, waist: float = 0.12, flare: float = 0.07, name='skirt') -> Piece:
    """A long wrap skirt (pagne) from the waist to the ankles: rings that follow the hips and thighs,
    widen into a bell below the knees. Weighted mostly to the pelvis, a little to each thigh so it
    sways when the legs move."""
    waistZ = body.hipZ + (body.shoulderZ - body.hipZ) * waist
    bottom = body.ankleZ + 0.035
    legs = body.mask({'pelvis', 'spine_01', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r'})
    P = body.V[legs]
    cx = float(body.V[body.mask({'pelvis'}), 0].mean())
    cy = float(body.V[body.mask({'pelvis'}), 1].mean())
    rings, seg = 22, 40
    V = []
    hipw = 0.0
    for i in range(rings):
        f = i / (rings - 1)
        z = waistZ + (bottom - waistZ) * f
        band = np.abs(P[:, 2] - z) < 0.03
        Q = P[band] if band.any() else P
        for j in range(seg):
            a = 2 * math.pi * j / seg
            d = np.array([math.cos(a), math.sin(a)])
            # the body's extent in this direction at this height (a convex wrap around both legs)
            proj = (Q[:, 0] - cx) * d[0] + (Q[:, 1] - cy) * d[1]
            r = float(proj.max()) if len(proj) else 0.15
            hipw = max(hipw, r) if f < 0.3 else hipw
            r = max(r, hipw * (0.92 if f > 0.3 else 0)) + 0.014 + flare * max(0.0, f - 0.45) ** 1.5 * 2
            V.append([cx + d[0] * r, cy + d[1] * r, z])
    V = np.array(V)
    V = mh.smooth(V, _grid_faces(rings, seg), 4, 0.4)
    # outward-facing: the rings go down, the angle turns anticlockwise seen from above
    F = [list(reversed(f)) for f in _grid_faces(rings, seg)]
    # weights: pelvis, thighs, a touch of calves at the hem
    W = []
    for k, v in enumerate(V):
        f = (k // seg) / (rings - 1)
        side = np.clip((v[0] - cx) / max(hipw, 0.05), -1, 1)
        leg = 0.55 * f
        w = {'pelvis': 1 - leg, 'thigh_l': leg * (side + 1) / 2 * 0.8, 'thigh_r': leg * (1 - side) / 2 * 0.8}
        if f > 0.7:
            w['calf_l'] = leg * (side + 1) / 2 * 0.2
            w['calf_r'] = leg * (1 - side) / 2 * 0.2
        else:
            w['thigh_l'] += leg * (side + 1) / 2 * 0.2
            w['thigh_r'] += leg * (1 - side) / 2 * 0.2
        s = sum(w.values())
        W.append({b: x / s for b, x in w.items() if x > 1e-3})
    u = np.array([(k % seg) / seg for k in range(len(V))])
    vv = np.array([1 - (k // seg) / (rings - 1) for k in range(len(V))])
    p = Piece(name, V, F, [], W, 'dress')
    p.UV = _per_loop(p, np.stack([u * 2.0, vv * 2.2], 1), wrap_u=False)
    # fix the seam column (u wraps)
    for fi, f in enumerate(F):
        us = [p.UV[fi][k][0] for k in range(4)]
        if max(us) - min(us) > 1.0:
            p.UV[fi] = [(x + 2.0 if x < 1.0 else x, y) for x, y in p.UV[fi]]
    hem_d = np.array([(rings - 1 - k // seg) for k in range(len(V))])
    p.colors = np.stack([np.zeros(len(V)), np.zeros(len(V)), np.clip(1 - hem_d / 1.5, 0, 1), np.ones(len(V))], 1)
    return p


def _grid_faces(rings: int, seg: int) -> list[list[int]]:
    F = []
    for i in range(rings - 1):
        for j in range(seg):
            a = i * seg + j
            b = i * seg + (j + 1) % seg
            F.append([a, b, b + seg, a + seg])
    return F


def beard(body: Body, ears: np.ndarray, lips: np.ndarray, full=True, name='beard') -> Piece:
    """A short beard: the jaw, the chin and the upper lip, a shell of hair a few millimetres thick."""
    vb = body.vb
    E = (vb[mh.group_verts('joint-l-eye')].mean(0) + vb[mh.group_verts('joint-r-eye')].mean(0)) / 2
    rel = body.V - E
    phi = np.abs(np.arctan2(rel[:, 0], -rel[:, 1]))
    top = float(body.V[body.dom == 'head', 2].max())
    k = (top - E[2]) / 0.105
    sel = (np.isin(body.dom, ['head', 'neck_01'])) & (rel[:, 2] < -0.045 * k) & (rel[:, 2] > -0.125 * k) & (phi < (1.75 if full else 1.2)) & (ears < 0.2) & (lips < 0.25)
    # not under the chin down the neck
    sel &= ~((body.dom == 'neck_01') & (rel[:, 2] < -0.105 * k))
    p = body.cut(name, sel, 'beard')
    p.V = mh.smooth_boundary(p.V, p.F, 8, 0.6)
    N = mh.vertex_normals(p.V, p.F)
    d = mh.ring_distance(len(p.V), p.F, mh.boundary_verts(p.F), 3)
    p.V = p.V + N * (0.0012 + 0.003 * np.clip(d / 2, 0, 1))[:, None]
    p.W = [{'head': 1.0} for _ in range(len(p.V))]
    p.UV = [[(0.5, 0.5)] * len(f) for f in p.F]
    return p


def glasses(body: Body, name='glasses') -> Piece:
    """Thin rectangular glasses: two rims, a bridge, two arms back to the ears."""
    vb = body.vb
    eyes = {s: vb[mh.group_verts(f'joint-{s}-eye')].mean(0) for s in ('l', 'r')}
    V, F = [], []

    def tube(a, b, r=0.0016, n=6):
        a, b = np.array(a, float), np.array(b, float)
        d = b - a
        L = np.linalg.norm(d)
        d /= L
        up = np.array([0, 0, 1.0]) if abs(d[2]) < 0.9 else np.array([1.0, 0, 0])
        s1 = np.cross(d, up); s1 /= np.linalg.norm(s1)
        s2 = np.cross(d, s1)
        base = len(V)
        for end in (a, b):
            for i in range(n):
                t = 2 * math.pi * i / n
                V.append(end + (s1 * math.cos(t) + s2 * math.sin(t)) * r)
        for i in range(n):
            F.append([base + i, base + (i + 1) % n, base + n + (i + 1) % n, base + n + i])
    for s, e in eyes.items():
        c = e + np.array([0, -0.016, 0.001])
        w, h = 0.023, 0.016
        corners = [c + np.array([-w, 0, -h]), c + np.array([w, 0, -h]), c + np.array([w, 0, h]), c + np.array([-w, 0, h])]
        for i in range(4):
            tube(corners[i], corners[(i + 1) % 4])
        out = 1 if s == 'l' else -1
        tube(c + np.array([out * w, 0, h * 0.6]), e + np.array([out * 0.068, 0.07, 0.004]))
    tube(eyes['l'] + np.array([-0.023, -0.016, 0.006]), eyes['r'] + np.array([0.023, -0.016, 0.006]))
    V = np.array(V)
    return Piece(name, V, F, [[(0.5, 0.5)] * 4 for _ in F], [{'head': 1.0} for _ in range(len(V))], 'glasses')


def cane(body: Body, side='r', name='cane') -> Piece:
    """A wooden walking stick held in the hand, down to the ground (rigid on the hand)."""
    h = body.B[f'hand_{side}'][0]
    mid = (body.B[f'middle_01_{side}'][0] + h) / 2
    top = mid + np.array([0, -0.01, 0.02])
    bottom = np.array([top[0] + (0.06 if side == 'l' else -0.06), top[1] - 0.12, 0.0])
    V, F = [], []
    n = 8
    for end, r in ((top, 0.011), (bottom, 0.009)):
        d = bottom - top
        d /= np.linalg.norm(d)
        s1 = np.cross(d, [1, 0, 0]); s1 /= np.linalg.norm(s1)
        s2 = np.cross(d, s1)
        for i in range(n):
            t = 2 * math.pi * i / n
            V.append(end + (s1 * math.cos(t) + s2 * math.sin(t)) * r)
    for i in range(n):
        F.append([i, (i + 1) % n, n + (i + 1) % n, n + i])
    V = np.array(V)
    return Piece(name, V, F, [[(0.5, 0.5)] * 4 for _ in F], [{f'hand_{side}': 1.0} for _ in range(len(V))], 'cane')


def earrings(body: Body, ears: np.ndarray, name='earrings') -> Piece:
    """Small gold hoops at the lobes (the lowest ear vertices)."""
    V, F = [], []
    import hair as H
    for s in (1, -1):
        m = (ears > 0.5) & (np.sign(body.V[:, 0]) == s)
        if not m.any():
            continue
        lobe = body.V[m][np.argmin(body.V[m][:, 2])] + np.array([0, -0.003, -0.006])
        sv, sf = H.icosphere(0.0045, 1)
        base = len(V)
        V.extend(list(sv + lobe))
        F.extend([[a + base for a in f] for f in sf])
    V = np.array(V)
    return Piece(name, V, F, [[(0.5, 0.5)] * len(f) for f in F], [{'head': 1.0} for _ in range(len(V))], 'earrings')
