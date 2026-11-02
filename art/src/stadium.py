"""Stadium art for NDAMBA: ground textures, goals, props, crowd, ball, particles.

Everything is generated from editable parameters (this file + palettes) with seeded
noise so the output is stable. Run:  python3 stadium.py --out ../../game/assets
"""
from __future__ import annotations

import json
import math
import os
import random

from PIL import Image, ImageDraw

from pixel import Canvas, Material, hex2rgb, value_noise, quantize, OUTLINE
import rig

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))

PPM = 8.0  # pixels per metre (5v5 scale)

# Laterite ramps: dry red earth, with lighter dust and darker damp patches.
TERRE = [hex2rgb(h) for h in ("#8E3F2C", "#9D4A31", "#AB5536", "#B7613C", "#C26E44", "#CC7A4C")]
TERRE_WET = [hex2rgb(h) for h in ("#5E2A1E", "#6E3324", "#7C3B2A", "#8A4530", "#944D36", "#9E5740")]
GRASS = [hex2rgb(h) for h in ("#4F7A2E", "#5C8A35", "#6B9A3C", "#7AA743", "#8AB34D")]
GRASS_WORN = [hex2rgb(h) for h in ("#7E7A3C", "#8C8744", "#9A944C", "#A69F55", "#B2AA5E")]
SAND = [hex2rgb(h) for h in ("#C9A66B", "#D5B47A", "#DFC088", "#E8CC96", "#F0D7A6")]
CHALK = (236, 224, 200)
CHALK_DRY = CHALK
CHALK_DIM = (214, 190, 160)
PAINT = (246, 244, 236)


def _paint_noise(img: Image.Image, box, ramp, cell: int, seed: int, contrast: float = 1.0, bias: float = 0.0):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    n = value_noise(w, h, cell, seed, octaves=4, persistence=0.55)
    px = img.load()
    for y in range(h):
        row = n[y]
        for x in range(w):
            v = (row[x] - 0.5) * contrast + 0.5 + bias
            px[x0 + x, y0 + y] = quantize(max(0.0, min(0.999, v)), ramp) + (255,)


def _blend_patch(img: Image.Image, cx, cy, rx, ry, ramp, seed, feather=0.35, cell=6):
    """Irregular patch (grass tuft, damp spot) blended with a noisy edge."""
    rnd = random.Random(seed)
    n = value_noise(int(rx * 2) + 2, int(ry * 2) + 2, cell, seed, octaves=3)
    px = img.load()
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if not (0 <= x < img.width and 0 <= y < img.height):
                continue
            dx = (x - cx) / rx
            dy = (y - cy) / ry
            d = dx * dx + dy * dy
            nx, ny = x - int(cx - rx), y - int(cy - ry)
            nv = n[min(ny, len(n) - 1)][min(nx, len(n[0]) - 1)]
            if d + (nv - 0.5) * feather < 1.0 and rnd.random() < 0.97:
                px[x, y] = quantize(nv, ramp) + (255,)


def chalk_line(draw: ImageDraw.ImageDraw, p0, p1, rnd: random.Random, wear: float = 0.35, width: int = 2):
    """A hand-painted chalk line: broken, slightly wobbly, dimmer where worn. Painted white when wear is 0."""
    CHALK = PAINT if wear <= 0.0 else CHALK_DRY
    x0, y0 = p0
    x1, y1 = p1
    length = math.hypot(x1 - x0, y1 - y0)
    steps = max(1, int(length))
    for s in range(steps + 1):
        t = s / steps
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t
        if rnd.random() < wear * 0.5:
            continue
        col = CHALK if rnd.random() > wear else CHALK_DIM
        wob = (rnd.choice((0, 0, 0, 1)) if width > 1 else 0) if wear > 0.0 else 0
        if abs(x1 - x0) >= abs(y1 - y0):
            draw.point((int(x), int(y) + wob), col)
            if width > 1:
                draw.point((int(x), int(y) + 1 + wob), col)
        else:
            draw.point((int(x) + wob, int(y)), col)
            if width > 1:
                draw.point((int(x) + 1 + wob, int(y)), col)


def chalk_arc(draw, cx, cy, r, a0, a1, rnd, wear=0.35, squash=0.64):
    CHALK = PAINT if wear <= 0.0 else CHALK_DRY
    steps = int(abs(a1 - a0) * r / 1.2) + 2
    for s in range(steps + 1):
        a = a0 + (a1 - a0) * s / steps
        if rnd.random() < wear * 0.5:
            continue
        col = CHALK if rnd.random() > wear else CHALK_DIM
        draw.point((int(cx + math.cos(a) * r), int(cy + math.sin(a) * r * squash)), col)
        draw.point((int(cx + math.cos(a) * r), int(cy + math.sin(a) * r * squash) + 1), col)


