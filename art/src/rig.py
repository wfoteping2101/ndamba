"""NDAMBA character rig: a tiny 3D stick skeleton rendered as 3/4-view pixel art.

Why a rig and not hand-placed pixels: every footballer needs 8 directions x ~60 frames,
in several kits, skin tones and hairstyles. The rig keeps proportions, light and outline
identical across all of them, and the sources (this file + palettes.json) stay editable.

Model space: +x forward, +y to the character's left, +z up, units = pixels at 1x.
Screen: x right, y down. The camera looks from the front-above (elevation ~40 degrees),
the classic 16-bit sports view.

Materials are painted with KEY colours (see palettes.json) so the game swaps them at
runtime with a palette shader: one sheet per (hair style, kit pattern) serves every team.
"""
from __future__ import annotations

import json
import math
import os
import random
from dataclasses import dataclass

from PIL import Image

from pixel import Canvas, Material, hex2rgb

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))  # repo root (ndamba/)

ELEV = math.radians(40.0)
ZF = math.cos(ELEV)   # how much height shows
YF = math.sin(ELEV)   # how much depth shows

CELL = 40
FEET_Y = 36.0          # screen y of the ground contact point inside a cell
CENTER_X = 20.0

# Direction order used by the sheet rows and by the game (clockwise from South).
DIRS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]
DIR_ANGLE = {"E": 0, "SE": 45, "S": 90, "SW": 135, "W": 180, "NW": 225, "N": 270, "NE": 315}


@dataclass
class Look:
    hair: str = "short"       # short | afro | fade | braids | wrap
    pattern: str = "plain"    # plain | stripes | hoops | sash | halves
    keeper: bool = False


# ---------------------------------------------------------------------------
# Skeleton poses. Each returns a dict of joints in model space.
# ---------------------------------------------------------------------------

HIP_Y = 2.0
ANK_Y = 2.3
SHO_Y = 3.4
HIP_Z = 11.0
SHO_Z = 19.0
NECK_Z = 20.6
HEAD_Z = 24.6
HEAD_R = 4.5


def base_pose() -> dict:
    return {
        "pelvis": (0, 0, HIP_Z),
        "neck": (0, 0, NECK_Z),
        "head": (0, 0, HEAD_Z),
        "shoL": (0, SHO_Y, SHO_Z), "shoR": (0, -SHO_Y, SHO_Z),
        "elbL": (0.3, SHO_Y + 0.8, 15.5), "elbR": (0.3, -SHO_Y - 0.8, 15.5),
        "handL": (0.8, SHO_Y + 0.9, 12.0), "handR": (0.8, -SHO_Y - 0.9, 12.0),
        "hipL": (0, HIP_Y, HIP_Z), "hipR": (0, -HIP_Y, HIP_Z),
        "kneeL": (0.4, HIP_Y, 6.0), "kneeR": (0.4, -HIP_Y, 6.0),
        "ankL": (0, ANK_Y, 1.4), "ankR": (0, -ANK_Y, 1.4),
        "toeL": (2.2, ANK_Y, 0.6), "toeR": (2.2, -ANK_Y, 0.6),
        "lean": 0.0,     # forward lean of the upper body (px)
        "face": "neutral",
    }


def _leg(p: dict, side: str, fwd: float, lift: float, bend: float = 1.2):
    s = 1 if side == "L" else -1
    y = HIP_Y * s
    ay = ANK_Y * s
    p["ank" + side] = (fwd, ay, 1.4 + lift)
    p["knee" + side] = (fwd * 0.55 + bend + lift * 0.6, y, 6.0 + lift * 0.45)
    p["toe" + side] = (fwd + 2.2, ay, 0.6 + lift * 0.9)


def _arm(p: dict, side: str, fwd: float, up: float = 0.0, out: float = 0.0):
    s = 1 if side == "L" else -1
    y = (SHO_Y + 0.9 + out) * s
    p["elb" + side] = (fwd * 0.5 - 0.4, (SHO_Y + 0.8 + out * 0.6) * s, 15.4 + up * 0.4)
    p["hand" + side] = (fwd, y, 12.0 + up)


def pose_idle(f: int, n: int = 4) -> dict:
    p = base_pose()
    bob = 0.35 * math.sin(2 * math.pi * f / n)
    for k in ("pelvis", "neck", "head", "shoL", "shoR", "elbL", "elbR", "handL", "handR"):
        x, y, z = p[k]
        p[k] = (x, y, z + bob)
    _leg(p, "L", 0.3, 0.0)
    _leg(p, "R", -0.3, 0.0)
    return p


