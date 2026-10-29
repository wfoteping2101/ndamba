"""
Build the Jeux humans: python3 tools/humans/build.py [archetype ...] [--preview]
Writes public/jeux/humans/<archetype>.glb (+ skin detail maps) and a preview render in the scratch dir.
Requires: pip install bpy (Blender 5.2 as a Python module), numpy, Pillow; MPFB_DATA = MPFB2's data folder.
"""
from __future__ import annotations

import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import blend  # noqa: E402  (imports bpy)
import garments as G  # noqa: E402
import hair as H  # noqa: E402
import mh  # noqa: E402
import skin  # noqa: E402
from mh import Macro, Piece  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), '../../public/jeux/humans')
PREVIEW = os.environ.get('PREVIEW_DIR', '/tmp/humans-preview')

# Each archetype: body sliders and its wardrobe (every garment is exported; the game shows the ones a look needs)
ARCHETYPES: dict[str, dict] = {
    'boy': dict(macro=Macro(gender=1.0, age=10.5, muscle=0.5, weight=0.42, height=0.55), kid=True,
                wardrobe=['shirt', 'shorts', 'socks', 'boots', 'trainers', 'gloves'], hair=['crop', 'afro', 'twists', 'puff', 'cap']),
    'boyLean': dict(macro=Macro(gender=1.0, age=12, muscle=0.45, weight=0.25, height=0.7), kid=True,
                    wardrobe=['shirt', 'shorts', 'socks', 'boots', 'trainers', 'gloves'], hair=['crop', 'afro', 'twists', 'puff', 'cap']),
    'boyBig': dict(macro=Macro(gender=1.0, age=13, muscle=0.75, weight=0.72, height=0.8), kid=True,
                   wardrobe=['shirt', 'shorts', 'socks', 'boots', 'trainers', 'gloves'], hair=['crop', 'afro', 'twists', 'puff', 'cap']),
    'girl': dict(macro=Macro(gender=0.0, age=10.5, muscle=0.5, weight=0.42, height=0.6), kid=True,
                 wardrobe=['shirt', 'shorts', 'socks', 'boots', 'trainers', 'gloves'], hair=['crop', 'afro', 'twists', 'puff', 'cap']),
    'man': dict(macro=Macro(gender=1.0, age=30, muscle=0.62, weight=0.48, height=0.55), kid=False,
                wardrobe=['shirt', 'shorts', 'socks', 'boots', 'trainers', 'gloves', 'longsleeves', 'trousers', 'shoes', 'beard', 'glasses', 'cane'], hair=['crop', 'afro', 'twists', 'puff', 'cap']),
    'oldman': dict(macro=Macro(gender=1.0, age=64, muscle=0.4, weight=0.45, height=0.45), kid=False,
                   wardrobe=['shirt', 'shorts', 'socks', 'trainers', 'longsleeves', 'trousers', 'shoes', 'beard', 'glasses', 'cane'], hair=['crop', 'cap']),
    'woman': dict(macro=Macro(gender=0.0, age=34, muscle=0.45, weight=0.55, height=0.45), kid=False,
                  wardrobe=['dress', 'shirt', 'trousers', 'shoes', 'earrings'], hair=['crop', 'puff', 'afro', 'wrap', 'hat']),
    'womanBig': dict(macro=Macro(gender=0.0, age=40, muscle=0.45, weight=0.85, height=0.45), kid=False,
                     wardrobe=['dress', 'shirt', 'trousers', 'shoes', 'earrings'], hair=['crop', 'puff', 'afro', 'wrap', 'hat']),
    'oldwoman': dict(macro=Macro(gender=0.0, age=70, muscle=0.35, weight=0.55, height=0.35), kid=False,
                     wardrobe=['dress', 'shirt', 'shoes', 'earrings', 'cane'], hair=['crop', 'puff', 'wrap', 'hat']),
}


def split_piece(p: Piece, faces: list[int], name: str) -> Piece:
    used = sorted({v for k in faces for v in p.F[k]})
    remap = {v: i for i, v in enumerate(used)}
    return Piece(name, p.V[used], [[remap[v] for v in p.F[k]] for k in faces], [p.UV[k] for k in faces], [p.W[v] for v in used], p.material,
                 src=p.src[used], colors=None if p.colors is None else p.colors[used])


EARS = np.zeros(0)
LIPS = np.zeros(0)


