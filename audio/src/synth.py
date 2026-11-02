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
import shutil
import struct
import subprocess
import wave

import numpy as np

try:  # optional: vectorised IIR filters (same maths as the pure-python loops below)
    from scipy.signal import lfilter as _lfilter
except Exception:  # pragma: no cover
    _lfilter = None

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
    if _lfilter is not None:
        # y[i] = y[i-1] + a * (x[i] - y[i-1])  ==  y[i] = a*x[i] + (1-a)*y[i-1]
        return _lfilter([a], [1.0, a - 1.0], np.asarray(x, dtype=float))
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def resonant_bp(x: np.ndarray, freq: float, q: float, sr: int = SR) -> np.ndarray:
    """Constant-peak-gain biquad band-pass (RBJ cookbook): a vowel formant or a drum body."""
    w0 = 2 * math.pi * freq / sr
    alpha = math.sin(w0) / (2 * q)
    b = np.array([alpha, 0.0, -alpha])
    a = np.array([1 + alpha, -2 * math.cos(w0), 1 - alpha])
    b, a = b / a[0], a / a[0]
    if _lfilter is not None:
        return _lfilter(b, a, np.asarray(x, dtype=float))
    y = np.zeros(len(x))
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        y[i] = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
        x2, x1 = x1, x[i]
        y2, y1 = y1, y[i]
    return y


def normalise(x: np.ndarray, peak: float = 0.8) -> np.ndarray:
    m = float(np.max(np.abs(x))) or 1.0
    return x / m * peak


def fold_loop(out: np.ndarray, n: int, fade_s: float) -> np.ndarray:
    """Make a seamless loop of the first `n` samples: whatever rings past the end (the tail
    rendered after `n`) is cross-faded into the start, so decays and reverbs wrap around."""
    fade = min(int(fade_s * SR), len(out) - n)
    loop = out[:n].copy()
    if fade > 0:
        ramp = np.linspace(0, 1, fade)
        loop[:fade] = loop[:fade] * ramp + out[n:n + fade] * (1 - ramp)
    return loop


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


# ---------------------------------------------------------------------------
# Stadium crowd layers (original synthesis; loop-friendly, ~8 s each)
# ---------------------------------------------------------------------------

def hand_clap(seed: int, bright: float = 1.0) -> np.ndarray:
    """One pair of hands: a short noise burst with a hollow 1-3 kHz body."""
    n = int(0.06 * SR)
    nz = noise(n, seed)
    body = resonant_bp(nz, 1400 + 900 * bright, 1.8) + 0.5 * resonant_bp(nz, 2600 + 600 * bright, 2.5)
    return body * env(n, 0.001, 0.035) * 1.4


def crowd_clap(rs: np.random.RandomState, hands: int = 40, spread: float = 0.03, seed: int = 0) -> np.ndarray:
    """A whole stand clapping once: many hands slightly out of time."""
    n = int((0.07 + spread) * SR)
    out = np.zeros(n)
    for h in range(hands):
        start = int(abs(rs.normal(0.0, spread / 2.5)) * SR)
        clap = hand_clap(seed * 1000 + h, rs.uniform(0.6, 1.2)) * rs.uniform(0.4, 1.0)
        ln = min(len(clap), n - start)
        out[start:start + ln] += clap[:ln]
    return out / math.sqrt(hands)


def crowd_claps(bpm: float = 120.0, bars: int = 4):
    """Rhythmic stadium clapping: two claps per beat, the first one heavier, over a murmur."""
    beat = 60.0 / bpm
    n = int(beat * 4 * bars * SR)
    out = np.zeros(n + SR)
    rs = np.random.RandomState(41)

    def add(sig, at):
        i = int(at * SR)
        out[i:i + len(sig)] += sig[: max(0, len(out) - i)]

    k = 0
    for b in range(bars):
        for q in range(4):
            t0 = (b * 4 + q) * beat
            accent = 1.0 if q in (0, 2) else 0.8
            add(crowd_clap(rs, 56, 0.045, k) * accent, t0)
            add(crowd_clap(rs, 40, 0.055, k + 1) * 0.7, t0 + beat * 0.5)
            k += 2
    loop = fold_loop(out, n, 0.2)
    # soft saturation: a big crowd's claps smear into a dense "sheet" rather than a click
    loop = np.tanh(loop / (np.max(np.abs(loop)) or 1.0) * 2.5) / math.tanh(2.5)
    murmur = crowd_base(n / SR, 43, 0.55)
    fade = int(0.25 * SR)
    ramp = np.linspace(0, 1, fade)
    murmur[:fade] = murmur[:fade] * ramp + murmur[-fade:] * (1 - ramp)
    return normalise(loop * 0.9 + murmur * 0.35, 0.8)