def pose_run(f: int, n: int = 8, sprint: bool = False) -> dict:
    p = base_pose()
    ph = 2 * math.pi * f / n
    amp = 3.6 if sprint else 3.0
    liftamp = 3.2 if sprint else 2.6
    for side, phase in (("L", ph), ("R", ph + math.pi)):
        fwd = amp * math.sin(phase)
        lift = liftamp * max(0.0, math.cos(phase))
        _leg(p, side, fwd, lift)
    for side, phase in (("L", ph + math.pi), ("R", ph)):
        fwd = (3.2 if sprint else 2.6) * math.sin(phase)
        _arm(p, side, fwd, up=0.9 * abs(math.sin(phase)) + (1.5 if sprint else 0.5), out=0.3)
    bob = 0.7 * abs(math.cos(ph))
    lean = 3.0 if sprint else 1.6
    p["lean"] = lean
    for k in ("pelvis", "neck", "head", "shoL", "shoR", "elbL", "elbR", "handL", "handR", "hipL", "hipR"):
        x, y, z = p[k]
        p[k] = (x, y, z + bob)
    return p


def pose_walk(f: int, n: int = 6) -> dict:
    p = base_pose()
    ph = 2 * math.pi * f / n
    for side, phase in (("L", ph), ("R", ph + math.pi)):
        _leg(p, side, 1.8 * math.sin(phase), 1.2 * max(0.0, math.cos(phase)))
    for side, phase in (("L", ph + math.pi), ("R", ph)):
        _arm(p, side, 1.2 * math.sin(phase), 0.2)
    p["lean"] = 0.5
    return p


def pose_kick(f: int) -> dict:
    p = base_pose()
    # frames: 0 wind-up, 1 contact, 2 follow-through, 3 recover
    if f == 0:
        _leg(p, "R", -3.6, 2.2, bend=-0.5)
        _leg(p, "L", 0.6, 0.0)
        _arm(p, "L", 2.4, 2.5, 1.5)
        _arm(p, "R", -2.0, 1.5, 1.5)
        p["lean"] = 1.5
    elif f == 1:
        _leg(p, "R", 4.6, 1.0, bend=0.4)
        _leg(p, "L", -0.5, 0.0)
        _arm(p, "L", -2.0, 2.0, 2.0)
        _arm(p, "R", 2.0, 1.0, 2.0)
        p["lean"] = -1.5
    elif f == 2:
        _leg(p, "R", 5.2, 4.0, bend=0.2)
        _leg(p, "L", -0.8, 0.0)
        _arm(p, "L", -2.5, 2.5, 2.2)
        _arm(p, "R", 1.0, 1.0, 2.0)
        p["lean"] = -2.5
    else:
        _leg(p, "R", 2.0, 1.2)
        _leg(p, "L", -0.3, 0.0)
        _arm(p, "L", -0.5, 0.5, 0.8)
        _arm(p, "R", 0.5, 0.5, 0.8)
        p["lean"] = 0.0
    return p


def pose_tackle(f: int) -> dict:
    """Standing lunge: lead leg stretched to poke the ball."""
    p = base_pose()
    reach = [3.0, 5.5, 4.0][f]
    _leg(p, "R", reach, 0.6, bend=-0.3)
    _leg(p, "L", -2.0, 0.0)
    _arm(p, "L", 2.5, 1.5, 1.8)
    _arm(p, "R", -2.5, 1.0, 1.4)
    p["lean"] = 3.5
    for k in ("pelvis", "neck", "head", "shoL", "shoR", "elbL", "elbR", "handL", "handR", "hipL", "hipR"):
        x, y, z = p[k]
        p[k] = (x + reach * 0.25, y, z - 2.2)
    return p