def kit(body: G.Body, name: str, kid: bool) -> list[Piece]:
    if name == 'shirt':
        return [G.shirt(body, sleeve=0.55 if kid else 0.5, hem=-0.06 if kid else -0.02, loose=0.011 if kid else 0.012)]
    if name == 'longsleeves':
        return [G.shirt(body, sleeve=0.93, long_sleeves=True, hem=-0.02, loose=0.013, name='longsleeves')]
    if name == 'shorts':
        return [G.shorts(body, length=0.5 if kid else 0.42, loose=0.012)]
    if name == 'trousers':
        return [G.shorts(body, trousers=True, loose=0.011, name='trousers')]
    if name == 'socks':
        return [G.socks(body, 'l'), G.socks(body, 'r')]
    if name == 'boots':
        return [G.shoe(body, 'l', kind='boot', name='boot_l'), G.shoe(body, 'r', kind='boot', name='boot_r')]
    if name == 'trainers':
        return [G.shoe(body, 'l', kind='trainer', name='trainer_l'), G.shoe(body, 'r', kind='trainer', name='trainer_r')]
    if name == 'shoes':
        return [G.shoe(body, 'l', kind='trainer', ankle=0.95, name='shoe_l'), G.shoe(body, 'r', kind='trainer', ankle=0.95, name='shoe_r')]
    if name == 'dress':
        return [G.shirt(body, sleeve=0.62, hem=0.12, loose=0.017, name='dress_top'), G.skirt(body)]
    if name == 'beard':
        return [G.beard(body, EARS, LIPS)]
    if name == 'glasses':
        return [G.glasses(body)]
    if name == 'cane':
        return [G.cane(body, 'r')]
    if name == 'earrings':
        return [G.earrings(body, EARS)]
    if name == 'gloves':
        out = []
        for s in ('l', 'r'):
            fingers = {f'{f}_0{k}_{s}' for f in ('index', 'middle', 'ring', 'pinky', 'thumb') for k in (1, 2, 3)}
            sel = body.mask({f'hand_{s}'} | fingers) | (body.mask({f'lowerarm_{s}'}) & (body.t > 0.86))
            p = body.cut(f'glove_{s}', sel, 'gloves')
            p.V = p.V + mh.vertex_normals(p.V, p.F) * 0.006
            p.UV = [[(0.5, 0.5)] * len(f) for f in p.F]
            out.append(p)
        return out
    raise KeyError(name)


def eye_pieces(vb, W) -> list[Piece]:
    out = []
    for s in ('l', 'r'):
        p = mh.piece_from_base(f'eye_{s}', vb, mh.base()['groups'][f'helper-{s}-eye'], W, 'eye')
        c = p.V.mean(0)
        r = np.linalg.norm(p.V - c, axis=1).mean()
        V, F = mh.subdivide(p.V, p.F, 2)
        V = c + (V - c) / np.linalg.norm(V - c, axis=1)[:, None] * r
        fwd = np.array([0.0, -1.0, 0.0])
        cosang = ((V - c) / r) @ fwd
        ang = np.arccos(np.clip(cosang, -1, 1))
        iris = np.clip((0.58 - ang) / 0.05, 0, 1)
        pupil = np.clip((0.26 - ang) / 0.04, 0, 1)
        limbal = np.clip(1 - abs(ang - 0.58) / 0.07, 0, 1)
        col = np.stack([iris, pupil, limbal, np.ones(len(V))], 1)
        out.append(Piece(f'eye_{s}', V, F, [[(0.5, 0.5)] * len(f) for f in F], H.head_only(len(V)), 'eye', colors=col))
    return out


def hair_pieces(body: G.Body, styles: list[str]) -> list[Piece]:
    vb = body.vb
    ears = skin.sample(skin._mask('mpfb_ears.jpg', 512), skin._vertex_uv())
    cap = H.scalp_piece(body, ears)
    c = H.skull_center(vb)
    V, F = mh.subdivide(cap.V, cap.F, 1)
    V = mh.smooth(V, F, 2, 0.35, pin=np.array(sorted(mh.boundary_verts(F)), int))
    # top-down projection uv (cornrow lines follow u)
    u = (V[:, 0] - V[:, 0].min()) / np.ptp(V[:, 0])
    v = (V[:, 1] - V[:, 1].min()) / np.ptp(V[:, 1])
    uvv = np.stack([u, v], 1)
    loops = lambda F: [[tuple(uvv[k]) for k in f] for f in F]
    out = []
    d = mh.ring_distance(len(V), F, mh.boundary_verts(F), 4)
    fade = np.stack([np.clip(d / 2.5, 0, 1)] * 3 + [np.ones(len(V))], 1)
    crop = H.shape_cap(V, F, 'crop', c, seed=1)
    out.append(Piece('hair_crop', crop, F, loops(F), H.head_only(len(V)), 'hair', colors=fade))
    if 'afro' in styles:
        out.append(Piece('hair_afro', H.shape_cap(V, F, 'afro', c, seed=2), F, loops(F), H.head_only(len(V)), 'hair', colors=fade))
    if 'twists' in styles:
        out.append(H.twists(crop, F, c))
    if 'puff' in styles:
        top = crop[np.argmax(crop[:, 2])]
        out.append(H.puff_ball(top + np.array([0, 0.045, 0.02]), 0.052))
    if 'wrap' in styles:
        shell = H.shape_cap(V, F, 'wrap', c, thickness=0.02)
        out.append(Piece('hair_wrap', shell, F, loops(F), H.head_only(len(V)), 'wrap', colors=fade))
        out.append(H.wrap_knot(shell, c))
    if 'hat' in styles:
        out += H.hat(V, F, c)
    if 'cap' in styles:
        shell = H.shape_cap(V, F, 'wrap', c, thickness=0.012)
        out.append(Piece('cap_crown', shell, F, loops(F), H.head_only(len(V)), 'cap', colors=fade))
        out.append(H.cap_brim(shell, c))
    return out