def ground_texture(surface: str, world_w: int, world_h: int, pitch, seed: int = 3, rules: str = "street5") -> Image.Image:
    """Ground for the whole world. `pitch` = (x, y, w, h) in pixels."""
    img = Image.new("RGBA", (world_w, world_h))
    rnd = random.Random(seed)
    px, py, pw, ph = pitch
    if surface == "terre":
        _paint_noise(img, (0, 0, world_w, world_h), TERRE, 16, seed, contrast=0.5)
        # the pitch itself is more trodden and a little lighter (dust)
        _paint_noise(img, (px - 6, py - 6, px + pw + 6, py + ph + 6), TERRE, 14, seed + 1, contrast=0.36, bias=0.10)
        # worn central corridor and goalmouths: darker, harder soil
        for (cx, cy, rx, ry, s) in ((px + pw / 2, py + ph / 2, pw * 0.42, ph * 0.22, 11),
                                    (px + 24, py + ph / 2, 30, 28, 12), (px + pw - 24, py + ph / 2, 30, 28, 13)):
            _blend_patch(img, cx, cy, rx, ry, TERRE[1:5], seed + s, feather=0.9, cell=8)
        # tufts of grass near the edges and corners
        for i in range(26):
            side = rnd.random()
            if side < 0.5:
                cx = rnd.uniform(px - 40, px + pw + 40)
                cy = rnd.choice((rnd.uniform(py - 40, py + 10), rnd.uniform(py + ph - 10, py + ph + 40)))
            else:
                cy = rnd.uniform(py - 30, py + ph + 30)
                cx = rnd.choice((rnd.uniform(px - 50, px + 8), rnd.uniform(px + pw - 8, px + pw + 50)))
            _blend_patch(img, cx, cy, rnd.uniform(4, 10), rnd.uniform(2, 5), GRASS_WORN, seed + 100 + i, feather=1.1)
        # small stones and pebbles outside the playing area
        d = ImageDraw.Draw(img)
        for i in range(120):
            x = rnd.randrange(0, world_w)
            y = rnd.randrange(0, world_h)
            if px - 4 <= x <= px + pw + 4 and py - 4 <= y <= py + ph + 4:
                continue
            c = rnd.choice(((214, 196, 176), (168, 140, 120), (120, 86, 70), (236, 220, 200)))
            d.point((x, y), c + (255,))
            if rnd.random() < 0.4:
                d.point((x + 1, y), (c[0] - 30, c[1] - 30, c[2] - 30, 255))
        # tyre tracks of the benskins along the south road edge
        for k in range(3):
            yy = world_h - 26 + k * 7
            for x in range(0, world_w, 2):
                if rnd.random() < 0.7:
                    d.point((x, yy + int(math.sin(x / 23.0) * 2)), TERRE_WET[2] + (255,))
    elif surface == "grass":
        _paint_noise(img, (0, 0, world_w, world_h), GRASS, 30, seed, contrast=0.4)
        # mowing stripes (vertical bands, like a mown stadium pitch), wider on the big pitch
        p = img.load()
        band_w = 48 if pw > 600 else 32
        for y in range(py, py + ph):
            for x in range(px, px + pw):
                band = ((x - px) // band_w) % 2
                r, g, b, a = p[x, y]
                p[x, y] = (min(255, r + (7 if band else -5)), min(255, g + (10 if band else -7)), b, a)
        # a few worn spots only in the goalmouths and the centre
        for (cx, cy, rx, ry, k) in ((px + 30, py + ph / 2, 26, 14, 1), (px + pw - 30, py + ph / 2, 26, 14, 2), (px + pw / 2, py + ph / 2, 16, 10, 3)):
            _blend_patch(img, cx, cy, rx, ry, GRASS_WORN, seed + 200 + k, feather=1.0, cell=8)
    elif surface == "sand":
        _paint_noise(img, (0, 0, world_w, world_h), SAND, 26, seed, contrast=0.5)
    elif surface == "mud":
        _paint_noise(img, (0, 0, world_w, world_h), TERRE_WET, 24, seed, contrast=0.7)
        for i in range(14):
            _blend_patch(img, rnd.uniform(px, px + pw), rnd.uniform(py, py + ph), rnd.uniform(8, 22), rnd.uniform(5, 12),
                         [hex2rgb(h) for h in ("#4A2A22", "#553129", "#5E382F")], seed + 300 + i, feather=0.7)
    draw_lines(img, pitch, rnd, rules, worn=(surface in ("terre", "mud", "sand")))
    return img


def draw_lines(img, pitch, rnd, rules="street5", worn=True):
    d = ImageDraw.Draw(img)
    px, py, pw, ph = pitch
    wear = 0.42 if worn else 0.0
    # touchlines and goal lines
    chalk_line(d, (px, py), (px + pw, py), rnd, wear)
    chalk_line(d, (px, py + ph), (px + pw, py + ph), rnd, wear)
    chalk_line(d, (px, py), (px, py + ph), rnd, wear)
    chalk_line(d, (px + pw, py), (px + pw, py + ph), rnd, wear)
    cx, cy = px + pw / 2, py + ph / 2
    chalk_line(d, (cx, py), (cx, py + ph), rnd, wear)
    chalk_arc(d, cx, cy, (9.15 if rules == "full" else 3.0) * PPM, 0, math.tau, rnd, wear)
    d.point((int(cx), int(cy)), CHALK)
    if rules == "full":
        # 11-a-side markings: penalty area 16.5 x 40.32 m, goal area 5.5 x 18.32 m, spot at 11 m,
        # penalty arc radius 9.15 m, corner arcs 1 m, centre circle 9.15 m
        for side in (0, 1):
            x = px if side == 0 else px + pw
            sgn = 1 if side == 0 else -1
            for (bw, bd) in ((40.32 * PPM, 16.5 * PPM), (18.32 * PPM, 5.5 * PPM)):
                chalk_line(d, (x, cy - bw / 2), (x + sgn * bd, cy - bw / 2), rnd, wear)
                chalk_line(d, (x + sgn * bd, cy - bw / 2), (x + sgn * bd, cy + bw / 2), rnd, wear)
                chalk_line(d, (x, cy + bw / 2), (x + sgn * bd, cy + bw / 2), rnd, wear)
            sx = x + sgn * 11.0 * PPM
            d.rectangle((int(sx) - 1, int(cy) - 1, int(sx) + 1, int(cy) + 1), fill=CHALK)
            # penalty arc: the part of the 9.15 m circle outside the box
            if side == 0:
                chalk_arc(d, sx, cy, 9.15 * PPM, -0.93, 0.93, rnd, wear)
            else:
                chalk_arc(d, sx, cy, 9.15 * PPM, math.pi - 0.93, math.pi + 0.93, rnd, wear)
        for (cx0, cy0, a0, a1) in ((px, py, 0, math.pi / 2), (px + pw, py, math.pi / 2, math.pi),
                                   (px + pw, py + ph, math.pi, 1.5 * math.pi), (px, py + ph, 1.5 * math.pi, math.tau)):
            chalk_arc(d, cx0, cy0, 1.0 * PPM, a0, a1, rnd, wear, squash=1.0)
        return
    # goal areas (5v5: a 6 m wide, 4 m deep box); penalty spots at 6 m
    gw, gd = 6.0 * PPM, 4.0 * PPM
    for side in (0, 1):
        x = px if side == 0 else px + pw
        sgn = 1 if side == 0 else -1
        chalk_line(d, (x, cy - gw / 2), (x + sgn * gd, cy - gw / 2), rnd, wear)
        chalk_line(d, (x + sgn * gd, cy - gw / 2), (x + sgn * gd, cy + gw / 2), rnd, wear)
        chalk_line(d, (x, cy + gw / 2), (x + sgn * gd, cy + gw / 2), rnd, wear)
        d.point((int(x + sgn * 6.0 * PPM), int(cy)), CHALK)
        d.point((int(x + sgn * 6.0 * PPM) + 1, int(cy)), CHALK)


# ---------------------------------------------------------------------------
# Props (each returns an RGBA image; the pivot is the bottom centre unless noted)
# ---------------------------------------------------------------------------

def _mat_canvas(w, h, mats):
    cv = Canvas(w, h)
    for name, hexes in mats.items():
        cv.add_material(Material(name, hex2rgb(hexes[0]), hex2rgb(hexes[1]), hex2rgb(hexes[2])))
    return cv


def goal(style="bamboo", width_px=30, height_px=17, depth_px=13, facing="E", yf=1.0):
    """A goal seen from the 3/4 view. facing E means the goal is on the west end, open toward +x.
    Returned image is drawn with the goal line at x = margin (facing E) and the posts vertical.
    """
    mats = {"post": ("#C9A24E", "#E3C070", "#8E6F2E"), "bamboo": ("#B9964A", "#D6B46A", "#7E6230"),
            "net": ("#E9E2CF", "#FFFFFF", "#B9B2A0"), "net2": ("#CFC8B6", "#E9E2CF", "#9E9888")} if style == "bamboo" else \
           {"post": ("#EDEDED", "#FFFFFF", "#B5B5B5"), "bamboo": ("#EDEDED", "#FFFFFF", "#B5B5B5"),
            "net": ("#E9E2CF", "#FFFFFF", "#B9B2A0"), "net2": ("#CFC8B6", "#E9E2CF", "#9E9888")}
    margin = 4
    w = depth_px + margin * 2 + 3
    h = int(height_px * rig.ZF) + int(width_px * rig.YF) + margin * 2 + 6
    cv = _mat_canvas(w, h, mats)
    H = height_px * rig.ZF            # projected height of the crossbar
    D = int(width_px * yf)            # goal width on screen (the pitch is drawn top-down, so 1:1 with the lines)
    top = margin + 2
    # facing E: the goal stands on the west goal line and opens toward +x, so its net
    # extends to the LEFT of the goal line (gx near the right edge of the image).
    gx = w - margin - 2 if facing == "E" else margin + 1   # goal line x
    back = gx - depth_px if facing == "E" else gx + depth_px
    # net: a grid of thin lines, slightly sagging
    rnd = random.Random(5)
    # top net: a mesh seen from above, between the crossbar (y=top..top+D) and the back
    for x in range(min(gx, back), max(gx, back) + 1):
        for i in range(0, D + 1):
            sag = int(1.2 * math.sin(math.pi * i / max(1, D)) * (abs(x - gx) / max(1, depth_px)))
            if (x % 3 == 0) or (i % 3 == 0):
                cv.put(x, top + i + sag, "net2", -10)
    # back net: the vertical mesh at the back, from the top edge down to the ground
    for i in range(0, D + 1):
        for yy in range(top + i, top + int(H) + i + 1):
            if (yy % 3 == 0) or (i % 3 == 0):
                cv.put(back, yy, "net", -9)
    # side nets (near and far), seen edge-on as a faint vertical mesh
    for y0 in (top, top + D):
        for x in range(min(gx, back), max(gx, back) + 1):
            for yy in range(y0, y0 + int(H) + 1):
                if (x % 3 == 0) or (yy % 3 == 0):
                    cv.put(x, yy, "net2", -10 - (1 if y0 == top else 0))
    # posts: near post (bottom), far post (top), crossbar
    for i, y0 in enumerate((top, top + D)):
        for yy in range(y0, y0 + int(H) + 1):
            cv.put(gx, yy, "bamboo" if (yy // 4) % 2 else "post", 5)
            cv.put(gx + (1 if facing == "E" else -1), yy, "post", 4)
    for yy in range(top, top + D + 1):
        cv.put(gx, yy, "post", 6)
        cv.put(gx + (1 if facing == "E" else -1), yy, "bamboo" if (yy // 5) % 2 else "post", 5)
    # back posts
    for y0 in (top, top + D):
        for yy in range(y0, y0 + int(H) + 1):
            cv.put(back, yy, "bamboo", -8)
    cv.shade()
    cv.outline()
    img = cv.to_image()
    meta = {"goal_line_x": gx, "top_y": top + int(H), "bottom_y": top + D + int(H), "crossbar_y": top, "w": w, "h": h}
    return img, meta


def house(variant: int, seed: int = 1):
    rnd = random.Random(seed * 7 + variant)
    walls = [("#C8B48C", "#E0CDA6", "#9A8766"), ("#9CB3BF", "#BBD0DA", "#6E8894"), ("#D9A066", "#EFBF8A", "#A6703F"),
             ("#B8C4A0", "#D3DDBC", "#86937A"), ("#D7C5B8", "#EDE0D6", "#A3918A")][variant % 5]
    roofs = [("#8A8F94", "#B4B9BE", "#5E6367"), ("#A6553A", "#C97A5C", "#733A26"), ("#7E8E99", "#A7B6C0", "#55626B")]
    roof = roofs[rnd.randrange(len(roofs))]
    w = rnd.choice((44, 52, 60, 68))
    hwall = rnd.choice((22, 26, 30))
    hroof = 12
    mats = {"wall": walls, "roof": roof, "door": ("#4F3627", "#6C4B36", "#2F1F15"), "win": ("#5B7B8C", "#86A8B8", "#3A525C"),
            "frame": ("#F0E8D8", "#FFFFFF", "#B9B0A0"), "trim": ("#8A3A2C", "#A8513F", "#5E2318")}
    cv = _mat_canvas(w + 4, hwall + hroof + 6, mats)
    base = cv.h - 2
    # wall with a darker plinth
    cv.rect(2, base - hwall, w + 1, base, "wall")
    cv.rect(2, base - 3, w + 1, base, "trim")
    # corrugated tin roof: stripes
    for x in range(0, w + 4):
        for y in range(2, hroof + 2):
            band = (x // 3) % 2
            cv.put(x, y, "roof", 1, 0)
            if band:
                cv.put(x, y, "roof", 1, -1)
    # roof overhang shadow on the wall
    for x in range(2, w + 2):
        cv.put(x, hroof + 2, "wall", 2, -1)
    # door and windows
    dx = rnd.randrange(6, w - 12)
    cv.rect(dx, base - 14, dx + 6, base - 3, "door")
    nwin = max(1, w // 24)
    for i in range(nwin):
        wx = 6 + i * (w - 12) // max(1, nwin) + rnd.randrange(0, 4)
        if abs(wx - dx) < 9:
            wx += 10
        if wx + 7 > w:
            continue
        cv.rect(wx, base - hwall + 6, wx + 7, base - hwall + 12, "frame")
        cv.rect(wx + 1, base - hwall + 7, wx + 6, base - hwall + 11, "win")
        cv.put(wx + 3, base - hwall + 9, "frame", 3)
    cv.shade()
    cv.outline()
    return cv.to_image()


def mango_tree(seed: int = 2, size: int = 1):
    rnd = random.Random(seed)
    mats = {"leaf": ("#2F6B33", "#4C8A45", "#1F4A23"), "leaf2": ("#3C7A3A", "#5E9A4E", "#28552A"),
            "trunk": ("#5A3D2A", "#7A553B", "#3B271A"), "fruit": ("#D9B23A", "#F0CF5C", "#A77F23")}
    w, h = 72 * size, 76 * size
    cv = _mat_canvas(w, h, mats)
    base = h - 2
    cx = w // 2
    # trunk and two branches
    cv.capsule(cx, base, cx - 2, base - 24 * size, 3.2 * size, 2.2 * size, "trunk", 5, 5)
    cv.capsule(cx - 2, base - 22 * size, cx - 12, base - 36 * size, 1.8 * size, 1.2 * size, "trunk", 4, 4)
    cv.capsule(cx - 2, base - 24 * size, cx + 10, base - 38 * size, 1.8 * size, 1.2 * size, "trunk", 4, 4)
    # canopy: clusters of leaf blobs
    for i in range(26 * size):
        a = rnd.random() * math.tau
        r = rnd.random() ** 0.6 * 26 * size
        x = cx + math.cos(a) * r
        y = base - 46 * size + math.sin(a) * r * 0.62
        cv.disc(x, y, rnd.uniform(5, 9) * size, "leaf" if rnd.random() < 0.55 else "leaf2", 10 + rnd.random(), squash=0.8)
    for i in range(6 * size):
        a = rnd.random() * math.tau
        r = rnd.random() * 20 * size
        cv.disc(cx + math.cos(a) * r, base - 44 * size + math.sin(a) * r * 0.6 + 4, 1.2, "fruit", 30)
    cv.shade()
    cv.outline()
    return cv.to_image()


def palm_tree(seed: int = 4):
    rnd = random.Random(seed)
    mats = {"leaf": ("#3E8A3E", "#62A852", "#275C2A"), "trunk": ("#8A6A45", "#AD8A5F", "#5E4530"), "coco": ("#6C4B2A", "#8A6540", "#4A3119")}
    w, h = 64, 84
    cv = _mat_canvas(w, h, mats)
    base = h - 2
    cx = w // 2
    cv.capsule(cx + 6, base, cx - 4, base - 56, 2.6, 1.8, "trunk", 5, 5)
    for i in range(8):
        a = math.tau * i / 8 + rnd.uniform(-0.2, 0.2)
        L = rnd.uniform(18, 26)
        ex = cx - 4 + math.cos(a) * L
        ey = base - 58 + math.sin(a) * L * 0.55 + (6 if math.sin(a) > 0 else 2)
        cv.capsule(cx - 4, base - 58, ex, ey, 2.4, 0.8, "leaf", 10 + i, 10 + i)
    for i in range(3):
        cv.disc(cx - 4 + rnd.uniform(-3, 3), base - 56 + rnd.uniform(0, 3), 1.6, "coco", 20)
    cv.shade()
    cv.outline()
    return cv.to_image()


def utility_pole():
    mats = {"wood": ("#7A5A3C", "#9A7A58", "#4E3824"), "wire": ("#3A3A3A", "#555555", "#202020"), "ins": ("#CFCFCF", "#EEEEEE", "#999999")}
    cv = _mat_canvas(14, 70, mats)
    cv.rect(6, 4, 7, 68, "wood")
    cv.rect(2, 8, 11, 9, "wood")
    for x in (2, 10):
        cv.put(x, 7, "ins")
    cv.shade()
    cv.outline()
    return cv.to_image()


def plastic_chair(colour=("#E8E8E8", "#FFFFFF", "#B5B5B5")):
    mats = {"c": colour}
    cv = _mat_canvas(12, 16, mats)
    cv.rect(2, 2, 9, 7, "c")       # back
    cv.rect(1, 8, 10, 10, "c")     # seat
    for x in (1, 10):
        cv.rect(x, 11, x, 14, "c")
    cv.shade()
    cv.outline()
    return cv.to_image()


def bench():
    mats = {"w": ("#A67C4F", "#C79A68", "#6E4F2F")}
    cv = _mat_canvas(28, 12, mats)
    cv.rect(1, 3, 26, 6, "w")
    for x in (2, 24):
        cv.rect(x, 7, x + 1, 10, "w")
    cv.shade()
    cv.outline()
    return cv.to_image()


def vendor_stand(seed=9):
    """Madame Ekotto's beignets stand: table, basin, and a big umbrella."""
    mats = {"table": ("#8E6B45", "#B08A5E", "#5C4228"), "cloth": ("#C9362B", "#E25A4D", "#8E251D"), "cloth2": ("#F0B92E", "#F8D066", "#A87F18"),
            "basin": ("#B9C4CC", "#DDE4E8", "#7F8A92"), "pole": ("#555555", "#777777", "#333333"), "beignet": ("#C98A3E", "#E3A85A", "#8F5F26")}
    cv = _mat_canvas(44, 46, mats)
    base = 44
    # umbrella (pagne panels alternate red / yellow)
    cx = 22
    for y in range(2, 14):
        half = int((y - 2) * 1.6)
        for x in range(cx - half, cx + half + 1):
            panel = ((x - cx + 40) // 6) % 2
            cv.put(x, y, "cloth" if panel else "cloth2", 10)
    cv.rect(cx, 14, cx, base - 10, "pole")
    cv.rect(6, base - 12, 38, base - 5, "table")
    cv.rect(5, base - 5, 7, base, "table")
    cv.rect(37, base - 5, 39, base, "table")
    cv.disc(16, base - 13, 5, "basin", 12, squash=0.6)
    for i in range(6):
        cv.put(13 + (i % 4) * 2, base - 14 - (i // 4), "beignet", 13)
    cv.disc(29, base - 13, 4, "basin", 12, squash=0.6)
    cv.shade()
    cv.outline()
    return cv.to_image()


def benskin(colour=("#2E63B8", "#5A8ADB", "#1C3F78"), seed=3):
    """A moto-taxi (benskin) parked on the road, seen from the 3/4 view."""
    mats = {"body": colour, "tyre": ("#2A2A2A", "#4A4A4A", "#111111"), "chrome": ("#C8CED2", "#EEF2F4", "#8A9196"), "seat": ("#3A2A22", "#55413A", "#221812")}
    cv = _mat_canvas(30, 18, mats)
    cv.disc(7, 13, 3.4, "tyre", 1, squash=1.0)
    cv.disc(23, 13, 3.4, "tyre", 1, squash=1.0)
    cv.disc(7, 13, 1.2, "chrome", 2)
    cv.disc(23, 13, 1.2, "chrome", 2)
    cv.capsule(8, 10, 22, 10, 2.2, 2.2, "body", 3, 3)
    cv.rect(11, 5, 19, 7, "seat")
    cv.capsule(21, 9, 25, 4, 1.0, 0.8, "chrome", 4, 4)   # handlebar
    cv.capsule(4, 8, 8, 10, 1.0, 1.0, "body", 3, 3)      # rear mudguard
    cv.shade()
    cv.outline()
    return cv.to_image()


def wall_segment(length=96, seed=11):
    """Low cinder-block wall with a painted mural band (kids sit on it)."""
    rnd = random.Random(seed)
    mats = {"block": ("#A9A196", "#C9C1B5", "#7E776E"), "paint": ("#2E6B45", "#4E8E62", "#1E4A30"), "paint2": ("#E3A92B", "#F4C65A", "#A87A18"), "paint3": ("#B8432F", "#D4604B", "#7E2D1F")}
    cv = _mat_canvas(length + 2, 22, mats)
    cv.rect(1, 4, length, 20, "block")
    for y in range(4, 20, 4):
        for x in range(1, length, 8):
            off = 4 if (y // 4) % 2 else 0
            cv.put(x + off, y, "block", 1, -1)
    # mural: three colour bands (green, red, yellow of Cameroon, painted by the neighbourhood kids)
    for i, m in enumerate(("paint", "paint3", "paint2")):
        x0 = 8 + i * (length - 16) // 3
        x1 = 8 + (i + 1) * (length - 16) // 3 - 2
        cv.rect(x0, 8, x1, 16, m)
    cv.shade()
    cv.outline()
    return cv.to_image()


def terrace(length=120, rows=3, seed=21, colour=("#9C978C", "#B9B4A8", "#6F6A61")):
    """Concrete terrace steps (a stand). Pivot bottom centre; crowd sprites sit on the step tops."""
    rnd = random.Random(seed)
    step_h = 9
    mats = {"con": colour, "con2": (colour[2], colour[0], "#4E4A43"), "rail": ("#3C3C44", "#5A5A64", "#22222A"),
            "paint": ("#2E6B45", "#4E8E62", "#1E4A30"), "paint2": ("#E3A92B", "#F4C65A", "#A87A18")}
    h = rows * step_h + 10
    cv = _mat_canvas(length + 2, h, mats)
    for r in range(rows):
        # back rows are higher and further (drawn first), fronts overlap them
        y0 = h - (r + 1) * step_h - 2
        y1 = h - r * step_h - 1
        cv.rect(1, y0, length, y1, "con")
        cv.rect(1, y1 - 2, length, y1, "con2")
        # painted edge every other row
        if r % 2 == 0:
            for x in range(1, length, 12):
                cv.rect(x, y0, min(length, x + 5), y0 + 1, "paint" if (x // 12) % 2 else "paint2")
    # rail along the top
    for x in range(1, length + 1):
        cv.put(x, 2, "rail")
    for x in range(3, length, 10):
        cv.rect(x, 2, x, h - rows * step_h - 2, "rail")
    cv.shade()
    cv.outline()
    return cv.to_image(), step_h


def floodlight(seed=3):
    """A tall floodlight mast with a bank of lamps. Pivot bottom centre."""
    mats = {"mast": ("#6E7076", "#8E9096", "#44464C"), "lamp": ("#F4EFD8", "#FFFFFF", "#C8C2A8"), "box": ("#3C3C44", "#5A5A64", "#22222A")}
    cv = _mat_canvas(26, 110, mats)
    cv.rect(12, 14, 14, 108, "mast")
    cv.rect(10, 60, 16, 62, "mast")
    cv.rect(4, 4, 22, 14, "box")
    for x in range(6, 22, 4):
        for y in (6, 10):
            cv.put(x, y, "lamp", 6)
            cv.put(x + 1, y, "lamp", 6)
    cv.shade()
    cv.outline()
    return cv.to_image()


def dugout(seed=4):
    """A small covered bench for the substitutes. Pivot bottom centre."""
    mats = {"roof": ("#2B3F7A", "#4C62A4", "#1A2850"), "frame": ("#B5B5B5", "#EDEDED", "#7A7A7A"), "seat": ("#C9362B", "#E25A4D", "#8E251D")}
    cv = _mat_canvas(44, 26, mats)
    cv.rect(2, 2, 42, 7, "roof")
    cv.rect(2, 7, 3, 24, "frame")
    cv.rect(41, 7, 42, 24, "frame")
    for x in range(6, 40, 7):
        cv.rect(x, 14, x + 4, 18, "seat")
        cv.rect(x, 18, x + 4, 23, "frame")
    cv.shade()
    cv.outline()
    return cv.to_image()


def ad_board(text: str, bg: str, fg: str, length: int = 96, seed: int = 1):
    """Perimeter advertising board with an original brand name, in the game's pixel font."""
    from PIL import ImageFont
    img = Image.new("RGBA", (length, 13), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, length - 1, 12), fill=hex2rgb(bg) + (255,), outline=(30, 24, 22, 255))
    d.rectangle((1, 11, length - 2, 11), fill=tuple(max(0, c - 40) for c in hex2rgb(bg)) + (255,))
    font = ImageFont.truetype(os.path.join(ROOT, "game", "assets", "fonts", "Silkscreen-Regular.ttf"), 8)
    tw = d.textlength(text, font=font)
    d.text(((length - tw) // 2, 2), text, font=font, fill=hex2rgb(fg) + (255,))
    return img


ADS = [("NDAMBA", "#1F4D3A", "#F6F1E4"), ("LEMON NETWORK", "#E3A92B", "#1E1A17"), ("BEIGNETS MAMI", "#B8432F", "#F6F1E4"),
       ("BENSKIN EXPRESS", "#2B3F7A", "#F6F1E4"), ("CODE NJANGI", "#F6F1E4", "#1F4D3A"), ("LE BALLON VOYAGE", "#C5762F", "#101814"),
       ("RADIO QUARTIER", "#101814", "#E3A92B"), ("MAKOSSA FM", "#5C6B2E", "#F6F1E4")]


def vignette(w: int = 640, h: int = 360):
    """Soft dark edges for the camera overlay."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    for y in range(h):
        for x in range(w):
            dx = (x - w / 2) / (w / 2)
            dy = (y - h / 2) / (h / 2)
            d = math.sqrt(dx * dx + dy * dy)
            a = max(0.0, (d - 0.62) / 0.55)
            px[x, y] = (8, 6, 10, int(min(1.0, a * a) * 150))
    return img


def ball_sheet():
    """Ball: 4 rotation frames (the pagne patch turns) + a shadow frame. 8x8 cells."""
    mats = {"leather": ("#E8DFC8", "#FFFFFF", "#B9AE94"), "patch": ("#C9362B", "#E25A4D", "#8E251D"), "patch2": ("#F0B92E", "#F8D066", "#A87F18"), "seam": ("#3A2E28", "#55463E", "#201814")}
    frames = []
    for f in range(4):
        cv = _mat_canvas(8, 8, mats)
        cv.disc(4, 4, 3.0, "leather", 0)
        a = f * math.pi / 2
        px_ = 4 + math.cos(a) * 1.6
        py_ = 4 + math.sin(a) * 1.6
        cv.put(int(px_), int(py_), "patch", 1)
        cv.put(int(px_) + (1 if math.cos(a) >= 0 else -1), int(py_), "patch2", 1)
        cv.put(int(4 - math.cos(a) * 1.8), int(4 - math.sin(a) * 1.8), "seam", 1)
        cv.shade()
        cv.outline()
        frames.append(cv.to_image())
    sheet = Image.new("RGBA", (8 * 5, 8))
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * 8, 0))
    # shadow
    sh = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(sh)
    d.ellipse((1, 3, 6, 6), fill=(40, 20, 20, 110))
    sheet.paste(sh, (32, 0))
    return sheet


def dust_sheet():
    """Dust puffs for sprints, slides and bounces on terre battue: 6 frames of 16x16."""
    sheet = Image.new("RGBA", (16 * 6, 16), (0, 0, 0, 0))
    rnd = random.Random(21)
    for f in range(6):
        fr = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        d = ImageDraw.Draw(fr)
        t = f / 5
        n = 5 - f // 2
        for i in range(n):
            r = 1 + int(t * 3) + rnd.randrange(0, 2)
            x = 8 + rnd.randint(-3, 3) - int(t * 2)
            y = 10 - int(t * 5) + rnd.randint(-2, 2)
            a = int(170 * (1 - t) + 20)
            d.ellipse((x - r, y - r, x + r, y + r), fill=(222, 174, 134, a))
        sheet.paste(fr, (f * 16, 0))
    return sheet


# ---------------------------------------------------------------------------
# Crowd: small figures made with the rig in random clothes, sitting or standing
# ---------------------------------------------------------------------------

def pose_sit(f: int) -> dict:
    p = rig.base_pose()
    for k in list(p.keys()):
        if isinstance(p[k], tuple):
            x, y, z = p[k]
            p[k] = (x, y, z - 6.5)
    p["ankL"] = (5.5, rig.ANK_Y + 0.5, 1.2)
    p["ankR"] = (5.5, -rig.ANK_Y - 0.5, 1.2)
    p["kneeL"] = (4.0, rig.HIP_Y + 0.5, 6.0)
    p["kneeR"] = (4.0, -rig.HIP_Y - 0.5, 6.0)
    p["toeL"] = (7.5, rig.ANK_Y + 0.5, 0.8)
    p["toeR"] = (7.5, -rig.ANK_Y - 0.5, 0.8)
    p["pelvis"] = (0, 0, 4.5)
    p["hipL"] = (0, rig.HIP_Y, 4.5)
    p["hipR"] = (0, -rig.HIP_Y, 4.5)
    bob = 0.3 * math.sin(math.pi * f / 2)
    p["handL"] = (3.5, rig.SHO_Y + 0.6, 6.5 + bob)
    p["handR"] = (3.5, -rig.SHO_Y - 0.6, 6.5 + bob)
    p["elbL"] = (1.0, rig.SHO_Y + 0.9, 9.0)
    p["elbR"] = (1.0, -rig.SHO_Y - 0.9, 9.0)
    return p


def pose_cheer(f: int) -> dict:
    return rig.pose_celebrate(f)


def crowd_sheet(seed: int = 5, count: int = 24):
    """Each crowd member: 4 idle frames + 4 cheer frames, one direction (S, facing the pitch).
    Shirts use the palette KEY colours (jersey / jersey2) so the game recolours every section
    in the colours of the home team, the away team, or a neutral shirt at run time."""
    rnd = random.Random(seed)
    cell = rig.CELL
    sheet = Image.new("RGBA", (8 * cell, count * cell), (0, 0, 0, 0))
    pal = rig.load_palette()
    key = pal["keys"]
    meta = []
    for i in range(count):
        skin = rnd.choice(list(pal["skin_tones"].values()))
        shorts = rnd.choice(["#1C1C22", "#3B5998", "#6E4B2A", "#8E251D", "#F2EEE3"])
        keys = {
            "skin": skin, "hair": pal["hair_colours"]["black"],
            "jersey": key["jersey"], "jersey2": key["jersey2"],
            "shorts": [shorts, rig.lighten_hex(shorts), rig.darken_hex(shorts)],
            "socks": [skin[0], skin[1], skin[2]], "socks2": [skin[0], skin[1], skin[2]], "boots": ["#3A2A22", "#55413A", "#221812"],
            "keeper": key["jersey"], "gloves": skin, "wrap": key["jersey2"],
        }
        hair = rnd.choice(["short", "short", "afro", "fade", "braids", "wrap"])
        pattern = rnd.choice(["plain", "plain", "stripes", "halves", "hoops", "sash"])
        sitting = rnd.random() < 0.5
        look = rig.Look(hair=hair, pattern=pattern)
        direction = rnd.choice(["S", "S", "SE", "SW"])
        for f in range(4):
            fr = render_pose(pose_sit(f) if sitting else rig.pose_idle(f), direction, look, keys, seed + i * 3 + f)
            sheet.paste(fr, (f * cell, i * cell))
            fr2 = render_pose(pose_cheer(f) if not sitting else pose_sit_cheer(f), direction, look, keys, seed + i * 3 + f)
            sheet.paste(fr2, ((4 + f) * cell, i * cell))
        meta.append({"row": i, "sitting": sitting})
    return sheet, {"cell": cell, "rows": meta}


def flag_sheet(seed: int = 9, frames: int = 6, w: int = 24, h: int = 30):
    """A supporter's flag on a stick, waving: `frames` cells of w x h. The cloth uses the
    jersey / jersey2 key colours (two horizontal bands) so it is recoloured per team."""
    pal = rig.load_palette()
    key = pal["keys"]
    sheet = Image.new("RGBA", (frames * w, h), (0, 0, 0, 0))
    pole = (58, 44, 36, 255)
    pole_hi = (92, 72, 58, 255)
    for f in range(frames):
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        px = img.load()
        ph = math.pi * 2 * f / frames
        sx = 4
        for y in range(2, h):
            px[sx, y] = pole
            if y < h - 3:
                px[sx + 1, y] = pole_hi
        cloth_w, cloth_h = 16, 11
        for cx in range(cloth_w):
            t = cx / float(cloth_w - 1)
            wave = math.sin(ph + t * 4.2) * 1.6 * t
            tilt = int(round(wave))
            shrink = int(round(t * 1.5 * (0.5 + 0.5 * math.sin(ph + 1.3 + t * 3.0))))
            for cy in range(cloth_h):
                y = 3 + cy + tilt
                if cy < shrink or cy >= cloth_h - shrink:
                    continue
                if 0 <= y < h:
                    band = key["jersey"] if cy < cloth_h // 2 else key["jersey2"]
                    shade = 0
                    # light where the cloth faces the sun (rising part of the wave), dark in the troughs
                    slope = math.cos(ph + t * 4.2)
                    if slope > 0.45:
                        shade = 1
                    elif slope < -0.45:
                        shade = 2
                    px[sx + 2 + cx, y] = hex2rgb(band[shade]) + (255,)
        # outline
        d = ImageDraw.Draw(img)
        out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        op = out.load()
        for y in range(h):
            for x in range(w):
                if px[x, y][3] == 0:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] != 0 and px[nx, ny] not in (pole, pole_hi):
                            op[x, y] = (30, 24, 22, 255)
                            break
        img = Image.alpha_composite(out, img)
        sheet.paste(img, (f * w, 0))
    return sheet


def pose_sit_cheer(f: int) -> dict:
    p = pose_sit(f)
    up = [1, 4, 5, 3][f]
    p["handL"] = (1.0, rig.SHO_Y + 2.0, 14.0 + up)
    p["handR"] = (1.0, -rig.SHO_Y - 2.0, 14.0 + up)
    p["elbL"] = (0.5, rig.SHO_Y + 1.5, 11.0 + up * 0.5)
    p["elbR"] = (0.5, -rig.SHO_Y - 1.5, 11.0 + up * 0.5)
    p["face"] = "happy"
    return p


def render_pose(pose, direction, look, keys, seed):
    cv = Canvas(rig.CELL, rig.CELL)
    for m in rig.materials_from_keys(keys):
        cv.add_material(m)
    rnd = random.Random(seed)
    rig.draw_figure(cv, pose, rig.DIR_ANGLE[direction], look, rnd)
    cv.shade()
    cv.outline()
    return cv.to_image()


# ---------------------------------------------------------------------------
# Build everything
# ---------------------------------------------------------------------------

WORLD_W, WORLD_H = 800, 520
PITCH = (200, 135, 400, 250)   # 50 m x 31 m at 8 px/m (5v5 neighbourhood pitch)
FULL_W, FULL_H = 1140, 760
FULL_PITCH = (150, 108, 840, 544)   # 105 m x 68 m at 8 px/m (11-a-side stadium pitch)


def build_all(out: str):
    os.makedirs(os.path.join(out, "stadium"), exist_ok=True)
    os.makedirs(os.path.join(out, "props"), exist_ok=True)
    os.makedirs(os.path.join(out, "fx"), exist_ok=True)
    for surface in ("terre", "grass", "sand", "mud"):
        ground_texture(surface, WORLD_W, WORLD_H, PITCH, seed=3).save(os.path.join(out, "stadium", f"ground_{surface}.png"))
        ground_texture(surface, FULL_W, FULL_H, FULL_PITCH, seed=4, rules="full").save(os.path.join(out, "stadium", f"ground_full_{surface}.png"))
    # full-size goals: 7.32 m x 2.44 m
    for style in ("metal", "bamboo"):
        fl, fm = goal(style, width_px=int(7.32 * PPM), height_px=int(2.44 * PPM), depth_px=18, facing="E")
        fl.save(os.path.join(out, "props", f"goal_full_{style}_w.png"))
        fr, fm2 = goal(style, width_px=int(7.32 * PPM), height_px=int(2.44 * PPM), depth_px=18, facing="W")
        fr.save(os.path.join(out, "props", f"goal_full_{style}_e.png"))
    for i, (txt, bg, fg) in enumerate(ADS):
        ad_board(txt, bg, fg).save(os.path.join(out, "props", f"ad_{i}.png"))
    vignette().save(os.path.join(out, "fx", "vignette.png"))
    terrace_img, step_h = terrace()
    terrace_img.save(os.path.join(out, "props", "terrace.png"))
    terrace(length=120, rows=3, seed=22, colour=("#8E8A80", "#ABA69A", "#625E56"))[0].save(os.path.join(out, "props", "terrace_2.png"))
    floodlight().save(os.path.join(out, "props", "floodlight.png"))
    dugout().save(os.path.join(out, "props", "dugout.png"))
    gl, gm = goal("bamboo", facing="E")
    gl.save(os.path.join(out, "props", "goal_bamboo_w.png"))
    gr, gm2 = goal("bamboo", facing="W")
    gr.save(os.path.join(out, "props", "goal_bamboo_e.png"))
    ml, _ = goal("metal", facing="E")
    ml.save(os.path.join(out, "props", "goal_metal_w.png"))
    mr, _ = goal("metal", facing="W")
    mr.save(os.path.join(out, "props", "goal_metal_e.png"))
    for v in range(5):
        house(v, seed=v + 1).save(os.path.join(out, "props", f"house_{v}.png"))
    mango_tree(2).save(os.path.join(out, "props", "mango_tree.png"))
    mango_tree(8).save(os.path.join(out, "props", "mango_tree_2.png"))
    palm_tree(4).save(os.path.join(out, "props", "palm.png"))
    utility_pole().save(os.path.join(out, "props", "pole.png"))
    plastic_chair().save(os.path.join(out, "props", "chair_white.png"))
    plastic_chair(("#2E63B8", "#5A8ADB", "#1C3F78")).save(os.path.join(out, "props", "chair_blue.png"))
    bench().save(os.path.join(out, "props", "bench.png"))
    vendor_stand().save(os.path.join(out, "props", "vendor_stand.png"))
    benskin().save(os.path.join(out, "props", "benskin_blue.png"))
    benskin(("#C9362B", "#E25A4D", "#8E251D"), 4).save(os.path.join(out, "props", "benskin_red.png"))
    benskin(("#F0B92E", "#F8D066", "#A87F18"), 5).save(os.path.join(out, "props", "benskin_yellow.png"))
    wall_segment().save(os.path.join(out, "props", "wall_mural.png"))
    ball_sheet().save(os.path.join(out, "fx", "ball.png"))
    dust_sheet().save(os.path.join(out, "fx", "dust.png"))
    cs, cmeta = crowd_sheet()
    cs.save(os.path.join(out, "props", "crowd.png"))
    with open(os.path.join(out, "props", "crowd.json"), "w") as f:
        json.dump(cmeta, f)
    flag_sheet().save(os.path.join(out, "props", "flag.png"))
    with open(os.path.join(out, "stadium", "layout_meta.json"), "w") as f:
        json.dump({"world": [WORLD_W, WORLD_H], "pitch": PITCH, "ppm": PPM, "goal_w": gm, "goal_e": gm2,
                   "goal_full_w": fm, "goal_full_e": fm2, "terrace_step": step_h,
                   "layouts": {"street": {"world": [WORLD_W, WORLD_H], "pitch": PITCH}, "full": {"world": [FULL_W, FULL_H], "pitch": FULL_PITCH}}}, f, indent=1)
    print("stadium assets written to", out)


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "game", "assets"))
    a = ap.parse_args()
    build_all(a.out)
