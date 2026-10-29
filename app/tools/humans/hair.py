"""
Hair from MakeHuman's hair helper (a cap that hugs the scalp, its edge is the hairline): close crops,
a soft round afro, an afro puff, twists, cornrows, a cap, a head wrap. All rigid on the head bone.
"""
from __future__ import annotations

import math

import numpy as np

import mh
from mh import Piece


def _noise3(P: np.ndarray, freq: float, seed: int) -> np.ndarray:
    """Cheap smooth 3D value noise (sum of sines with random directions), -1..1."""
    rng = np.random.default_rng(seed)
    out = np.zeros(len(P))
    for _ in range(7):
        d = rng.normal(size=3)
        d /= np.linalg.norm(d)
        f = freq * (0.6 + rng.random() * 1.2)
        out += np.sin(P @ d * f + rng.random() * 6.28)
    return out / 7 * 1.6


def head_only(W_len: int) -> list[dict[str, float]]:
    return [{'head': 1.0} for _ in range(W_len)]


HAIRLINE = [(0.0, 0.044), (0.55, 0.038), (1.0, 0.03), (1.3, 0.034), (1.75, 0.034), (2.1, 0.0), (2.5, -0.04), (math.pi, -0.058)]


def scalp_mask(body, ears: np.ndarray) -> np.ndarray:
    vb = body.vb
    E = (vb[mh.group_verts('joint-l-eye')].mean(0) + vb[mh.group_verts('joint-r-eye')].mean(0)) / 2
    top = float(body.V[body.dom == 'head', 2].max())
    k = (top - E[2]) / 0.105
    rel = body.V - E
    phi = np.abs(np.arctan2(rel[:, 0], -rel[:, 1]))
    xs, ys = zip(*HAIRLINE)
    line = np.interp(phi, xs, ys) * k
    sel = (np.isin(body.dom, ['head', 'neck_01'])) & (rel[:, 2] > line) & (ears < 0.25)
    sel &= ~((body.dom == 'neck_01') & (rel[:, 2] < -0.075 * k))
    return sel


def scalp_piece(body, ears: np.ndarray) -> Piece:
    """The scalp: head vertices above a hairline that runs from the forehead over the ears to the nape."""
    vb = body.vb
    E = (vb[mh.group_verts('joint-l-eye')].mean(0) + vb[mh.group_verts('joint-r-eye')].mean(0)) / 2
    top = float(body.V[body.dom == 'head', 2].max())
    k = (top - E[2]) / 0.105
    rel = body.V - E
    phi = np.abs(np.arctan2(rel[:, 0], -rel[:, 1]))
    xs, ys = zip(*HAIRLINE)
    line = np.interp(phi, xs, ys) * k
    sel = (np.isin(body.dom, ['head', 'neck_01'])) & (rel[:, 2] > line) & (ears < 0.25)
    sel &= ~((body.dom == 'neck_01') & (rel[:, 2] < -0.075 * k))
    p = body.cut('scalp', sel, 'hair')
    p.V = mh.smooth_boundary(p.V, p.F, iters=10, factor=0.6)
    p.W = head_only(len(p.V))
    return p


def skull_center(vb: np.ndarray) -> np.ndarray:
    eyes = (vb[mh.group_verts('joint-l-eye')].mean(0) + vb[mh.group_verts('joint-r-eye')].mean(0)) / 2
    return eyes + np.array([0.0, 0.035, 0.025])