EXPRESSIONS = {
    # name: [(expression unit, weight)]
    'blink': [('eye-left-closure', 1.0), ('eye-right-closure', 1.0)],
    'smile': [('mouth-corner-puller', 0.85), ('mouth-elevation', 0.15)],
    'open': [('mouth-open', 0.55)],
    'sad': [('mouth-depression', 0.6), ('eyebrows-left-inner-up', 0.7), ('eyebrows-right-inner-up', 0.7)],
    'frown': [('eyebrows-left-down', 0.8), ('eyebrows-right-down', 0.8), ('mouth-compression', 0.4)],
    'surprise': [('eyebrows-left-up', 0.9), ('eyebrows-right-up', 0.9), ('eye-left-opened-up', 0.6), ('eye-right-opened-up', 0.6)],
}


def expression_keys(src_ids: np.ndarray, base_V: np.ndarray) -> dict[str, np.ndarray]:
    keys = {}
    for name, units in EXPRESSIONS.items():
        V = base_V.copy()
        for unit, w in units:
            d = mh.delta(f'expression/units/african/{unit}', w)
            if d is None:
                continue
            idx, off = d
            pos = {int(v): i for i, v in enumerate(src_ids)}
            for k, vi in enumerate(idx):
                j = pos.get(int(vi))
                if j is not None:
                    V[j] += off[k]
        keys[name] = V
    return keys