def dundun(freq: float, length: float, seed: int, drop: float = 0.4) -> np.ndarray:
    """Low drum: a pitched hit whose pitch falls as the skin settles."""
    n = int(length * SR)
    t = np.arange(n) / SR
    f = freq * (1 + drop * np.exp(-t * 28))
    phase = 2 * math.pi * np.cumsum(f) / SR
    s = np.sin(phase) * env(n, 0.002, length * 0.9)
    s += 0.25 * np.sin(2 * phase) * env(n, 0.002, length * 0.3)
    s += lowpass(noise(n, seed), 900) * env(n, 0.001, 0.015) * 0.5
    return s


def djembe_tone(freq: float, length: float, seed: int) -> np.ndarray:
    """Open tone of a djembe: a round mid note with a little skin noise."""
    n = int(length * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.25 * np.exp(-t * 60))
    s = np.sin(2 * math.pi * np.cumsum(f) / SR) * env(n, 0.002, length * 0.8)
    s += resonant_bp(noise(n, seed), freq * 2.2, 6.0) * env(n, 0.001, 0.04) * 0.6
    return s


def djembe_slap(freq: float, length: float, seed: int) -> np.ndarray:
    """Slap: sharp, bright, more noise than tone (200-400 Hz body, 2-5 kHz crack)."""
    n = int(length * SR)
    nz = noise(n, seed)
    s = resonant_bp(nz, freq, 4.0) * env(n, 0.001, 0.08) * 2.0
    s += resonant_bp(nz, 3200, 2.0) * env(n, 0.0005, 0.02) * 1.2
    s += tone(freq, n) * env(n, 0.001, 0.05) * 0.5
    return s


def wood_tick(length: float = 0.05, pitch: float = 2200.0) -> np.ndarray:
    n = int(length * SR)
    return (tone(pitch, n, "tri") * 0.7 + tone(pitch * 1.52, n) * 0.3) * env(n, 0.0005, length * 0.7)


def crowd_tamtam(bars: int = 4):
    """Tam-tam section in 12/8: three drums (dundun, djembe tones, slaps) plus a bell line,
    a 3-against-2 feel, over a murmur. One bar = 12 eighths = 2 s, 4 bars = 8 s."""
    eighth = 2.0 / 12.0
    n = int(eighth * 12 * bars * SR)
    out = np.zeros(n + SR)

    def add(sig, at, gain=1.0):
        i = int(at * SR)
        out[i:i + len(sig)] += sig[: max(0, len(out) - i)] * gain

    # patterns over 12 eighths (index -> gain); the low drum carries the "2" (0 and 6),
    # the slaps carry the "3" (0, 4, 8 offset by one), the bell is a 12/8 timeline.
    low = {0: 1.0, 6: 0.9, 9: 0.5}
    low_fill = {0: 1.0, 2: 0.5, 3: 0.7, 6: 0.9, 8: 0.6, 10: 0.8}
    tones = {2: 0.8, 5: 0.6, 7: 0.9, 11: 0.7}
    slaps = {1: 0.9, 4: 0.7, 8: 1.0, 10: 0.5}
    bell = {0: 1.0, 2: 0.7, 4: 0.8, 5: 0.6, 7: 0.9, 9: 0.7, 10: 0.5}
    for b in range(bars):
        t0 = b * 12 * eighth
        lp = low_fill if b == bars - 1 else low
        for k, g in lp.items():
            add(dundun(72 if k % 6 == 0 else 85, 0.35, 300 + b * 12 + k) * g, t0 + k * eighth)
        for k, g in tones.items():
            add(djembe_tone(180 if k < 6 else 165, 0.18, 320 + b * 12 + k) * g * 0.6, t0 + k * eighth)
        for k, g in slaps.items():
            add(djembe_slap(300 if k % 2 else 260, 0.12, 340 + b * 12 + k) * g * 0.45, t0 + k * eighth)
        for k, g in bell.items():
            add(wood_tick(0.05, 1900 if k % 2 == 0 else 2400) * g * 0.35, t0 + k * eighth)
        # a few extra hands from the stands (ghost notes), never on the strong beats
        rs = np.random.RandomState(360 + b)
        for k in (3, 7, 11):
            if rs.rand() < 0.7:
                add(djembe_tone(200, 0.1, 380 + b * 12 + k) * 0.25, t0 + k * eighth + rs.uniform(-0.01, 0.01))
    loop = fold_loop(out, n, 0.3)
    murmur = crowd_base(n / SR, 45, 0.5)
    fade = int(0.25 * SR)
    ramp = np.linspace(0, 1, fade)
    murmur[:fade] = murmur[:fade] * ramp + murmur[-fade:] * (1 - ramp)
    return normalise(loop + murmur * 0.3, 0.8)


