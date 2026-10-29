"""
Skin detail maps in the MakeHuman uv atlas, painted from CC0 masks and from the mesh itself:
  detail A (RGB): R scalp (hair colour under the hair), G lips, B eyebrows
  detail B (RGB): R palms and soles, G nails, B eyelids
The game multiplies them with each character's own skin tone, so one map serves every skin.
"""
from __future__ import annotations

import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import mh

TEX = os.path.join(mh.DATA, 'textures')


def _mask(name: str, size: int) -> np.ndarray:
    im = Image.open(os.path.join(TEX, name)).convert('L').resize((size, size), Image.LANCZOS)
    return np.asarray(im, np.float32) / 255


def _vertex_uv() -> np.ndarray:
    """One uv per body vertex (the first loop that uses it)."""
    b = mh.base()
    uv = np.zeros((mh.BODY_N, 2))
    seen = np.zeros(mh.BODY_N, bool)
    for fi in b['groups']['body']:
        vs, ts, _ = b['faces'][fi]
        for v, t in zip(vs, ts):
            if not seen[v]:
                uv[v] = b['uv'][t]
                seen[v] = True
    return uv


def sample(mask: np.ndarray, uv: np.ndarray) -> np.ndarray:
    s = mask.shape[0]
    x = np.clip((uv[:, 0] * s).astype(int), 0, s - 1)
    y = np.clip(((1 - uv[:, 1]) * s).astype(int), 0, s - 1)
    return mask[y, x]


def raster(values: np.ndarray, size: int, blur=1.5) -> np.ndarray:
    """Paint per-vertex values (body vertices) into the uv atlas, face by face."""
    b = mh.base()
    im = Image.new('L', (size, size), 0)
    dr = ImageDraw.Draw(im)
    for fi in b['groups']['body']:
        vs, ts, _ = b['faces'][fi]
        val = float(np.mean(values[vs]))
        if val <= 0.01:
            continue
        pts = [(b['uv'][t][0] * size, (1 - b['uv'][t][1]) * size) for t in ts]
        dr.polygon(pts, fill=int(min(1, val) * 255))
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im, np.float32) / 255


def brows(vb: np.ndarray) -> np.ndarray:
    """Eyebrows drawn from the eyes' positions: an arch above each eye from the inner corner to a thin
    tail past the outer one, about 4 mm thick (scaled with the distance between the eyes)."""
    V = vb[:mh.BODY_N]
    eyes = {s: vb[mh.group_verts(f'joint-{s}-eye')].mean(0) for s in ('l', 'r')}
    k = float(np.linalg.norm(eyes['l'] - eyes['r'])) / 0.062
    out = np.zeros(mh.BODY_N)
    for s, c in eyes.items():
        sign = 1.0 if s == 'l' else -1.0        # +x is the character's left
        rel = V - c
        u = rel[:, 0] * sign                    # outwards from the nose
        front = rel[:, 1] < 0.006 * k           # the face side of the eye (-y is forwards)
        t = (u + 0.011 * k) / (0.034 * k)       # 0 at the inner end, 1 at the tail
        h0 = (0.0155 + 0.0045 * np.sin(np.pi * np.clip(t, 0, 1)) - 0.0035 * np.clip(t, 0, 1)) * k
        thick = 0.0065 * k * (1 - 0.55 * np.clip(t, 0, 1))
        dz = rel[:, 2] - h0
        ends = np.clip(t / 0.12, 0, 1) * np.clip((1 - t) / 0.25, 0, 1)
        val = np.clip(1.25 - np.abs(dz) / np.maximum(thick, 1e-4), 0, 1) ** 0.5 * ends
        val[~front | (t < 0) | (t > 1)] = 0
        out = np.maximum(out, val)
    return out


def palms_soles(vb: np.ndarray, B: dict, W, nails_v: np.ndarray) -> np.ndarray:
    V = vb[:mh.BODY_N]
    b = mh.base()
    N = mh.vertex_normals(V, [b['faces'][i][0] for i in b['groups']['body']])
    dom = np.array(mh.dominant(W, range(mh.BODY_N)))
    out = np.zeros(mh.BODY_N)
    for s in ('l', 'r'):
        hand = np.array([d.endswith('_' + s) and (d.startswith('hand') or d.split('_')[0] in ('index', 'middle', 'ring', 'pinky', 'thumb')) for d in dom])
        if not hand.any():
            continue
        a = B[f'middle_01_{s}'][0] - B[f'hand_{s}'][0]
        lat = B[f'index_01_{s}'][0] - B[f'pinky_01_{s}'][0]
        n = np.cross(a, lat)
        n /= np.linalg.norm(n)
        nail_n = N[hand & (nails_v > 0.5)].mean(0) if (hand & (nails_v > 0.5)).any() else -n
        if nail_n @ n > 0:
            n = -n
        d = N[hand] @ n
        out[hand] = np.clip((d - 0.1) / 0.5, 0, 1)
        foot = np.isin(dom, [f'foot_{s}', f'ball_{s}'])
        out[foot] = np.maximum(out[foot], np.clip((-N[foot, 2] - 0.45) / 0.35, 0, 1))
    return out


def detail_maps(vb: np.ndarray, B: dict, W, size=1024, scalp: np.ndarray | None = None) -> tuple[Image.Image, Image.Image]:
    uv = _vertex_uv()
    lips = _mask('mpfb_lips.jpg', size)
    nails = np.maximum(_mask('mpfb_fingernails.jpg', size), _mask('mpfb_toenails.jpg', size))
    lids = _mask('mpfb_eyelids.jpg', size)
    brow = raster(brows(vb), size, blur=1.2)
    nails_v = sample(nails, uv)
    pal = raster(palms_soles(vb, B, W, nails_v), size, blur=3)
    sc = raster(scalp, size, blur=2.5) if scalp is not None else np.zeros((size, size), np.float32)
    A = np.stack([sc, lips, brow], 2)
    Bm = np.stack([pal, nails, lids], 2)
    to = lambda a: Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'RGB')
    return to(A), to(Bm)