def pose_slide(f: int) -> dict:
    """Slide tackle: low body, lead leg forward, trailing leg bent, one hand on the ground."""
    p = base_pose()
    drop = [4.5, 7.0, 7.5, 6.0][f]
    lead = [6.0, 8.5, 9.0, 7.0][f]
    p["pelvis"] = (-1.0, 0, HIP_Z - drop)
    p["hipL"] = (-1.0, HIP_Y, HIP_Z - drop)
    p["hipR"] = (-1.0, -HIP_Y, HIP_Z - drop)
    p["shoL"] = (-5.0, SHO_Y, SHO_Z - drop - 3.5)
    p["shoR"] = (-5.0, -SHO_Y, SHO_Z - drop - 3.5)
    p["neck"] = (-5.5, 0, NECK_Z - drop - 4.0)
    p["head"] = (-7.0, 0, HEAD_Z - drop - 5.0)
    p["ankR"] = (lead, -ANK_Y, 1.2)
    p["kneeR"] = (lead * 0.5, -HIP_Y, 2.6)
    p["toeR"] = (lead + 2.2, -ANK_Y, 1.4)
    p["ankL"] = (-3.0, ANK_Y + 1.0, 1.4)
    p["kneeL"] = (-0.5, HIP_Y + 1.2, 3.4)
    p["toeL"] = (-4.5, ANK_Y + 1.4, 0.8)
    p["elbL"] = (-5.5, SHO_Y + 1.8, 8.0 - drop * 0.3)
    p["handL"] = (-4.5, SHO_Y + 3.0, 0.8)
    p["elbR"] = (-2.5, -SHO_Y - 1.5, SHO_Z - drop - 1.0)
    p["handR"] = (1.0, -SHO_Y - 2.0, SHO_Z - drop + 1.5)
    p["lean"] = 0.0
    return p


def pose_fall(f: int) -> dict:
    """0: stumbling, 1: hitting the ground, 2: lying flat."""
    p = base_pose()
    t = [0.3, 0.75, 1.0][f]
    drop = HIP_Z * t
    p["pelvis"] = (-1.0 * t, 0, HIP_Z - drop + 2.4 * t)
    p["hipL"] = (-1.0 * t, HIP_Y, HIP_Z - drop + 2.4 * t)
    p["hipR"] = (-1.0 * t, -HIP_Y, HIP_Z - drop + 2.4 * t)
    p["shoL"] = (-6.5 * t, SHO_Y, SHO_Z - (SHO_Z - 3.0) * t)
    p["shoR"] = (-6.5 * t, -SHO_Y, SHO_Z - (SHO_Z - 3.0) * t)
    p["neck"] = (-7.5 * t, 0, NECK_Z - (NECK_Z - 3.4) * t)
    p["head"] = (-10.0 * t, 0, HEAD_Z - (HEAD_Z - 3.8) * t)
    p["ankL"] = (4.5 * t, ANK_Y + 1.0 * t, 1.2)
    p["kneeL"] = (2.0 * t, HIP_Y + 0.5 * t, 6.0 - 3.6 * t)
    p["toeL"] = (6.5 * t, ANK_Y + 1.0 * t, 0.9)
    p["ankR"] = (3.0 * t, -ANK_Y - 1.5 * t, 1.2)
    p["kneeR"] = (1.0 * t, -HIP_Y - 1.0 * t, 6.0 - 3.4 * t)
    p["toeR"] = (5.0 * t, -ANK_Y - 1.5 * t, 0.9)
    p["elbL"] = (-5.0 * t, SHO_Y + 2.5 * t, 15.5 - 12.5 * t)
    p["handL"] = (-2.0 * t, SHO_Y + 4.5 * t, 12.0 - 10.8 * t)
    p["elbR"] = (-5.0 * t, -SHO_Y - 2.5 * t, 15.5 - 12.5 * t)
    p["handR"] = (-2.0 * t, -SHO_Y - 4.5 * t, 12.0 - 10.8 * t)
    p["face"] = "hurt" if f == 2 else "neutral"
    return p


def pose_getup(f: int) -> dict:
    # reverse of the fall, with the body pushing up on the arms
    q = pose_fall([2, 1, 0][f])
    if f == 1:
        q["handL"] = (-3.0, SHO_Y + 3.0, 0.8)
        q["handR"] = (-3.0, -SHO_Y - 3.0, 0.8)
    return q