def vowel_voice(freq: float, length: float, seed: int, formants=((450, 8.0), (800, 10.0))) -> np.ndarray:
    """One shouting voice on an 'oh': a buzzy harmonic source plus breath noise, pushed
    through two resonant band-passes that stand in for the vowel's formants."""
    n = int(length * SR)
    t = np.arange(n) / SR
    rs = np.random.RandomState(seed)
    vib = 1 + 0.012 * np.sin(2 * math.pi * rs.uniform(4.5, 6.5) * t + rs.uniform(0, 6))
    phase = 2 * math.pi * np.cumsum(freq * vib) / SR
    src = np.zeros(n)
    for h in range(1, 9):
        src += np.sin(h * phase) / h
    src += rs.uniform(-1, 1, n) * 0.35
    out = np.zeros(n)
    for f, q in formants:
        out += resonant_bp(src, f * rs.uniform(0.93, 1.07), q)
    out += lowpass(src, 400) * 0.25
    return out * env(n, 0.05, 0.1, 0.85, 0.09)


def crowd_chant(bpm: float = 120.0, bars: int = 4, voices: int = 14):
    """A stand chanting a four-note 'oh-oh-oh-ooh' phrase (one bar each), many detuned
    voices slightly out of time, over a murmur."""
    beat = 60.0 / bpm
    n = int(beat * 4 * bars * SR)
    out = np.zeros(n + SR)
    phrase_a = [("A", 3, 0.0, 0.42), ("C", 4, 1.0, 0.42), ("A", 3, 2.0, 0.42), ("G", 3, 3.0, 0.8)]
    phrase_b = [("A", 3, 0.0, 0.42), ("C", 4, 1.0, 0.42), ("D", 4, 2.0, 0.42), ("A", 3, 3.0, 0.8)]
    rs = np.random.RandomState(51)
    for b in range(bars):
        t0 = b * 4 * beat
        phrase = phrase_b if b % 2 == 1 else phrase_a
        for note, octv, at, ln in phrase:
            for v in range(voices):
                f = nfreq(note, octv) * (2.0 if v % 5 == 0 else 1.0) * rs.uniform(0.975, 1.025)
                start = t0 + at * beat + rs.uniform(-0.035, 0.045)
                i = int(max(0.0, start) * SR)
                vs = vowel_voice(f, ln * rs.uniform(0.9, 1.1), 500 + b * 100 + v * 7 + int(at)) * rs.uniform(0.5, 1.0)
                out[i:i + len(vs)] += vs[: max(0, len(out) - i)]
    out /= math.sqrt(voices)
    loop = fold_loop(out, n, 0.25)
    murmur = crowd_base(n / SR, 47, 0.5)
    fade = int(0.25 * SR)
    ramp = np.linspace(0, 1, fade)
    murmur[:fade] = murmur[:fade] * ramp + murmur[-fade:] * (1 - ramp)
    return normalise(loop + murmur * 0.35, 0.8)


# ---------------------------------------------------------------------------
# Match music (original, placeholder quality): a makossa-flavoured track and a
# bikutsi-flavoured track. Both are sketches to be replaced by a composer.
# ---------------------------------------------------------------------------