def build(name: str, preview=False, export=True):
    t0 = time.time()
    spec = ARCHETYPES[name]
    blend.reset()
    vb = mh.shape(spec['macro'])
    rig, weights = mh.rig_data()
    B = mh.bones(vb, rig)
    W = mh.weight_table(weights, len(vb))
    body = G.Body(vb, B, W)
    global EARS, LIPS
    EARS = skin.sample(skin._mask('mpfb_ears.jpg', 512), skin._vertex_uv())
    LIPS = skin.sample(skin._mask('mpfb_lips.jpg', 512), skin._vertex_uv())
    clothes: list[Piece] = []
    for g in spec['wardrobe']:
        clothes += kit(body, g, spec['kid'])
    # the body hidden under the clothes every look wears (shirt, shorts/trousers top, shoes); the
    # rest (socks, gloves, long sleeves) only covers it
    body.hidden[:] = False
    for g in ('shirt', 'shorts'):
        kit(body, g, spec['kid'])
    for g in [w for w in spec['wardrobe'] if w in ('boots',)]:
        kit(body, g, spec['kid'])
    hidden_core = body.hidden.copy()
    body_piece = mh.piece_from_base('body', vb, mh.base()['groups']['body'], W, 'skin')
    body.hidden = hidden_core
    body_piece = G.hide_body(body, body_piece)
    # the feet are their own piece: shown bare (sandals), hidden inside shoes
    # limbs are pieces of their own too: hidden under trousers, dresses and long sleeves
    regions = [('feet', {'foot_l', 'foot_r', 'ball_l', 'ball_r'}), ('calves', {'calf_l', 'calf_r'}), ('thighs', {'thigh_l', 'thigh_r'}), ('forearms', {'lowerarm_l', 'lowerarm_r'})]
    limb_pieces = []
    for rname, bones in regions:
        m = body.mask(bones)
        inside = [all(m[body_piece.src[v]] for v in f) for f in body_piece.F]
        limb_pieces.append(split_piece(body_piece, [k for k, x in enumerate(inside) if x], rname))
        body_piece = split_piece(body_piece, [k for k, x in enumerate(inside) if not x], 'body')
    feet_piece = limb_pieces[0]
    teeth = [mh.piece_from_base(n, vb, mh.base()['groups'][f'helper-{n}'], W, 'teeth') for n in ('upper-teeth', 'lower-teeth')]
    tongue = mh.piece_from_base('tongue', vb, mh.base()['groups']['helper-tongue'], W, 'mouth')
    for p in teeth + [tongue]:
        p.W = H.head_only(len(p.V))
    pieces = [body_piece] + limb_pieces + eye_pieces(vb, W) + teeth + [tongue] + hair_pieces(body, spec['hair']) + clothes
    print(f'[{name}] pieces {time.time() - t0:.1f}s', {p.name: len(p.F) for p in pieces})

    arm = blend.armature('rig', B)
    objs = {}
    colors = {'skin': (0.13, 0.065, 0.04, 1), 'hair': (0.02, 0.015, 0.012, 1), 'eye': (0.9, 0.88, 0.85, 1), 'shirt': (0.75, 0.55, 0.05, 1),
              'shorts': (0.1, 0.35, 0.15, 1), 'sockL': (0.75, 0.55, 0.05, 1), 'sockR': (0.6, 0.06, 0.04, 1), 'cap': (0.3, 0.3, 0.28, 1)}
    for p in pieces:
        objs[p.name] = blend.mesh_object(p, arm, colors.get(p.material, (0.6, 0.6, 0.6, 1)))
    # decimate (keep the face as is: the expressions move it)
    head = np.array([max(w.items(), key=lambda kv: kv[1])[0] in ('head',) if w else False for w in body_piece.W])
    # the seams with the limb pieces stay where they are (no cracks)
    for v in mh.boundary_verts(body_piece.F):
        head[v] = True
    blend.decimate(objs['body'], 0.5, protect=head)
    # garments are not decimated: collapsing edges would tear their hems
    # expressions on the decimated body: the face kept its vertices, find them by position
    bo = objs['body']
    Vd = blend.coords(bo)
    lut = {tuple(np.round(v, 6)): i for i, v in enumerate(body_piece.V)}
    src = np.array([body_piece.src[lut[tuple(np.round(v, 6))]] if tuple(np.round(v, 6)) in lut else -1 for v in Vd])
    keys = expression_keys(src, Vd)
    blend.add_shape_keys(bo, keys)
    for n in ('upper-teeth', 'lower-teeth', 'tongue'):
        o = objs[n]
        pc = next(p for p in pieces if p.name == n)
        blend.add_shape_keys(o, expression_keys(pc.src, blend.coords(o)))
    for n in ('eye_l', 'eye_r'):
        pass
    tris = sum(sum(len(pl.vertices) - 2 for pl in o.data.polygons) for o in objs.values())
    print(f'[{name}] decimated, {tris} triangles in all, {time.time() - t0:.1f}s')
    if not export:
        return arm, objs

    os.makedirs(OUT, exist_ok=True)
    ears = skin.sample(skin._mask('mpfb_ears.jpg', 512), skin._vertex_uv())
    A, Bm = skin.detail_maps(vb, B, W, 1024, scalp=H.scalp_mask(body, ears).astype(float))
    A.save(os.path.join(OUT, f'{name}_skinA.png'))
    Bm.save(os.path.join(OUT, f'{name}_skinB.png'))
    meta = {
        'name': name, 'height': float(vb[:mh.BODY_N, 2].max()), 'kid': spec['kid'],
        'eyes': {s: (vb[mh.group_verts(f'joint-{s}-eye')].mean(0)).tolist() for s in ('l', 'r')},
        'kitAtlas': {'torso': G.TORSO_RECT, 'sleeveL': G.SLEEVE_L_RECT, 'sleeveR': G.SLEEVE_R_RECT},
        'pieces': sorted(objs.keys()), 'expressions': list(EXPRESSIONS),
    }
    json.dump(meta, open(os.path.join(OUT, f'{name}.json'), 'w'), indent=1)
    blend.export_glb(os.path.join(OUT, f'{name}.glb'), [arm] + list(objs.values()))
    print(f'[{name}] exported {os.path.getsize(os.path.join(OUT, name + ".glb")) / 1e6:.2f} MB, {time.time() - t0:.1f}s')
    if preview:
        os.makedirs(PREVIEW, exist_ok=True)
        hide = [n for n in objs if n.startswith(('hair_afro', 'hair_twists', 'hair_puff', 'cap_', 'trainer', 'shoe', 'glove', 'longsleeves', 'trousers'))]
        for n in hide:
            objs[n].hide_render = True
        h = meta['height']
        blend.preview(os.path.join(PREVIEW, f'{name}.png'), cam_loc=(0.9, -2.2 * h / 1.4, h * 0.62), look=(0, 0, h * 0.55), lens=50)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    for a in args or list(ARCHETYPES):
        build(a, preview='--preview' in sys.argv)
