"""
Rigged humans for the Jeux, built with Blender's Python module (pip package `bpy`) from the
MakeHuman base mesh, morph targets, game-engine rig and skin weights as shipped in MPFB2's data
folder (all CC0, https://github.com/makehumancommunity/mpfb2, LICENSE.ASSETS.md).

This file only READS that data; the code is ours. Pipeline:
  macro sliders (gender, age, muscle, weight, height, proportions, African) -> body shape
  -> joints from the base mesh's joint cubes -> armature (UE-style game_engine bone names)
  -> body mesh with skin weights -> garments cut from the body itself (so they skin exactly)
  -> hair from the hair helper cap -> eyes -> expression shape keys -> decimation -> GLB.

Units: Blender metres, Z up, the character faces -Y (glTF export turns that into Y up, facing +Z).
"""
from __future__ import annotations

import gzip
import json
import math
import os
from dataclasses import dataclass, field

import numpy as np

DATA = os.environ.get('MPFB_DATA', '/home/claude/assets-src/mpfb2/src/mpfb/data')
BODY_N = 13380  # the body is the first 13380 vertices of base.obj; the helpers follow

# ---------------------------------------------------------------------------------------- data

_base: dict | None = None


def base() -> dict:
    """base.obj: vertices (MakeHuman units, Y up), uvs, faces (vertex ids, uv ids, group)."""
    global _base
    if _base is None:
        V, UV, F = [], [], []
        g = None
        with open(os.path.join(DATA, '3dobjs/base.obj')) as f:
            for line in f:
                if line.startswith('v '):
                    V.append(line.split()[1:4])
                elif line.startswith('vt '):
                    UV.append(line.split()[1:3])
                elif line.startswith('g '):
                    g = line.split()[1]
                elif line.startswith('f '):
                    vs, ts = [], []
                    for tok in line.split()[1:]:
                        p = tok.split('/')
                        vs.append(int(p[0]) - 1)
                        ts.append(int(p[1]) - 1)
                    F.append((vs, ts, g))
        groups: dict[str, list[int]] = {}
        for i, (_, _, g) in enumerate(F):
            groups.setdefault(g, []).append(i)
        _base = dict(v=np.array(V, float), uv=np.array(UV, float), faces=F, groups=groups)
    return _base


def group_verts(name: str) -> np.ndarray:
    b = base()
    ids: set[int] = set()
    for fi in b['groups'][name]:
        ids.update(b['faces'][fi][0])
    return np.array(sorted(ids))


_tcache: dict[str, tuple[np.ndarray, np.ndarray] | None] = {}


def target(name: str):
    if name in _tcache:
        return _tcache[name]
    p = os.path.join(DATA, 'targets', name + '.target.gz')
    if not os.path.exists(p):
        _tcache[name] = None
        return None
    idx, off = [], []
    with gzip.open(p, 'rt') as f:
        for line in f:
            s = line.split()
            if len(s) < 4 or line.startswith('#'):
                continue
            idx.append(int(s[0]))
            off.append([float(s[1]), float(s[2]), float(s[3])])
    r = (np.array(idx, int), np.array(off, float).reshape(-1, 3))
    _tcache[name] = r
    return r


_macro = None


def macro_cfg():
    global _macro
    if _macro is None:
        _macro = json.load(open(os.path.join(DATA, 'targets/macrodetails/macro.json')))['macrotargets']
    return _macro


def _components(name: str, value: float):
    out = []
    for p in macro_cfg()[name]['parts']:
        if p['lowest'] < value < p['highest']:
            pos = (value - p['lowest']) / (p['highest'] - p['lowest'])
            if p['low']:
                out.append((p['low'], 1 - pos))
            if p['high']:
                out.append((p['high'], pos))
    return out


def age_value(years: float) -> float:
    """MakeHuman's age slider: 0 = 1 year, 0.1875 = 11, 0.5 = 25, 1 = 90."""
    if years <= 11:
        return 0.1875 * (years - 1) / 10
    if years <= 25:
        return 0.1875 + (years - 11) / 14 * 0.3125
    return 0.5 + (years - 25) / 65 * 0.5


@dataclass
class Macro:
    gender: float = 1.0      # 0 female, 1 male
    age: float = 25          # years
    muscle: float = 0.5
    weight: float = 0.5
    height: float = 0.5
    proportions: float = 0.6
    race: dict = field(default_factory=lambda: {'african': 1.0})