def brass_stab(freqs, length: float) -> np.ndarray:
    """A horn-section stab: detuned saws through a low-pass with a short envelope."""
    n = int(length * SR)
    s = np.zeros(n)
    for f in freqs:
        for det in (0.994, 1.0, 1.007):
            s += tone(f * det, n, "saw")
    s = lowpass(s / (3 * len(freqs)), 2200)
    t = np.arange(n) / SR
    s = lowpass(s, 1200) + s * np.exp(-t * 12) * 0.8   # brighter at the attack
    return s * env(n, 0.012, length * 0.5, 0.35, 0.05)


def bell(freq: float, length: float) -> np.ndarray:
    """Cowbell-like: two detuned partials, fast decay."""
    n = int(length * SR)
    s = tone(freq, n, "square") * 0.5 + tone(freq * 1.48, n, "tri") * 0.5
    return bandpass(s, 500, 5000) * env(n, 0.001, length * 0.8)


def kick(freq: float = 60.0, length: float = 0.2) -> np.ndarray:
    n = int(length * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 1.5 * np.exp(-t * 35))
    s = np.sin(2 * math.pi * np.cumsum(f) / SR) * env(n, 0.001, length * 0.9)
    s += lowpass(noise(n, 61), 2000) * env(n, 0.001, 0.015) * 0.4
    return s


