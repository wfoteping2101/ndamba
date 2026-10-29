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


def _shell(body: Body, p: Piece, offset, smooth_iters=6, hide_rings=2, taubin=False, axis=None, rules=None) -> Piece:
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


def shirt(body: Body, sleeve: float = 0.55, long_sleeves=False, hem: float = -0.04, loose=0.011, name='shirt') -> Piece:
    """A football shirt (short sleeves) or a long-sleeved top. hem: fraction of the hip->shoulder height."""
    hemZ = body.hipZ + (body.shoulderZ - body.hipZ) * hem
    z = body.V[:, 2]
    torso = body.mask(TORSO) & (z > hemZ)
    torso &= ~((body.dom == 'neck_01') & (body.t > 0.12))
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
    rules = [
        (lambda s, pos: abs(pos[0]) < sx * 0.9 and pos[2] < hemZ + 0.05, lambda s, pos: np.array([pos[0], pos[1], hemZ])),
        (lambda s, pos: pos[0] > sx, _proj_bone(body, f'{end_bone}_l', sleeve)),
        (lambda s, pos: pos[0] < -sx, _proj_bone(body, f'{end_bone}_r', sleeve)),
    ]
    _straighten(body, p, rules)
    src = p.src
    is_arm = np.abs(p.V[:, 0]) > sx
    bottom = (~is_arm) & (p.V[:, 2] < hemZ + 0.03)
    cuff = is_arm
    neck = (~is_arm) & (p.V[:, 2] > body.shoulderZ - 0.02)
    bnd = mh.boundary_verts(p.F)
    d_bottom = mh.ring_distance(len(p.V), p.F, {i for i in bnd if bottom[i]}, 5)
    d_cuff = mh.ring_distance(len(p.V), p.F, {i for i in bnd if cuff[i]}, 5)
    d_neck = mh.ring_distance(len(p.V), p.F, {i for i in bnd if neck[i]}, 5)

    def offset(_src, _V):
        o = np.full(len(_V), loose)
        o += np.clip(1 - d_bottom / 4, 0, 1) * loose * 0.9      # the hem hangs away from the belly
        o += np.clip(1 - d_cuff / 3, 0, 1) * loose * 0.6        # sleeves flare
        o -= np.clip(1 - d_neck / 2, 0, 1) * loose * 0.45       # the collar sits on the neck
        return o
    def shirt_axis(i, pos):
        if abs(pos[0]) > sx:
            bn = f'{end_bone}_l' if pos[0] > 0 else f'{end_bone}_r'
            d = body.B[bn][1] - body.B[bn][0]
            return d / np.linalg.norm(d)
        if pos[2] < hemZ + 0.06:
            return np.array([0, 0, 1.0])
        return None
    p = _shell(body, p, offset, smooth_iters=8, axis=shirt_axis, rules=rules)
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
    """The body without the faces hidden under the clothes."""
    keep = [k for k, f in enumerate(piece.F) if not body.hidden[piece.src[f]].all()]
    used = sorted({v for k in keep for v in piece.F[k]})
    remap = {v: i for i, v in enumerate(used)}
    return Piece(piece.name, piece.V[used], [[remap[v] for v in piece.F[k]] for k in keep], [piece.UV[k] for k in keep],
                 [piece.W[v] for v in used], piece.material, src=piece.src[used], colors=None if piece.colors is None else piece.colors[used])