def shape_cap(V: np.ndarray, F, kind: str, center: np.ndarray, seed=1, thickness=None) -> np.ndarray:
    """Displace a (subdivided) cap: V vertices, F faces (lists)."""
    N = mh.vertex_normals(V, F)
    bnd = mh.boundary_verts(F)
    d = mh.ring_distance(len(V), F, bnd, maxd=8).astype(float)
    if kind in ('crop', 'cornrows', 'puff', 'twists', 'cap'):
        th = thickness or 0.005
        taper = np.clip(d / 4, 0.45, 1.0)
        n = _noise3(V, 160, seed) * 0.0009
        return V + N * (th * taper + n)[:, None]
    if kind == 'afro':
        th = thickness or 0.032
        R = V - center
        r = np.linalg.norm(R, axis=1)
        dirs = R / r[:, None]
        # the volume rises gently from the hairline (no helmet rim): a ramp measured in centimetres from
        # the edge, longer over the forehead (3 cm at the nape and the ears, 5.5 cm at the front)
        Bp = V[sorted(bnd)]
        dist = np.sqrt(((V[:, None, :] - Bp[None, :, :]) ** 2).sum(2)).min(1)
        front = np.clip(-dirs[:, 1], 0, 1)
        t_ = np.clip(dist / (0.03 + 0.025 * front), 0, 1)
        taper = t_ * t_ * (3 - 2 * t_)
        # fuller on the crown than at the nape and the temples; at the front the hair rises from the
        # hairline instead of growing forwards over the forehead
        fwd = np.clip(-dirs[:, 1], 0, 1)
        up = np.clip(dirs[:, 2] * 0.8 + 0.45 - 0.45 * fwd * (1 - np.clip(dirs[:, 2], 0, 1)), 0.22, 1.0)
        rr = r + th * taper * up
        # rounder: the corners of the dome are pulled towards a sphere round the crown
        full = taper > 0.9
        Rs = float(np.percentile(rr[full], 65)) if full.any() else float(rr.max())
        rr = rr + (Rs - rr) * 0.35 * taper * np.clip(dirs[:, 2] + 0.3, 0, 1)
        rr += _noise3(V, 55, seed) * 0.0045 * taper + _noise3(V, 140, seed + 3) * 0.0018 * taper + _noise3(V, 320, seed + 5) * 0.0007
        # the volume grows outwards from the skull, but upwards over the forehead (no peak overhanging it)
        g = dirs + np.array([0, 0, 1.0]) * (1.1 * fwd)[:, None]
        g /= np.linalg.norm(g, axis=1)[:, None]
        out = V + g * (rr - r)[:, None]
        out = np.where(((out - V) * N).sum(1)[:, None] < 0.003, V + N * 0.003, out)
        return mh.smooth(out, F, 6, 0.4, pin=np.array(sorted(bnd), int), taubin=True)
    if kind == 'wrap':
        th = thickness or 0.018
        taper = np.clip(d / 5, 0.3, 1.0)
        return V + N * (th * taper)[:, None]
    return V