def music_makossa(bpm: float = 125.0, bars: int = 16):
    """Makossa-inspired dance loop: syncopated bass, off-beat guitar plucks on a Dm7-G7 vamp,
    horn stabs every fourth bar, shaker, congas and a bell pattern. 16 bars ~ 30.7 s."""
    beat = 60.0 / bpm
    step = beat / 4.0        # sixteenth
    bar = beat * 4
    n = int(bar * bars * SR)
    out = np.zeros(n + SR)

    def add(sig, at, gain=1.0):
        i = int(at * SR)
        out[i:i + len(sig)] += sig[: max(0, len(out) - i)] * gain

    # two-chord vamp: Dm7 (two bars) then G7 (two bars)
    chords = [("D", ["D", "F", "A", "C"], "A"), ("G", ["G", "B", "D", "F"], "D")]
    for b in range(bars):
        root, chord, fifth = chords[(b // 2) % 2]
        t0 = b * bar
        # bass in sixteenths: root 0, root 3, fifth 6, octave 8, root 10, seventh pickup 14
        bass_pat = [(0, root, 2, 0.9), (3, root, 2, 0.5), (6, fifth, 2, 0.6), (8, root, 3, 0.45),
                    (10, root, 2, 0.6), (12, fifth, 2, 0.45), (14, chord[3], 2, 0.5)]
        if b % 4 == 3:  # turnaround
            bass_pat = [(0, root, 2, 0.9), (3, root, 2, 0.5), (6, chord[1], 2, 0.5), (8, fifth, 2, 0.5),
                        (10, chord[3], 2, 0.5), (12, root, 3, 0.45), (14, fifth, 2, 0.5)]
        for k, note, octv, ln in bass_pat:
            add(bass(nfreq(note, octv), beat * ln), t0 + k * step, 0.9)
        # soft kick on 1 and the "and" of 2 (dance feel), lighter on 3
        add(kick(58, 0.18), t0, 0.7)
        add(kick(58, 0.15), t0 + beat * 1.5, 0.5)
        add(kick(58, 0.15), t0 + beat * 2.0, 0.4)
        # clean guitar-like plucks on the off-beats, arpeggiating the chord
        for k in range(8):
            if k % 2 == 1:
                note = chord[(k // 2 + b) % 4]
                add(pluck(nfreq(note, 4), beat * 0.4, 0.75), t0 + k * beat * 0.5, 0.32)
        # a double sixteenth pick-up before beat 3 and beat 1
        add(pluck(nfreq(chord[2], 4), beat * 0.2, 0.9), t0 + 7 * step, 0.22)
        add(pluck(nfreq(chord[0], 5), beat * 0.2, 0.9), t0 + 15 * step, 0.2)
        # melody fragment on the second bar of each chord
        if b % 2 == 1:
            mel = [chord[2], chord[3], chord[1], chord[2], chord[0]]
            for j, m in enumerate(mel):
                add(pluck(nfreq(m, 5), beat * 0.45, 0.9), t0 + beat * (0.5 + j * 0.5), 0.24)
        # horn stabs on bar 4 of each 4: three syncopated hits of the chord
        if b % 4 == 3:
            voicing = [nfreq(chord[0], 4), nfreq(chord[1], 4), nfreq(chord[2], 4), nfreq(chord[3], 4)]
            for k, ln in ((0, 0.35), (3, 0.3), (6, 0.5), (11, 0.3), (14, 0.2)):
                add(brass_stab(voicing, beat * ln), t0 + k * step, 0.5)
        # percussion: shaker on every 8th, congas tumbao-like, bell timeline
        for k in range(8):
            add(shaker(0.08, 700 + k + b * 8), t0 + k * beat * 0.5, 0.9 if k % 2 == 0 else 0.55)
        for k in (3, 7, 11, 15):
            add(shaker(0.05, 790 + k + b * 16), t0 + k * step, 0.3)
        add(conga(190, 0.2, 800 + b), t0 + beat * 1.0, 0.9)
        add(conga(250, 0.2, 801 + b), t0 + beat * 2.5, 0.7)
        add(conga(250, 0.2, 802 + b), t0 + beat * 3.0, 0.9)
        add(conga(170, 0.15, 803 + b), t0 + beat * 3.75, 0.6)
        for k in (0, 3, 6, 10, 12):
            add(bell(820, 0.09), t0 + k * step, 0.28 if k in (0, 6) else 0.18)
    loop = fold_loop(out, n, 0.08)
    return normalise(loop, 0.8)


def balafon(freq: float, length: float, seed: int) -> np.ndarray:
    """Short bright wooden-key note: fundamental + a hollow partial + a tiny mallet click."""
    n = int(length * SR)
    s = tone(freq, n) * env(n, 0.001, length * 0.7)
    s += tone(freq * 3.0, n) * env(n, 0.001, length * 0.25) * 0.35
    s += tone(freq * 2.0, n, "tri") * env(n, 0.001, length * 0.4) * 0.2
    s += lowpass(noise(n, seed), 4000) * env(n, 0.0005, 0.008) * 0.3
    return s


def claps_small(seed: int) -> np.ndarray:
    rs = np.random.RandomState(seed)
    return crowd_clap(rs, 8, 0.02, seed) * 1.2


def music_bikutsi(bpm: float = 140.0, bars: int = 36):
    """Bikutsi-inspired 6/8 loop at 140 bpm (dotted-quarter pulse): kick on 1 and 4,
    rim ticks on 3 and 6, claps on 2 and 5, a fast pentatonic balafon ostinato on
    every eighth and a bass pedal. 36 bars ~ 30.9 s."""
    pulse = 60.0 / bpm           # dotted quarter
    eighth = pulse / 3.0
    bar = eighth * 6
    n = int(bar * bars * SR)
    out = np.zeros(n + SR)

    def add(sig, at, gain=1.0):
        i = int(at * SR)
        out[i:i + len(sig)] += sig[: max(0, len(out) - i)] * gain

    # G major pentatonic ostinato, two-bar cells; the B cell lifts to the upper register
    cell_a = [("G", 4), ("B", 4), ("D", 5), ("B", 4), ("A", 4), ("D", 5), ("G", 4), ("B", 4), ("E", 5), ("D", 5), ("B", 4), ("A", 4)]
    cell_b = [("D", 5), ("E", 5), ("G", 5), ("E", 5), ("D", 5), ("B", 4), ("A", 4), ("B", 4), ("D", 5), ("E", 5), ("D", 5), ("B", 4)]
    cell_c = [("G", 4), ("A", 4), ("B", 4), ("D", 5), ("E", 5), ("D", 5), ("B", 4), ("D", 5), ("E", 5), ("G", 5), ("E", 5), ("D", 5)]
    for b in range(bars):
        t0 = b * bar
        phrase = (b // 4) % 3
        cell = (cell_a, cell_b, cell_c)[phrase]
        half = cell[: 6] if b % 2 == 0 else cell[6:]
        # balafon ostinato: one note per eighth, the on-pulse notes a touch louder; a second
        # balafon doubles an octave down on the pulse
        for k, (note, octv) in enumerate(half):
            g = 0.5 if k % 3 == 0 else 0.36
            add(balafon(nfreq(note, octv), 0.16, 900 + b * 6 + k), t0 + k * eighth, g)
            if k % 3 == 0:
                add(balafon(nfreq(note, octv - 1), 0.2, 950 + b * 6 + k), t0 + k * eighth, 0.22)
        # bass pedal on G, lifting to D (and E on the last phrase) in the fourth bar of each four
        root = "G"
        octv = 2
        if b % 4 == 3:
            root = "E" if phrase == 2 else "D"
        add(bass(nfreq(root, octv), pulse * 0.9), t0, 0.9)
        add(bass(nfreq(root, octv), pulse * 0.5), t0 + pulse, 0.6)
        add(bass(nfreq(root, octv + 1), eighth * 0.8), t0 + 5 * eighth, 0.4)
        # drums: kick 1 & 4, claps 2 & 5, rim 3 & 6, shaker all eighths
        add(kick(55, 0.22), t0, 0.95)
        add(kick(55, 0.2), t0 + 3 * eighth, 0.85)
        if b % 4 == 3:
            add(kick(55, 0.15), t0 + 5 * eighth, 0.5)
        add(claps_small(1000 + b * 2), t0 + 1 * eighth, 0.55)
        add(claps_small(1001 + b * 2), t0 + 4 * eighth, 0.55)
        add(wood_tick(0.04, 2600), t0 + 2 * eighth, 0.45)
        add(wood_tick(0.04, 2600), t0 + 5 * eighth, 0.45)
        for k in range(6):
            add(shaker(0.06, 1100 + b * 6 + k), t0 + k * eighth, 0.5 if k % 3 == 0 else 0.3)
        # a conga answer on the last bar of each 4
        if b % 4 == 3:
            for k, f in ((1, 240), (2, 240), (4, 180), (5, 240)):
                add(conga(f, 0.12, 1200 + b * 6 + k), t0 + k * eighth, 0.6)
    loop = fold_loop(out, n, 0.08)
    return normalise(loop, 0.8)


# Long loops ship as .ogg (converted with ffmpeg); short effects stay .wav.
OGG = {"crowd_loop", "goal", "music_loop", "crowd_claps", "crowd_tamtam", "crowd_chant", "music_makossa", "music_bikutsi"}


def to_ogg(wav_path: str) -> bool:
    """wav -> ogg (libvorbis q3) next to it, then remove the wav. False if ffmpeg is missing."""
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        return False
    ogg_path = wav_path[:-4] + ".ogg"
    subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", wav_path, "-c:a", "libvorbis", "-q:a", "3", ogg_path], check=True)
    os.remove(wav_path)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "..", "game", "assets", "audio"))
    ap.add_argument("--only", default="", help="comma-separated names to (re)build; default all")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    fx = {
        "kick_soft": kick_soft, "kick_hard": kick_hard, "bounce": bounce, "whistle_short": lambda: whistle(0.35, True),
        "whistle_long": whistle_long, "catch": catch, "tackle": tackle, "goal": goal_roar, "crowd_loop": crowd_loop,
        "ui_move": ui_move, "ui_select": ui_select, "post": post_hit, "music_loop": music_loop,
        # stadium layers and match music (see Sfx.crowd / Sfx.match_music in the game)
        "crowd_claps": crowd_claps, "crowd_tamtam": crowd_tamtam, "crowd_chant": crowd_chant,
        "music_makossa": music_makossa, "music_bikutsi": music_bikutsi,
    }
    only = [s for s in a.only.split(",") if s]
    for name, build in fx.items():
        if only and name not in only:
            continue
        data = build()
        path = os.path.join(a.out, name + ".wav")
        write_wav(path, data)
        ext = "wav"
        if name in OGG and to_ogg(path):
            ext = "ogg"
        size = os.path.getsize(os.path.join(a.out, name + "." + ext))
        print(name, round(len(data) / SR, 2), "s", ext, round(size / 1024), "KiB")


if __name__ == "__main__":
    main()
