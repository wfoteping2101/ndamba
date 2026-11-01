"""Tiny pixel-art rasterizer used by every NDAMBA art script.

A Canvas holds an index buffer (palette ids) plus a depth buffer. Drawing primitives
paint palette ids; `shade()` adds a top-left light and a bottom-right shadow tone per
material, and `outline()` adds the one-pixel dark contour that keeps sprites readable
on a busy red-earth pitch. Everything is deterministic (seeded) so sheets are stable
across runs and across machines.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field

from PIL import Image

# ---------------------------------------------------------------------------
# Colours. A material is (base, light, dark) RGB triplets.
# ---------------------------------------------------------------------------

def hex2rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def clamp(v: float, lo: float = 0, hi: float = 255) -> int:
    return int(max(lo, min(hi, round(v))))


def mix(a, b, t: float):
    return tuple(clamp(a[i] + (b[i] - a[i]) * t) for i in range(3))


def lighten(c, t: float = 0.22):
    # Warm highlight: push toward a creamy white rather than pure white.
    return mix(c, (255, 244, 214), t)


def darken(c, t: float = 0.28):
    # Cool shadow: push toward a deep brown-violet so shadows stay warm-ish.
    return mix(c, (44, 24, 40), t)


@dataclass
class Material:
    name: str
    base: tuple
    light: tuple = None
    dark: tuple = None
    outline: tuple = None

    def __post_init__(self):
        if self.light is None:
            self.light = lighten(self.base)
        if self.dark is None:
            self.dark = darken(self.base)
        if self.outline is None:
            self.outline = darken(self.base, 0.62)


OUTLINE = (38, 22, 30)
TRANSPARENT = (0, 0, 0, 0)


# ---------------------------------------------------------------------------
# Canvas
# ---------------------------------------------------------------------------

@dataclass
class Canvas:
    w: int
    h: int
    mats: dict = field(default_factory=dict)
    # index buffer: material name or None
    idx: list = field(init=False)
    depth: list = field(init=False)
    tone: list = field(init=False)   # -1 shadow, 0 base, +1 light, 2 outline, 3 forced colour
    forced: dict = field(default_factory=dict)

    def __post_init__(self):
        self.idx = [None] * (self.w * self.h)
        self.depth = [-1e9] * (self.w * self.h)
        self.tone = [0] * (self.w * self.h)

    def add_material(self, m: Material):
        self.mats[m.name] = m

    def inside(self, x: int, y: int) -> bool:
        return 0 <= x < self.w and 0 <= y < self.h

    def put(self, x: int, y: int, mat: str, depth: float = 0.0, tone: int = 0):
        if not self.inside(x, y):
            return
        i = y * self.w + x
        if depth >= self.depth[i]:
            self.depth[i] = depth
            self.idx[i] = mat
            self.tone[i] = tone

    def put_rgb(self, x: int, y: int, rgb, depth: float = 0.0):
        """Paint an explicit colour (used for eyes, numbers, chalk lines)."""
        if not self.inside(x, y):
            return
        i = y * self.w + x
        if depth >= self.depth[i]:
            self.depth[i] = depth
            self.idx[i] = "__forced__"
            self.tone[i] = 3
            self.forced[i] = tuple(rgb)

    def get(self, x: int, y: int):
        if not self.inside(x, y):
            return None
        return self.idx[y * self.w + x]

    # -- primitives ---------------------------------------------------------
    def disc(self, cx: float, cy: float, r: float, mat: str, depth: float = 0.0, squash: float = 1.0):
        """Filled ellipse (squash < 1 flattens vertically)."""
        rx = r
        ry = r * squash
        x0, x1 = int(math.floor(cx - rx - 1)), int(math.ceil(cx + rx + 1))
        y0, y1 = int(math.floor(cy - ry - 1)), int(math.ceil(cy + ry + 1))
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                dx = (x + 0.5 - cx) / max(rx, 0.01)
                dy = (y + 0.5 - cy) / max(ry, 0.01)
                if dx * dx + dy * dy <= 1.0:
                    self.put(x, y, mat, depth)

    def capsule(self, x0: float, y0: float, x1: float, y1: float, r0: float, r1: float,
                mat: str, depth0: float = 0.0, depth1: float = 0.0, mat_fn=None):
        """Thick line with tapered radius. mat_fn(t) may override the material per step."""
        length = math.hypot(x1 - x0, y1 - y0)
        steps = max(1, int(length * 2) + 1)
        for s in range(steps + 1):
            t = s / steps
            x = x0 + (x1 - x0) * t
            y = y0 + (y1 - y0) * t
            r = r0 + (r1 - r0) * t
            d = depth0 + (depth1 - depth0) * t
            m = mat_fn(t) if mat_fn else mat
            self.disc(x, y, r, m, d)

    def rect(self, x0: int, y0: int, x1: int, y1: int, mat: str, depth: float = 0.0):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, mat, depth)

    # -- finishing passes ----------------------------------------------------
    def shade(self, light_dir=(-1, -1), strength: int = 1):
        """Top-left light. A pixel whose neighbour toward the light is empty (or a
        different material) gets the light tone; toward the shadow side, the dark tone.
        """
        lx, ly = light_dir
        out = self.tone[:]

        def exposed(x, y, m, d):
            if not self.inside(x, y):
                return True
            j = y * self.w + x
            n = self.idx[j]
            if n is None:
                return True
            return n != m and self.depth[j] < d - 0.5

        for y in range(self.h):
            for x in range(self.w):
                i = y * self.w + x
                m = self.idx[i]
                if m is None or self.tone[i] == 3:
                    continue
                d = self.depth[i]
                if exposed(x + lx, y + ly, m, d):
                    out[i] = 1
                elif exposed(x - lx, y - ly, m, d):
                    out[i] = -1
                else:
                    out[i] = 0
        self.tone = out

    def outline(self, colour=OUTLINE, diagonal: bool = False):
        """Grow a 1px dark contour around the silhouette (does not overwrite the figure)."""
        neigh = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        if diagonal:
            neigh += [(1, 1), (-1, -1), (1, -1), (-1, 1)]
        to_add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.idx[y * self.w + x] is not None:
                    continue
                for dx, dy in neigh:
                    m = self.get(x + dx, y + dy)
                    if m is not None and m != "__outline__":
                        to_add.append((x, y))
                        break
        for x, y in to_add:
            i = y * self.w + x
            self.idx[i] = "__outline__"
            self.tone[i] = 2
            self.forced[i] = colour

    def inner_lines(self, colour=OUTLINE, pairs=()):
        """Draw a dark seam between two materials, e.g. ('skin','jersey')."""
        pairs = {frozenset(p) for p in pairs}
        marks = []
        for y in range(self.h):
            for x in range(self.w):
                m = self.idx[y * self.w + x]
                if m is None or m.startswith("__"):
                    continue
                for dx, dy in ((1, 0), (0, 1)):
                    n = self.get(x + dx, y + dy)
                    if n is not None and not n.startswith("__") and n != m and frozenset((m, n)) in pairs:
                        # mark the lower/right pixel so seams fall on the lower part
                        marks.append((x + dx, y + dy))
        for x, y in marks:
            i = y * self.w + x
            self.tone[i] = 2
            self.forced[i] = colour

    # -- output ---------------------------------------------------------------
    def to_image(self) -> Image.Image:
        img = Image.new("RGBA", (self.w, self.h), TRANSPARENT)
        px = img.load()
        for y in range(self.h):
            for x in range(self.w):
                i = y * self.w + x
                m = self.idx[i]
                if m is None:
                    continue
                t = self.tone[i]
                if t in (2, 3) or m.startswith("__"):
                    c = self.forced.get(i, OUTLINE)
                else:
                    mat = self.mats[m]
                    c = mat.base if t == 0 else (mat.light if t > 0 else mat.dark)
                px[x, y] = (c[0], c[1], c[2], 255)
        return img


# ---------------------------------------------------------------------------
# Helpers for noise-based textures (pitch, soil, grass)
# ---------------------------------------------------------------------------

def value_noise(w: int, h: int, cell: int, seed: int = 1, octaves: int = 3, persistence: float = 0.5):
    """Cheap tileable value noise in [0,1] as a list of rows."""
    rnd = random.Random(seed)
    total = [[0.0] * w for _ in range(h)]
    amp = 1.0
    norm = 0.0
    for o in range(octaves):
        c = max(1, cell >> o)
        gw, gh = (w + c - 1) // c, (h + c - 1) // c
        grid = [[rnd.random() for _ in range(gw)] for _ in range(gh)]
        for y in range(h):
            gy = y / c
            y0 = int(gy) % gh
            y1 = (y0 + 1) % gh
            fy = gy - int(gy)
            fy = fy * fy * (3 - 2 * fy)
            for x in range(w):
                gx = x / c
                x0 = int(gx) % gw
                x1 = (x0 + 1) % gw
                fx = gx - int(gx)
                fx = fx * fx * (3 - 2 * fx)
                v = (grid[y0][x0] * (1 - fx) + grid[y0][x1] * fx) * (1 - fy) + \
                    (grid[y1][x0] * (1 - fx) + grid[y1][x1] * fx) * fy
                total[y][x] += v * amp
        norm += amp
        amp *= persistence
    return [[v / norm for v in row] for row in total]


def quantize(v: float, ramp):
    """Map 0..1 to a colour ramp (list of RGB), snapping to discrete steps."""
    n = len(ramp)
    i = min(n - 1, max(0, int(v * n)))
    return ramp[i]