def pose_jump(f: int) -> dict:
    """Header/jump: 0 crouch, 1 in the air, 2 landing."""
    p = base_pose()
    if f == 0:
        for k in list(p.keys()):
            if isinstance(p[k], tuple):
                x, y, z = p[k]
                p[k] = (x, y, z * 0.85)
        _arm(p, "L", -2.5, -1.5, 1.0)
        _arm(p, "R", -2.5, -1.5, 1.0)
        p["lean"] = 1.5
    elif f == 1:
        for k in list(p.keys()):
            if isinstance(p[k], tuple):
                x, y, z = p[k]
                p[k] = (x, y, z + 5.0)
        _leg(p, "L", -1.0, 3.5, bend=-1.0)
        _leg(p, "R", -1.5, 4.5, bend=-1.2)
        for k in ("ankL", "ankR", "kneeL", "kneeR", "toeL", "toeR"):
            x, y, z = p[k]
            p[k] = (x, y, z + 5.0)
        _arm(p, "L", -1.0, 4.0, 2.0)
        _arm(p, "R", -1.0, 4.0, 2.0)
        for k in ("elbL", "elbR", "handL", "handR"):
            x, y, z = p[k]
            p[k] = (x, y, z + 5.0)
        p["lean"] = 2.0
    else:
        for k in list(p.keys()):
            if isinstance(p[k], tuple):
                x, y, z = p[k]
                p[k] = (x, y, z * 0.92)
        _arm(p, "L", 0.5, 1.0, 1.5)
        _arm(p, "R", 0.5, 1.0, 1.5)
    return p


def pose_celebrate(f: int) -> dict:
    """Arms up, jumping with joy (frames 1 and 2 in the air)."""
    p = base_pose()
    air = [0.0, 3.0, 4.5, 1.5][f]
    for k in list(p.keys()):
        if isinstance(p[k], tuple):
            x, y, z = p[k]
            p[k] = (x, y, z + air)
    spread = [3.0, 4.0, 4.5, 3.5][f]
    p["elbL"] = (0.5, SHO_Y + spread * 0.7, SHO_Z + 3.0 + air)
    p["handL"] = (0.8, SHO_Y + spread, SHO_Z + 7.5 + air)
    p["elbR"] = (0.5, -SHO_Y - spread * 0.7, SHO_Z + 3.0 + air)
    p["handR"] = (0.8, -SHO_Y - spread, SHO_Z + 7.5 + air)
    if air > 1.0:
        _leg(p, "L", 0.5, 1.5 + air * 0.4, bend=-0.6)
        _leg(p, "R", -0.5, 1.5 + air * 0.4, bend=-0.6)
        for k in ("ankL", "ankR", "kneeL", "kneeR", "toeL", "toeR"):
            x, y, z = p[k]
            p[k] = (x, y, z + air)
    p["face"] = "happy"
    return p


def pose_sad(f: int) -> dict:
    p = base_pose()
    for k in ("neck", "head", "shoL", "shoR"):
        x, y, z = p[k]
        p[k] = (x + 1.0, y, z - 1.2 - 0.3 * f)
    p["head"] = (2.0, 0, HEAD_Z - 2.6 - 0.3 * f)
    _arm(p, "L", 0.4, -1.0, -0.4)
    _arm(p, "R", 0.4, -1.0, -0.4)
    p["face"] = "sad"
    p["lean"] = 1.0
    return p


def pose_dive(f: int, side: str = "L") -> dict:
    """Goalkeeper dive to the character's left (+y) or right (-y)."""
    s = 1 if side == "L" else -1
    p = base_pose()
    h = [7.0, 9.0, 4.5][f]          # height of the pelvis
    reach = [6.0, 12.0, 11.0][f]     # how far the hands go
    p["pelvis"] = (0, 0, h)
    p["hipL"] = (0, HIP_Y, h)
    p["hipR"] = (0, -HIP_Y, h)
    p["shoL"] = (0.3, 5.5 * s, h + 2.5)
    p["shoR"] = (0.3, 4.5 * s if s > 0 else -4.5, h + 1.0) if False else (0.3, 3.0 * s, h + 0.5)
    p["neck"] = (0.4, 7.0 * s, h + 2.8)
    p["head"] = (0.5, 9.5 * s, h + 3.6)
    p["elbL"] = (0.6, (9.0 if s > 0 else 8.0) * s, h + 5.0 if s > 0 else h + 2.0)
    p["handL"] = (0.8, reach * s, h + 6.0 if s > 0 else h + 2.5)
    p["elbR"] = (0.6, (8.0 if s > 0 else 9.0) * s, h + 2.0 if s > 0 else h + 5.0)
    p["handR"] = (0.8, reach * s, h + 2.5 if s > 0 else h + 6.0)
    p["ankL"] = (-0.5, -5.0 * s, max(1.2, h - 5.5))
    p["kneeL"] = (0.5, -2.5 * s, h - 2.0)
    p["toeL"] = (-1.5, -6.5 * s, max(1.0, h - 6.0))
    p["ankR"] = (0.5, -7.0 * s, max(1.2, h - 4.0))
    p["kneeR"] = (1.0, -4.0 * s, h - 1.0)
    p["toeR"] = (0.0, -8.8 * s, max(1.0, h - 4.5))
    p["face"] = "focus"
    return p