def icosphere(radius: float, subdiv=2) -> tuple[np.ndarray, list[list[int]]]:
    t = (1 + 5 ** 0.5) / 2
    V = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    F = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
         (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    V = [np.array(v, float) / np.linalg.norm(v) for v in V]
    F = [list(f) for f in F]
    for _ in range(subdiv):
        mid: dict[tuple[int, int], int] = {}
        nf = []

        def m(a, b):
            k = (min(a, b), max(a, b))
            if k not in mid:
                v = V[a] + V[b]
                V.append(v / np.linalg.norm(v))
                mid[k] = len(V) - 1
            return mid[k]
        for a, b, c in F:
            ab, bc, ca = m(a, b), m(b, c), m(c, a)
            nf += [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]
        F = nf
    return np.array(V) * radius, F


def puff_ball(center: np.ndarray, radius: float, seed=2) -> Piece:
    V, F = icosphere(1.0, 3)
    n = _noise3(V * radius, 90, seed)
    V = V * (radius * (1 + 0.06 * n))[:, None]
    V[:, 2] *= 0.85
    V = V + center
    UV = [[(0.5, 0.5)] * 3 for _ in F]
    return Piece('hair_puff', V, F, UV, head_only(len(V)), 'hair')


def twists(cap_V: np.ndarray, cap_F, center: np.ndarray, count=46, seed=3) -> Piece:
    """Short two-strand twists standing out of the crown (Radio)."""
    rng = np.random.default_rng(seed)
    N = mh.vertex_normals(cap_V, cap_F)
    bnd = mh.boundary_verts(cap_F)
    d = mh.ring_distance(len(cap_V), cap_F, bnd, 6)
    cand = np.where(d >= 2)[0]
    picks = rng.choice(cand, size=min(count, len(cand)), replace=False)
    V: list[np.ndarray] = []
    F: list[list[int]] = []
    seg, ring = 5, 6
    for pi in picks:
        root = cap_V[pi]
        nrm = N[pi]
        out = (root - center)
        out /= np.linalg.norm(out)
        dirv = nrm * 0.6 + out * 0.4 + np.array([0, 0, -0.25])  # a little droop
        dirv /= np.linalg.norm(dirv)
        length = 0.03 + rng.random() * 0.02
        side = np.cross(dirv, [0, 0, 1.0])
        if np.linalg.norm(side) < 1e-3:
            side = np.array([1.0, 0, 0])
        side /= np.linalg.norm(side)
        up = np.cross(side, dirv)
        base_i = len(V)
        for s in range(seg + 1):
            t = s / seg
            c = root + dirv * length * t
            r = 0.0055 * (1 - 0.45 * t)
            for k in range(ring):
                a = 2 * math.pi * k / ring + t * 5.0
                wob = 1 + 0.25 * math.sin(a * 2 + t * 9)
                V.append(c + (side * math.cos(a) + up * math.sin(a)) * r * wob)
        for s in range(seg):
            for k in range(ring):
                a = base_i + s * ring + k
                b = base_i + s * ring + (k + 1) % ring
                F.append([a, b, b + ring, a + ring])
        tip = len(V)
        V.append(root + dirv * length * 1.04)
        for k in range(ring):
            a = base_i + seg * ring + k
            b = base_i + seg * ring + (k + 1) % ring
            F.append([a, b, tip])
    V = np.array(V)
    UV = [[(0.5, 0.5)] * len(f) for f in F]
    return Piece('hair_twists', V, F, UV, head_only(len(V)), 'hair')


def cap_brim(cap_V: np.ndarray, center: np.ndarray, front=-1.0) -> Piece:
    """A baseball cap: the crown is the cap shell (material 'cap'); the brim is a curved plate in front."""
    lowest_front = cap_V[np.argmin(cap_V[:, 1])]
    y0 = lowest_front[1] + 0.012
    z0 = float(np.percentile(cap_V[:, 2], 22))
    w, depth = 0.085, 0.075
    V, F = [], []
    nu, nv = 10, 4
    for j in range(nv + 1):
        for i in range(nu + 1):
            u = (i / nu - 0.5) * 2
            v = j / nv
            x = u * w * (1 - 0.35 * v)
            y = y0 - depth * v * (1 - 0.25 * u * u)
            z = z0 - 0.012 * v - 0.012 * u * u
            V.append((center[0] + x, y, z))
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i
            F.append([a, a + 1, a + nu + 2, a + nu + 1])
    V = np.array(V)
    # thickness: a second, slightly lower sheet, flipped
    n = len(V)
    V2 = V - np.array([0, 0, 0.004])
    F2 = [list(reversed([k + n for k in f])) for f in F]
    V = np.vstack([V, V2])
    F = F + F2
    UV = [[(0.5, 0.5)] * 4 for _ in F]
    return Piece('cap_brim', V, F, UV, head_only(len(V)), 'cap')


def wrap_knot(cap_V: np.ndarray, center: np.ndarray, seed=5) -> Piece:
    """The knot of a head wrap (foulard): two folded lobes standing up at the back of the crown."""
    rng = np.random.default_rng(seed)
    top = cap_V[np.argmax(cap_V[:, 2])]
    pieces_V, pieces_F = [], []
    for k, (dx, dy, dz, s) in enumerate([(0.0, 0.03, 0.035, 0.055), (0.03, 0.015, 0.03, 0.04), (-0.032, 0.02, 0.028, 0.042)]):
        V, F = icosphere(1.0, 2)
        n = _noise3(V, 4, seed + k)
        V = V * (1 + 0.12 * n)[:, None]
        V = V * np.array([s * 1.2, s * 0.9, s * 0.75])
        V = V + top + np.array([dx, dy, dz])
        base = sum(len(v) for v in pieces_V)
        pieces_V.append(V)
        pieces_F.extend([[a + base for a in f] for f in F])
    V = np.vstack(pieces_V)
    UV = [[(0.5, 0.5)] * 3 for _ in pieces_F]
    return Piece('wrap_knot', V, pieces_F, UV, head_only(len(V)), 'wrap')


def hat(cap_V: np.ndarray, F, center: np.ndarray) -> list[Piece]:
    """A woman's brimmed hat: a rounded crown over the head and a wide soft brim."""
    crown = shape_cap(cap_V, F, 'wrap', center, thickness=0.028)
    crown_p = Piece('hat_crown', crown, F, [[(0.5, 0.5)] * len(f) for f in F], head_only(len(crown)), 'hat')
    bnd = sorted(mh.boundary_verts(F))
    z0 = float(np.percentile(crown[:, 2], 30))
    rad = float(np.percentile(np.linalg.norm((crown - center)[:, :2], axis=1), 90))
    V, Fb = [], []
    seg, rings = 36, 4
    for i in range(rings + 1):
        r = rad * (0.95 + 0.9 * i / rings)
        for j in range(seg):
            a = 2 * math.pi * j / seg
            V.append([center[0] + math.cos(a) * r, center[1] + math.sin(a) * r, z0 - 0.025 * (i / rings) ** 2])
    for i in range(rings):
        for j in range(seg):
            a = i * seg + j
            b = i * seg + (j + 1) % seg
            Fb.append([a, b, b + seg, a + seg])
    V = np.array(V)
    n = len(V)
    V2 = V - np.array([0, 0, 0.004])
    Fb2 = [list(reversed([k + n for k in f])) for f in Fb]
    V = np.vstack([V, V2])
    brim = Piece('hat_brim', V, Fb + Fb2, [[(0.5, 0.5)] * 4 for _ in Fb + Fb2], head_only(len(V)), 'hat')
    # a band of flowers round the crown (small spheres, coloured at runtime by the band material)
    FV, FF = [], []
    for j in range(14):
        a = 2 * math.pi * j / 14
        c = center + np.array([math.cos(a) * rad * 0.98, math.sin(a) * rad * 0.98, 0]) 
        c[2] = z0 + 0.012
        sv, sf = icosphere(0.011, 1)
        base = len(FV)
        FV.extend(list(sv + c))
        FF.extend([[x + base for x in f] for f in sf])
    flowers = Piece('hat_flowers', np.array(FV), FF, [[(0.5, 0.5)] * 3 for _ in FF], head_only(len(FV)), 'flowers')
    return [crown_p, brim, flowers]


def boundary_loop(F) -> list[int]:
    """The vertices of a cap's single boundary, in order round the loop."""
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
    start = min(nxt)
    loop, prev, cur = [start], None, start
    while True:
        nb = [v for v in nxt[cur] if v != prev]
        if not nb or nb[0] == start:
            break
        prev, cur = cur, nb[0]
        loop.append(cur)
        if len(loop) > len(nxt) + 2:
            break
    return loop


def long_hair(cap_V: np.ndarray, cap_F, center: np.ndarray, length: float, seed=7) -> Piece:
    """Straight hair cut in a bob: a sleek shell over the scalp, and round the head from one temple by
    the back to the other, a curtain that hangs from the widest part of the skull (clear of the neck),
    over the ears, to about the chin, flaring a little and closed underneath (outer and inner sheets
    joined at the cut). `length` is the drop at the back below the eyes."""
    shell = shape_cap(cap_V, cap_F, 'wrap', center, thickness=0.009)
    shell = mh.smooth(shell, cap_F, 3, 0.4, pin=np.array(sorted(mh.boundary_verts(cap_F)), int), taubin=True)
    eye_z = center[2] - 0.025
    rel_all = shell - center
    az_all = np.arctan2(rel_all[:, 0], -rel_all[:, 1])
    rad_all = np.hypot(rel_all[:, 0], rel_all[:, 1])
    # the azimuths the curtain covers: from in front of one ear, round the back, to the other
    cols = 72
    a0 = 1.3
    azs = np.concatenate([np.linspace(a0, math.pi, cols // 2, endpoint=False), np.linspace(-math.pi, -a0, cols // 2)])
    tops = []
    for a in azs:
        d = np.abs(np.angle(np.exp(1j * (az_all - a))))
        near = (d < 0.07) & (rel_all[:, 2] > -0.06)
        if not near.any():
            near = d < 0.15
        k = np.argmax(np.where(near, rad_all, -1))
        tops.append((float(rad_all[k]), float(shell[k][2])))
    # smooth the top line round the head
    tr = np.convolve(np.pad([t[0] for t in tops], 3, mode='edge'), np.ones(7) / 7, mode='valid')
    tz = np.convolve(np.pad([t[1] for t in tops], 3, mode='edge'), np.ones(7) / 7, mode='valid')
    V = [v for v in shell]
    F = [list(f) for f in cap_F]
    UV = [[(0.5, 0.5)] * len(f) for f in cap_F]
    rows = 8
    outer: list[list[int]] = [[] for _ in range(rows + 1)]
    inner: list[list[int]] = [[] for _ in range(rows + 1)]
    for i, a in enumerate(azs):
        h = np.array([math.sin(a), -math.cos(a), 0.0])
        # the cut slopes up towards the face: chin length at the back, mid-ear at the temples
        e = (abs(a) - a0) / (math.pi - a0)
        bottom = eye_z - length * (0.45 + 0.55 * math.sqrt(max(0.0, min(1.0, e * 1.6))))
        top_z = min(tz[i], eye_z + 0.03)
        for r in range(rows + 1):
            if r == 0:
                # the top edge tucked under the shell, above the widest part: the curtain comes out
                # of the hair where the skull curves back in (no ledge)
                z, rr = top_z + 0.016, tr[i] - 0.007
            else:
                t = (r - 1) / (rows - 1)
                z = top_z + (bottom - top_z) * t
                rr = tr[i] + 0.002 + 0.014 * t * t + _noise3(np.array([[a, t, 0.0]]), 3, seed)[0] * 0.0012
            p = np.array([center[0], center[1], 0.0]) + h * rr + np.array([0, 0, z])
            outer[r].append(len(V)); V.append(p)
            inner[r].append(len(V)); V.append(p - h * 0.007)
    V = np.array(V)
    # uvs for the strands: u round the head (mirrored left/right, no seam at the back), v down from the crown
    rel = V - center
    zt, zb = float(V[:, 2].max()), float(V[:, 2].min())
    uvv = np.stack([np.abs(np.arctan2(rel[:, 0], -rel[:, 1])) / math.pi, (zt - V[:, 2]) / max(1e-6, zt - zb)], 1)
    UV = [[tuple(uvv[k]) for k in f] for f in F]

    def quad(a, b, c, d, want):
        f = [a, b, c, d]
        nrm = np.cross(V[b] - V[a], V[d] - V[a])
        if np.dot(nrm, want) < 0:
            f = f[::-1]
        F.append(f)
        UV.append([tuple(uvv[k]) for k in f])

    m = len(azs)
    for r in range(rows):
        for i in range(m - 1):
            mid = (V[outer[r][i]] + V[outer[r + 1][i + 1]]) / 2
            h = np.array([mid[0] - center[0], mid[1] - center[1], 0.0])
            quad(outer[r][i], outer[r][i + 1], outer[r + 1][i + 1], outer[r + 1][i], h)
            quad(inner[r][i], inner[r][i + 1], inner[r + 1][i + 1], inner[r][i], -h) if False else quad(inner[r][i], inner[r][i + 1], inner[r + 1][i + 1], inner[r + 1][i], -h)
    for i in range(m - 1):
        quad(outer[rows][i], outer[rows][i + 1], inner[rows][i + 1], inner[rows][i], np.array([0, 0, -1.0]))
    for i in (0, m - 1):
        a = azs[i]
        side = np.array([math.cos(a), math.sin(a), 0.0]) * (-1 if i == 0 else 1)
        for r in range(rows):
            quad(outer[r][i], outer[r + 1][i], inner[r + 1][i], inner[r][i], side)
    return Piece('hair_long', V, F, UV, head_only(len(V)), 'hair')


def ponytail(cap_V: np.ndarray, cap_F, center: np.ndarray, scale: float = 1.0) -> Piece:
    """Hair pulled back tight (a sleek shell) and tied high at the back of the head: a ponytail that
    hangs from the tie down the nape, tapering (Coach Whitfield)."""
    shell = shape_cap(cap_V, cap_F, 'wrap', center, thickness=0.006)
    shell = mh.smooth(shell, cap_F, 3, 0.4, pin=np.array(sorted(mh.boundary_verts(cap_F)), int), taubin=True)
    rel = shell - center
    band = (rel[:, 2] > -0.005) & (rel[:, 2] < 0.035) & (np.abs(rel[:, 0]) < 0.02)
    k = int(np.argmax(np.where(band, rel[:, 1], -1)))
    root = shell[k] + np.array([0, 0.004, 0])
    V = [v for v in shell]
    F = [list(f) for f in cap_F]
    rings, sides = 12, 10
    base = len(V)
    for i in range(rings + 1):
        t = i / rings
        c = root + np.array([0, (0.03 + 0.02 * t) * scale * math.sin(min(1.0, t * 2.2) * math.pi / 2), -0.2 * scale * t])
        r = (0.021 if t > 0.06 else 0.026) * scale * (1 - 0.65 * t ** 1.4)
        for j in range(sides):
            a = 2 * math.pi * j / sides
            V.append(c + np.array([math.cos(a) * r, math.sin(a) * r * 0.8, 0.0]))
    for i in range(rings):
        for j in range(sides):
            a0 = base + i * sides + j
            a1 = base + i * sides + (j + 1) % sides
            F.append([a0, a1, a1 + sides, a0 + sides])
    tip = len(V)
    V.append(root + np.array([0, 0.05 * scale, -0.205 * scale]))
    for j in range(sides):
        a0 = base + rings * sides + j
        a1 = base + rings * sides + (j + 1) % sides
        F.append([a0, a1, tip])
    V = np.array(V)
    relv = V - center
    zt, zb = float(V[:, 2].max()), float(V[:, 2].min())
    uvv = np.stack([np.abs(np.arctan2(relv[:, 0], -relv[:, 1])) / math.pi, (zt - V[:, 2]) / max(1e-6, zt - zb)], 1)
    UV = [[tuple(uvv[q]) for q in f] for f in F]
    return Piece('hair_pony', V, F, UV, head_only(len(V)), 'hair')