def macro_targets(m: Macro):
    c = {k: _components(k, v) for k, v in dict(gender=m.gender, age=age_value(m.age), muscle=m.muscle, weight=m.weight,
                                                    height=m.height, proportions=m.proportions).items()}
    t = []
    for race, rw in m.race.items():
        for a, aw in c['age']:
            for g, gw in c['gender']:
                t.append((f'macrodetails/{race}-{g}-{a}', rw * gw * aw))
    for g, gw in c['gender']:
        for a, aw in c['age']:
            for mu, mw in c['muscle']:
                for w, ww in c['weight']:
                    k = gw * aw * mw * ww
                    t.append((f'macrodetails/universal-{g}-{a}-{mu}-{w}', k))
                    for h, hw in c['height']:
                        t.append((f'macrodetails/height/{g}-{a}-{mu}-{w}-{h}', k * hw))
                    for p, pw in c['proportions']:
                        t.append((f'macrodetails/proportions/{g}-{a}-{mu}-{w}-{p}', k * pw))
    return [(n, w) for n, w in t if w > 0.005]


def shape(m: Macro, extra=()) -> np.ndarray:
    """All 19158 base vertices after the macro and extra targets, in Blender metres (Z up, ground at 0)."""
    v = base()['v'].copy()
    for name, w in list(macro_targets(m)) + list(extra):
        t = target(name)
        if t is None:
            print('  missing target', name)
            continue
        v[t[0]] += t[1] * w
    vb = to_blender(v)
    vb[:, 2] -= vb[:BODY_N, 2].min()
    return vb


def to_blender(v: np.ndarray) -> np.ndarray:
    return np.stack([v[:, 0], -v[:, 2], v[:, 1]], 1) * 0.1


def delta(name: str, w: float = 1.0) -> tuple[np.ndarray, np.ndarray] | None:
    """A target's offsets in Blender metres."""
    t = target(name)
    if t is None:
        print('  missing target', name)
        return None
    return t[0], to_blender(t[1]) * w


# ---------------------------------------------------------------------------------------- rig

def rig_data(name='game_engine'):
    rig = json.load(open(os.path.join(DATA, f'rigs/standard/rig.{name}.json')))
    weights = json.load(open(os.path.join(DATA, f'rigs/standard/weights.{name}.json')))['weights']
    return rig, weights


def joint_point(vb: np.ndarray, spec: dict) -> np.ndarray:
    s = spec['strategy']
    if s == 'CUBE':
        return vb[group_verts(spec['cube_name'])].mean(0)
    if s == 'MEAN':
        return vb[spec['vertex_indices']].mean(0)
    if s == 'VERTEX':
        return vb[spec['vertex_index']]
    return np.array(spec['default_position'])


def bones(vb: np.ndarray, rig: dict) -> dict[str, tuple[np.ndarray, np.ndarray, float, str]]:
    out = {}
    for bn, bd in rig.items():
        h = joint_point(vb, bd['head'])
        t = joint_point(vb, bd['tail'])
        if np.linalg.norm(t - h) < 1e-4:
            t = h + np.array([0, 0, 0.02])
        out[bn] = (h, t, bd.get('roll', 0.0), bd.get('parent', ''))
    return out


def weight_table(weights: dict, n: int) -> list[dict[str, float]]:
    W: list[dict[str, float]] = [dict() for _ in range(n)]
    for bn, lst in weights.items():
        for vi, w in lst:
            if vi < n and w > 1e-4:
                W[vi][bn] = W[vi].get(bn, 0) + w
    return W


def dominant(W: list[dict[str, float]], ids) -> list[str]:
    return [max(W[i].items(), key=lambda kv: kv[1])[0] if W[i] else '' for i in ids]


def along(p: np.ndarray, bone) -> float:
    h, t = bone[0], bone[1]
    d = t - h
    L2 = float(d @ d) or 1e-9
    return float((p - h) @ d / L2)


# ---------------------------------------------------------------------------------------- geometry helpers

def tris_of(faces: list[list[int]]) -> np.ndarray:
    T = []
    for f in faces:
        for i in range(1, len(f) - 1):
            T.append((f[0], f[i], f[i + 1]))
    return np.array(T, int)


def vertex_normals(V: np.ndarray, faces: list[list[int]]) -> np.ndarray:
    T = tris_of(faces)
    fn = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]])
    N = np.zeros_like(V)
    for k in range(3):
        np.add.at(N, T[:, k], fn)
    n = np.linalg.norm(N, axis=1, keepdims=True)
    n[n == 0] = 1
    return N / n


def edges_of(faces: list[list[int]]) -> np.ndarray:
    E = set()
    for f in faces:
        for i in range(len(f)):
            a, b = f[i], f[(i + 1) % len(f)]
            E.add((min(a, b), max(a, b)))
    return np.array(sorted(E), int)


def boundary_verts(faces: list[list[int]]) -> set[int]:
    cnt: dict[tuple[int, int], int] = {}
    for f in faces:
        for i in range(len(f)):
            a, b = f[i], f[(i + 1) % len(f)]
            k = (min(a, b), max(a, b))
            cnt[k] = cnt.get(k, 0) + 1
    out: set[int] = set()
    for (a, b), c in cnt.items():
        if c == 1:
            out.update((a, b))
    return out