def pose_catch(f: int) -> dict:
    p = base_pose()
    up = [1.0, 3.0][f]
    p["elbL"] = (2.5, SHO_Y + 0.5, SHO_Z - 2.5 + up * 0.5)
    p["handL"] = (4.2, 1.8, SHO_Z - 2.0 + up)
    p["elbR"] = (2.5, -SHO_Y - 0.5, SHO_Z - 2.5 + up * 0.5)
    p["handR"] = (4.2, -1.8, SHO_Z - 2.0 + up)
    _leg(p, "L", 0.8, 0.0)
    _leg(p, "R", -0.8, 0.0)
    p["lean"] = 1.0
    p["face"] = "focus"
    return p


def pose_set(f: int) -> dict:
    """Goalkeeper ready stance: knees bent, hands low and wide."""
    p = base_pose()
    for k in list(p.keys()):
        if isinstance(p[k], tuple):
            x, y, z = p[k]
            p[k] = (x, y, z * 0.9)
    sway = 0.6 * math.sin(math.pi * f / 2)
    _leg(p, "L", 0.5, 0.0, bend=1.6)
    _leg(p, "R", 0.5, 0.0, bend=1.6)
    p["ankL"] = (0.5, ANK_Y + 1.6, 1.4)
    p["ankR"] = (0.5, -ANK_Y - 1.6, 1.4)
    p["toeL"] = (2.7, ANK_Y + 1.6, 0.6)
    p["toeR"] = (2.7, -ANK_Y - 1.6, 0.6)
    p["elbL"] = (2.0, SHO_Y + 2.0, 13.0)
    p["handL"] = (3.5 + sway, SHO_Y + 3.0, 9.5)
    p["elbR"] = (2.0, -SHO_Y - 2.0, 13.0)
    p["handR"] = (3.5 - sway, -SHO_Y - 3.0, 9.5)
    p["lean"] = 2.5
    p["face"] = "focus"
    return p


# animation name -> (frame count, pose function, fps, loop)
ANIMS = {
    "idle": (4, pose_idle, 4, True),
    "walk": (6, pose_walk, 8, True),
    "run": (8, pose_run, 12, True),
    "sprint": (8, lambda f: pose_run(f, 8, True), 15, True),
    "kick": (4, pose_kick, 14, False),
    "tackle": (3, pose_tackle, 12, False),
    "slide": (4, pose_slide, 10, False),
    "fall": (3, pose_fall, 10, False),
    "getup": (3, pose_getup, 8, False),
    "jump": (3, pose_jump, 9, False),
    "celebrate": (4, pose_celebrate, 7, True),
    "sad": (2, pose_sad, 2, True),
    "set": (4, pose_set, 4, True),
    "catch": (2, pose_catch, 10, False),
    "dive_l": (3, lambda f: pose_dive(f, "L"), 10, False),
    "dive_r": (3, lambda f: pose_dive(f, "R"), 10, False),
}

# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

def rotate(pt, ang_deg: float):
    a = math.radians(ang_deg)
    c, s = math.cos(a), math.sin(a)
    x, y, z = pt
    return (c * x - s * y, s * x + c * y, z)


SCALE = 1.42


def project(pt):
    x, y, z = pt
    sx = CENTER_X + x * SCALE
    sy = FEET_Y - z * ZF * SCALE + y * YF * SCALE
    depth = y * 1.0 + z * 0.01
    return sx, sy, depth


def _apply_lean(p: dict, lean: float) -> dict:
    """Tilt the upper body forward (positive) or back (negative)."""
    if abs(lean) < 0.01:
        return p
    q = dict(p)
    for k in ("neck", "head", "shoL", "shoR", "elbL", "elbR", "handL", "handR"):
        x, y, z = q[k]
        f = (z - HIP_Z) / (HEAD_Z - HIP_Z)
        q[k] = (x + lean * max(0.0, f), y, z - abs(lean) * 0.12 * max(0.0, f))
    return q


