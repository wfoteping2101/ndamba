"""Original synthesized sound effects and a music loop for NDAMBA (numpy -> WAV).

No recordings are used. Everything is built from oscillators, noise and envelopes so the
audio is licence-free. The music loop is a placeholder-quality original sketch inspired by
the rhythmic feel of makossa (a driving bass line and a bright guitar-like pluck on the
off-beats); a composer should replace it (see docs/research/REFERENCES_AND_LICENSES.md).

Run: python3 synth.py --out ../../game/assets/audio
"""
from __future__ import annotations

import argparse
import math
import os
import struct
import wave

import numpy as np

SR = 22050


def write_wav(path: str, data: np.ndarray, sr: int = SR):
    data = np.clip(data, -1.0, 1.0)
    pcm = (data * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def env(n: int, a: float, d: float, s: float = 0.0, r: float = 0.0, sr: int = SR) -> np.ndarray:
    t = np.arange(n) / sr
    total = n / sr
    e = np.ones(n) * s
    att = t < a
    e[att] = t[att] / max(a, 1e-6)
    dec = (t >= a) & (t < a + d)
    e[dec] = 1.0 - (1.0 - s) * (t[dec] - a) / max(d, 1e-6)
    rel = t > total - r
    if r > 0:
        e[rel] *= np.clip((total - t[rel]) / r, 0, 1)
    return e


def noise(n: int, seed: int = 1) -> np.ndarray:
    return np.random.RandomState(seed).uniform(-1, 1, n)


def lowpass(x: np.ndarray, cutoff: float, sr: int = SR) -> np.ndarray:
    rc = 1.0 / (2 * math.pi * cutoff)
    dt = 1.0 / sr
    a = dt / (rc + dt)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def bandpass(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return lowpass(x, hi) - lowpass(x, lo)


def tone(freq: float, n: int, shape: str = "sine", sr: int = SR) -> np.ndarray:
    t = np.arange(n) / sr
    if shape == "sine":
        return np.sin(2 * math.pi * freq * t)
    if shape == "square":
        return np.sign(np.sin(2 * math.pi * freq * t))
    if shape == "saw":
        return 2 * ((t * freq) % 1.0) - 1
    if shape == "tri":
        return 2 * np.abs(2 * ((t * freq) % 1.0) - 1) - 1
    return np.sin(2 * math.pi * freq * t)


# ---------------------------------------------------------------------------
# Effects
# ---------------------------------------------------------------------------

def kick_soft():
    n = int(0.12 * SR)
    thump = tone(95, n) * env(n, 0.002, 0.1)
    slap = lowpass(noise(n, 3), 1800) * env(n, 0.001, 0.04)
    return 0.7 * thump + 0.5 * slap


def kick_hard():
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    sweep = np.sin(2 * math.pi * (140 - 80 * t / 0.16) * t)
    thump = sweep * env(n, 0.001, 0.12)
    slap = lowpass(noise(n, 4), 3200) * env(n, 0.001, 0.05)
    return 0.8 * thump + 0.7 * slap


def bounce():
    n = int(0.09 * SR)
    return 0.6 * tone(110, n) * env(n, 0.002, 0.07) + 0.3 * lowpass(noise(n, 5), 1200) * env(n, 0.001, 0.03)


def whistle(length: float, trill: bool):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = 2650 + (220 * np.sin(2 * math.pi * 38 * t) if trill else 0)
    s = np.sin(2 * math.pi * f * t) * 0.5 + np.sin(2 * math.pi * f * 2.01 * t) * 0.12
    s += lowpass(noise(n, 6), 4500) * 0.08
    return s * env(n, 0.01, 0.02, 0.9, 0.06) * 0.6


def whistle_long():
    a = whistle(0.42, True)
    gap = np.zeros(int(0.08 * SR))
    b = whistle(0.42, True)
    c = whistle(0.7, True)
    return np.concatenate([a, gap, b, gap, c])


def catch():
    n = int(0.14 * SR)
    return 0.6 * lowpass(noise(n, 7), 900) * env(n, 0.002, 0.1) + 0.3 * tone(70, n) * env(n, 0.001, 0.08)


def tackle():
    n = int(0.22 * SR)
    return 0.55 * lowpass(noise(n, 8), 700) * env(n, 0.005, 0.18) + 0.4 * tone(60, n) * env(n, 0.001, 0.12)


def crowd_base(length: float, seed: int, intensity: float = 1.0) -> np.ndarray:
    """Murmur: many filtered noise voices with slow amplitude wander."""
    n = int(length * SR)
    rs = np.random.RandomState(seed)
    out = np.zeros(n)
    for v in range(10):
        nz = rs.uniform(-1, 1, n)
        band = bandpass(nz, 180 + v * 70, 900 + v * 180)
        wander = 0.5 + 0.5 * np.sin(2 * math.pi * (0.1 + 0.07 * v) * np.arange(n) / SR + rs.uniform(0, 6))
        out += band * wander
    out /= 10.0
    return out * intensity


def crowd_loop():
    n_len = 6.0
    s = crowd_base(n_len, 11, 0.9)
    # a few kids' shouts: short bandpassed bursts
    rs = np.random.RandomState(12)
    for k in range(9):
        start = int(rs.uniform(0.2, n_len - 0.4) * SR)
        ln = int(rs.uniform(0.12, 0.3) * SR)
        f = rs.uniform(500, 1100)
        t = np.arange(ln) / SR
        shout = np.sin(2 * math.pi * f * t * (1 + 0.1 * np.sin(2 * math.pi * 7 * t))) * env(ln, 0.02, 0.05, 0.6, 0.06)
        s[start:start + ln] += shout * 0.08
    # loop-friendly crossfade
    fade = int(0.25 * SR)
    ramp = np.linspace(0, 1, fade)
    s[:fade] = s[:fade] * ramp + s[-fade:] * (1 - ramp)
    return s[:-fade] * 0.7


def goal_roar():
    n = int(2.6 * SR)
    base = crowd_base(2.6, 21, 1.0)
    swell = env(n, 0.08, 0.6, 0.7, 1.2)
    rs = np.random.RandomState(22)
    s = base * swell * 1.6
    for k in range(18):
        start = int(rs.uniform(0.05, 1.6) * SR)
        ln = int(rs.uniform(0.2, 0.5) * SR)
        f = rs.uniform(400, 950)
        t = np.arange(ln) / SR
        s[start:start + ln] += np.sin(2 * math.pi * f * t * (1 + 0.06 * np.sin(2 * math.pi * 5 * t))) * env(ln, 0.03, 0.1, 0.6, 0.1) * 0.07
    # drums: a casserole band (chapter 8) joins the celebration
    for i in range(10):
        start = int((0.3 + i * 0.22) * SR)
        ln = int(0.1 * SR)
        if start + ln < n:
            s[start:start + ln] += lowpass(noise(ln, 30 + i), 2500) * env(ln, 0.002, 0.08) * 0.35
    return np.clip(s, -1, 1) * 0.9


def ui_move():
    n = int(0.05 * SR)
    return 0.3 * tone(660, n, "square") * env(n, 0.002, 0.04)


def ui_select():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    return 0.3 * np.sin(2 * math.pi * (520 + 300 * t / 0.12) * t) * env(n, 0.002, 0.1)


def post_hit():
    n = int(0.25 * SR)
    return 0.6 * tone(880, n, "tri") * env(n, 0.001, 0.2) + 0.3 * tone(1320, n) * env(n, 0.001, 0.1)


# ---------------------------------------------------------------------------
# Music sketch (original, placeholder quality)
# ---------------------------------------------------------------------------

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def nfreq(name: str, octave: int) -> float:
    semis = NOTE[name[0]] + (1 if len(name) > 1 and name[1] == "#" else 0)
    return 440.0 * 2 ** ((semis - 9) / 12 + (octave - 4))


def pluck(freq: float, length: float, bright: float = 0.6) -> np.ndarray:
    n = int(length * SR)
    s = tone(freq, n, "saw") * 0.5 + tone(freq * 2, n, "sine") * 0.3 * bright
    s = lowpass(s, 1800 + 2500 * bright)
    return s * env(n, 0.004, length * 0.6, 0.15, 0.03)


def bass(freq: float, length: float) -> np.ndarray:
    n = int(length * SR)
    s = tone(freq, n, "sine") * 0.8 + tone(freq, n, "tri") * 0.3
    return s * env(n, 0.005, length * 0.5, 0.4, 0.04)


def shaker(length: float, seed: int) -> np.ndarray:
    n = int(length * SR)
    return bandpass(noise(n, seed), 4000, 9000) * env(n, 0.003, 0.05) * 0.5


def conga(freq: float, length: float, seed: int) -> np.ndarray:
    n = int(length * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * math.pi * (freq * (1 + 0.4 * np.exp(-t * 40))) * t) * env(n, 0.002, 0.12)
    s += lowpass(noise(n, seed), 2000) * env(n, 0.001, 0.02) * 0.3
    return s


def music_loop(bpm: float = 118.0):
    beat = 60.0 / bpm
    bar = beat * 4
    bars = 8
    n = int(bar * bars * SR)
    out = np.zeros(n + SR)

    def add(sig, at):
        i = int(at * SR)
        out[i:i + len(sig)] += sig[: max(0, len(out) - i)]

    # chord progression (two bars each): C, Am, F, G in a bright major feel
    prog = [("C", ["C", "E", "G"]), ("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("G", ["G", "B", "D"])]
    for b in range(bars):
        root, chord = prog[(b // 2) % 4]
        t0 = b * bar
        # bass: driving, root on 1 and the "and" of 2, fifth on 4
        add(bass(nfreq(root, 2), beat * 0.9), t0)
        add(bass(nfreq(root, 2), beat * 0.45), t0 + beat * 1.5)
        add(bass(nfreq(chord[2], 2), beat * 0.45), t0 + beat * 3.0)
        add(bass(nfreq(root, 3), beat * 0.4), t0 + beat * 3.5)
        # guitar-like plucks on the off-beats (makossa feel), arpeggiated
        for k in range(8):
            if k % 2 == 1:
                note = chord[(k // 2) % 3]
                add(pluck(nfreq(note, 4), beat * 0.45, 0.7) * 0.35, t0 + k * beat * 0.5)
        # melody fragment every other bar
        if b % 2 == 1:
            mel = [chord[1], chord[2], chord[0], chord[2]]
            for k, m in enumerate(mel):
                add(pluck(nfreq(m, 5), beat * 0.5, 0.9) * 0.28, t0 + beat * (1.0 + k * 0.5))
        # percussion: shaker on every 8th, congas on 2 and 4 with pickups
        for k in range(8):
            add(shaker(0.08, 100 + k + b * 8) * (0.9 if k % 2 == 0 else 0.5), t0 + k * beat * 0.5)
        add(conga(180, 0.2, 200 + b), t0 + beat * 1.0)
        add(conga(240, 0.2, 201 + b), t0 + beat * 3.0)
        add(conga(240, 0.15, 202 + b) * 0.6, t0 + beat * 3.75)
    loop = out[:n]
    fade = int(0.05 * SR)
    ramp = np.linspace(0, 1, fade)
    loop[:fade] = loop[:fade] * ramp + out[n:n + fade] * (1 - ramp)
    peak = np.max(np.abs(loop)) or 1.0
    return loop / peak * 0.8


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "..", "game", "assets", "audio"))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    fx = {
        "kick_soft": kick_soft(), "kick_hard": kick_hard(), "bounce": bounce(), "whistle_short": whistle(0.35, True),
        "whistle_long": whistle_long(), "catch": catch(), "tackle": tackle(), "goal": goal_roar(), "crowd_loop": crowd_loop(),
        "ui_move": ui_move(), "ui_select": ui_select(), "post": post_hit(), "music_loop": music_loop(),
    }
    for name, data in fx.items():
        write_wav(os.path.join(a.out, name + ".wav"), data)
        print(name, round(len(data) / SR, 2), "s")


if __name__ == "__main__":
    main()