def smooth(V: np.ndarray, faces: list[list[int]], iters: int, factor=0.5, pin: np.ndarray | None = None, taubin=False) -> np.ndarray:
    E = edges_of(faces)
    V = V.copy()
    for it in range(iters * (2 if taubin else 1)):
        f = (factor if it % 2 == 0 else -factor * 1.06) if taubin else factor
        S = np.zeros_like(V)
        C = np.zeros(len(V))
        np.add.at(S, E[:, 0], V[E[:, 1]])
        np.add.at(S, E[:, 1], V[E[:, 0]])
        np.add.at(C, E[:, 0], 1)
        np.add.at(C, E[:, 1], 1)
        C[C == 0] = 1
        L = S / C[:, None] - V
        if pin is not None:
            L[pin] = 0
        V = V + f * L
    return V


def ring_distance(n: int, faces: list[list[int]], seeds: set[int], maxd=6) -> np.ndarray:
    """Graph distance (in edges) from the seed vertices, capped."""
    E = edges_of(faces)
    adj: list[list[int]] = [[] for _ in range(n)]
    for a, b in E:
        adj[a].append(b)
        adj[b].append(a)
    d = np.full(n, maxd, int)
    front = list(seeds)
    for s in front:
        d[s] = 0
    k = 0
    while front and k < maxd:
        k += 1
        nxt = []
        for v in front:
            for u in adj[v]:
                if d[u] > k:
                    d[u] = k
                    nxt.append(u)
        front = nxt
    return d


# ---------------------------------------------------------------------------------------- a mesh piece

@dataclass
class Piece:
    """A mesh in Blender space with per-vertex skin weights and per-loop uvs, ready to become an object."""
    name: str
    V: np.ndarray
    F: list[list[int]]
    UV: list[list[tuple[float, float]]]
    W: list[dict[str, float]]
    material: str
    src: np.ndarray | None = None        # body vertex each vertex comes from (for shape keys)
    colors: np.ndarray | None = None     # optional per-vertex RGBA
    uv2: list[list[tuple[float, float]]] | None = None


def piece_from_base(name: str, vb: np.ndarray, face_ids: list[int], W: list[dict[str, float]], material: str) -> Piece:
    b = base()
    used = sorted({vi for fi in face_ids for vi in b['faces'][fi][0]})
    remap = {v: i for i, v in enumerate(used)}
    F = [[remap[vi] for vi in b['faces'][fi][0]] for fi in face_ids]
    UV = [[tuple(b['uv'][ti]) for ti in b['faces'][fi][1]] for fi in face_ids]
    return Piece(name, vb[used].copy(), F, UV, [dict(W[v]) for v in used], material, src=np.array(used))


def subdivide(V: np.ndarray, F: list[list[int]], levels=1) -> tuple[np.ndarray, list[list[int]]]:
    """Midpoint subdivision: every n-gon becomes n quads (edge midpoints + centre). Smooth afterwards."""
    for _ in range(levels):
        Vl = [v for v in V]
        emid: dict[tuple[int, int], int] = {}

        def mid(a, b):
            k = (min(a, b), max(a, b))
            if k not in emid:
                Vl.append((V[a] + V[b]) / 2)
                emid[k] = len(Vl) - 1
            return emid[k]
        nf = []
        for f in F:
            c = len(Vl)
            Vl.append(V[f].mean(0))
            n = len(f)
            for i in range(n):
                a, b, p = f[i], f[(i + 1) % n], f[i - 1]
                nf.append([a, mid(a, b), c, mid(p, a)])
        V = np.array(Vl)
        F = nf
    return V, F


def smooth_boundary(V: np.ndarray, F: list[list[int]], iters=6, factor=0.5) -> np.ndarray:
    """Smooth the open edges of a mesh along themselves (stair-stepped cut lines become curves)."""
    cnt: dict[tuple[int, int], int] = {}
    for f in F:
        for i in range(len(f)):
            a, b = f[i], f[(i + 1) % len(f)]
            k = (min(a, b), max(a, b))
            cnt[k] = cnt.get(k, 0) + 1
    nb: dict[int, list[int]] = {}
    for (a, b), c in cnt.items():
        if c == 1:
            nb.setdefault(a, []).append(b)
            nb.setdefault(b, []).append(a)
    ids = np.array([v for v, n in nb.items() if len(n) == 2], int)
    if not len(ids):
        return V
    n0 = np.array([nb[v][0] for v in ids])
    n1 = np.array([nb[v][1] for v in ids])
    V = V.copy()
    for _ in range(iters):
        V[ids] = V[ids] + factor * ((V[n0] + V[n1]) / 2 - V[ids])
    return V