def draw_figure(cv: Canvas, pose: dict, ang: float, look: Look, rnd: random.Random):
    pose = _apply_lean(pose, pose.get("lean", 0.0))
    R = lambda k: rotate(pose[k], ang)
    P = lambda k: project(R(k))

    def seg(a, b, r0, r1, mat, mat_fn=None):
        x0, y0, d0 = P(a)
        x1, y1, d1 = P(b)
        cv.capsule(x0, y0, x1, y1, r0 * SCALE, r1 * SCALE, mat, d0, d1, mat_fn)

    # legs: thigh (shorts), knee (skin), shin (socks), boot
    for side in ("L", "R"):
        hip, knee, ank, toe = "hip" + side, "knee" + side, "ank" + side, "toe" + side
        seg(hip, knee, 2.15, 1.75, "shorts")
        kx, ky, kd = P(knee)
        cv.disc(kx, ky, 1.55 * SCALE, "skin", kd)          # knee shows between shorts and socks
        seg(knee, ank, 1.6, 1.3, "socks" if side == "L" else "socks2", lambda t, sd=side: ("skin" if t < 0.22 else ("socks" if sd == "L" else "socks2")))
        seg(ank, toe, 1.35, 1.2, "boots")

    # torso as z-slices so kit patterns live in model space
    pel = pose["pelvis"]
    nk = pose["neck"]
    slices = 14
    for i in range(slices + 1):
        t = i / slices
        cx = pel[0] + (nk[0] - pel[0]) * t
        cz = pel[2] + (nk[2] - pel[2]) * t
        # width: narrow hips, wide shoulders, then narrows to the neck
        wy = 3.2 + 1.5 * min(1.0, t * 1.35) - (max(0.0, t - 0.88) * 9.0)
        wx = 2.3 + 0.4 * t
        step = 0.5
        yy = -wy
        while yy <= wy + 1e-6:
            xx = -wx
            while xx <= wx + 1e-6:
                if (xx / wx) ** 2 + (yy / wy) ** 2 <= 1.0:
                    mat = kit_material(look.pattern, xx, yy, t, look.keeper)
                    if t > 0.955 and (xx / wx) ** 2 + (yy / wy) ** 2 > 0.45:
                        mat = "jersey2" if not look.keeper else "gloves"      # collar ring
                    elif t < 0.06:
                        mat = "shorts"                                        # tucked hem
                    sx, sy, d = project(rotate((cx + xx, yy, cz), ang))
                    cv.put(int(math.floor(sx)), int(math.floor(sy)), mat, d)
                    cv.put(int(math.floor(sx + 0.5)), int(math.floor(sy + 0.5)), mat, d)
                xx += step
            yy += step
    # shoulders as small caps
    for side in ("L", "R"):
        x, y, d = P("sho" + side)
        cv.disc(x, y, 1.9 * SCALE, kit_material(look.pattern, 0, SHO_Y * (1 if side == "L" else -1), 1.0, look.keeper), d)

    # arms: sleeve (jersey, with a cuff) to elbow, skin to hand
    for side in ("L", "R"):
        sho, elb, hand = "sho" + side, "elb" + side, "hand" + side
        sleeve = "jersey" if not look.keeper else "keeper"
        cuff = "jersey2" if not look.keeper else "gloves"
        seg(sho, elb, 1.8, 1.45, sleeve, lambda t, sl=sleeve, cf=cuff: (cf if t > 0.82 else sl))
        seg(elb, hand, 1.3, 1.2, "skin" if not look.keeper else "gloves")

    # neck + head
    seg("neck", "head", 1.4, 1.4, "skin")
    hx, hy, hd = P("head")
    cv.disc(hx, hy, HEAD_R * SCALE, "skin", hd, squash=1.06)
    draw_hair(cv, pose, ang, look, rnd)
    draw_face(cv, pose, ang, look)


def kit_material(pattern: str, xx: float, yy: float, t: float, keeper: bool) -> str:
    if keeper:
        return "keeper"
    if pattern == "plain":
        return "jersey"
    if pattern == "stripes":
        return "jersey2" if int(math.floor((yy + 10) / 1.6)) % 2 == 0 else "jersey"
    if pattern == "hoops":
        return "jersey2" if int(math.floor(t * 7)) % 2 == 1 else "jersey"
    if pattern == "sash":
        return "jersey2" if abs((yy * 0.9) - (t - 0.5) * 7.0) < 1.1 else "jersey"
    if pattern == "halves":
        return "jersey2" if yy < 0 else "jersey"
    if pattern == "spots":
        gx = int(math.floor((yy + 10) / 2.2))
        gz = int(math.floor(t * 6.5))
        return "jersey2" if ((gx * 7 + gz * 13) % 5 == 0) else "jersey"
    return "jersey"


def draw_hair(cv: Canvas, pose: dict, ang: float, look: Look, rnd: random.Random):
    hx0, hy0, hz0 = pose["head"]
    style = look.hair
    if style == "afro":
        c = rotate((hx0 - 1.6, hy0, hz0 + 1.6), ang)
        sx, sy, d = project(c)
        cv.disc(sx, sy, (HEAD_R + 1.1) * SCALE, "hair", d - 0.35)
        # fuzzy rim
        for k in range(14):
            a = rnd.random() * math.tau
            r = (HEAD_R + 1.2 + rnd.random() * 0.9) * SCALE
            cv.put(int(sx + math.cos(a) * r), int(sy + math.sin(a) * r * 0.9), "hair", d - 0.35)
    elif style == "fade":
        c = rotate((hx0 - 1.6, hy0, hz0 + 2.3), ang)
        sx, sy, d = project(c)
        cv.disc(sx, sy, (HEAD_R - 0.5) * SCALE, "hair", d - 0.3, squash=0.75)
    elif style == "braids":
        c = rotate((hx0 - 1.7, hy0, hz0 + 1.7), ang)
        sx, sy, d = project(c)
        cv.disc(sx, sy, (HEAD_R - 0.1) * SCALE, "hair", d - 0.3)
        # two braids hanging behind
        for side in (1, -1):
            b0 = rotate((hx0 - 2.5, hy0 + 2.0 * side, hz0 - 0.5), ang)
            b1 = rotate((hx0 - 3.5, hy0 + 2.6 * side, hz0 - 4.5), ang)
            x0, y0, d0 = project(b0)
            x1, y1, d1 = project(b1)
            cv.capsule(x0, y0, x1, y1, 0.9 * SCALE, 0.8 * SCALE, "hair", d0 - 0.4, d1 - 0.4)
    elif style == "wrap":
        c = rotate((hx0 - 1.5, hy0, hz0 + 1.9), ang)
        sx, sy, d = project(c)
        cv.disc(sx, sy, (HEAD_R + 0.3) * SCALE, "wrap", d - 0.3)
        k = rotate((hx0 - 3.0, hy0 + 2.5, hz0 + 3.0), ang)
        kx, ky, kd = project(k)
        cv.disc(kx, ky, 1.4 * SCALE, "wrap", kd - 0.3)
    else:  # short: a cap of hair on the top and back of the skull, the face stays clear
        c = rotate((hx0 - 1.9, hy0, hz0 + 2.1), ang)
        sx, sy, d = project(c)
        cv.disc(sx, sy, (HEAD_R - 0.6) * SCALE, "hair", d - 0.3, squash=0.85)
        c2 = rotate((hx0 - 2.6, hy0, hz0 + 0.4), ang)
        sx2, sy2, d2 = project(c2)
        cv.disc(sx2, sy2, (HEAD_R - 1.4) * SCALE, "hair", d2 - 0.3, squash=0.9)


def draw_face(cv: Canvas, pose: dict, ang: float, look: Look):
    """Eyes when the face is turned toward the camera."""
    fx, fy, fz = rotate((1, 0, 0), ang)
    if fy < 0.25:      # facing away or sideways-away: no eyes
        return
    hx, hy, hz = pose["head"]
    face = pose.get("face", "neutral")
    eye_z = hz + 0.5
    lat = 1.7 if fy > 0.8 else 1.3
    for side in (1, -1):
        if fy < 0.8 and side * fx < 0:   # on the far side of a 3/4 face only one eye shows well
            continue
        e = rotate((hx + HEAD_R * 0.72, hy + lat * side, eye_z), ang)
        sx, sy, d = project(e)
        col = (28, 16, 22)
        white = (236, 228, 214)
        cv.put_rgb(int(sx), int(sy), col, d + 0.5)
        cv.put_rgb(int(sx), int(sy) + 1, col, d + 0.5)
        # a touch of white beside the pupil and a brow above
        cv.put_rgb(int(sx) + (1 if side > 0 else -1), int(sy) + 1, white, d + 0.5)
        cv.put_rgb(int(sx), int(sy) - 2, (60, 36, 30), d + 0.5)
    # mouth
    mm = rotate((hx + HEAD_R * 0.85, hy, eye_z - 2.2), ang)
    mx, my, md = project(mm)
    if face == "neutral" and fy > 0.8:
        cv.put_rgb(int(mx), int(my), (110, 60, 56), md + 0.5)
    if face == "happy":
        m = rotate((hx + HEAD_R * 0.8, hy, eye_z - 2.2), ang)
        sx, sy, d = project(m)
        cv.put_rgb(int(sx), int(sy), (120, 40, 50), d + 0.5)
        cv.put_rgb(int(sx) + 1, int(sy), (120, 40, 50), d + 0.5)
    elif face == "sad":
        m = rotate((hx + HEAD_R * 0.8, hy, eye_z - 2.4), ang)
        sx, sy, d = project(m)
        cv.put_rgb(int(sx), int(sy) + 1, (120, 40, 50), d + 0.5)


# ---------------------------------------------------------------------------
# Sheet assembly
# ---------------------------------------------------------------------------

def load_palette():
    with open(os.path.join(HERE, "palettes.json"), "r", encoding="utf-8") as f:
        return json.load(f)


def materials_from_keys(keys: dict) -> list:
    mats = []
    for name, tones in keys.items():
        mats.append(Material(name, hex2rgb(tones[0]), hex2rgb(tones[1]), hex2rgb(tones[2])))
    return mats


def render_frame(anim: str, frame: int, direction: str, look: Look, keys: dict, seed: int = 7) -> Image.Image:
    cv = Canvas(CELL, CELL)
    for m in materials_from_keys(keys):
        cv.add_material(m)
    n, fn, fps, loop = ANIMS[anim]
    pose = fn(frame)
    rnd = random.Random(seed * 131 + frame)
    draw_figure(cv, pose, DIR_ANGLE[direction], look, rnd)
    cv.shade()
    cv.inner_lines(pairs=[("skin", "jersey"), ("skin", "jersey2"), ("skin", "keeper"), ("shorts", "socks"), ("socks", "boots"), ("shorts", "socks2"), ("socks2", "boots"), ("jersey", "shorts"), ("jersey2", "shorts"), ("keeper", "shorts")])
    cv.outline()
    return cv.to_image()


def build_sheet(look: Look, keys: dict, anims=None):
    """Returns (image, meta). Rows = 8 directions, columns = concatenated animation frames."""
    anims = anims or list(ANIMS.keys())
    total = sum(ANIMS[a][0] for a in anims)
    img = Image.new("RGBA", (total * CELL, len(DIRS) * CELL), (0, 0, 0, 0))
    meta = {"cell": CELL, "dirs": DIRS, "feet_y": FEET_Y, "anims": {}}
    col = 0
    for a in anims:
        n, fn, fps, loop = ANIMS[a]
        meta["anims"][a] = {"start": col, "frames": n, "fps": fps, "loop": loop}
        for f in range(n):
            for r, d in enumerate(DIRS):
                fr = render_frame(a, f, d, look, keys)
                img.paste(fr, ((col + f) * CELL, r * CELL))
        col += n
    return img, meta


def preview_sheet(img: Image.Image, scale: int = 3, cols: int = 16) -> Image.Image:
    """Nearest-neighbour upscale on a neutral laterite background for review."""
    bg = Image.new("RGBA", img.size, (171, 84, 54, 255))
    bg.alpha_composite(img)
    return bg.resize((img.width * scale, img.height * scale), Image.NEAREST)


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "art", "previews"))
    ap.add_argument("--hair", default="short")
    ap.add_argument("--pattern", default="plain")
    ap.add_argument("--keeper", action="store_true")
    ap.add_argument("--anims", default="")
    ap.add_argument("--real", action="store_true", help="use a real team palette instead of key colours")
    args = ap.parse_args()
    pal = load_palette()
    keys = pal["real_preview"] if args.real else pal["keys"]
    look = Look(hair=args.hair, pattern=args.pattern, keeper=args.keeper)
    anims = args.anims.split(",") if args.anims else None
    img, meta = build_sheet(look, keys, anims)
    os.makedirs(args.out, exist_ok=True)
    name = f"rig_{args.hair}_{args.pattern}{'_gk' if args.keeper else ''}"
    img.save(os.path.join(args.out, name + ".png"))
    preview_sheet(img).save(os.path.join(args.out, name + "_x3.png"))
    with open(os.path.join(args.out, name + ".json"), "w") as f:
        json.dump(meta, f, indent=1)
    print("wrote", name, img.size)


def lighten_hex(h: str) -> str:
    from pixel import lighten
    r, g, b = lighten(hex2rgb(h))
    return "#%02X%02X%02X" % (r, g, b)


def darken_hex(h: str) -> str:
    from pixel import darken
    r, g, b = darken(hex2rgb(h))
    return "#%02X%02X%02X" % (r, g, b)
