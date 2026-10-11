"""Tiny synthesiser toolkit for SEVEN's original video music (no samples, so fully owned)."""
import os
import wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
rng = np.random.default_rng(11)


def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(d): return np.arange(int(d * SR)) / SR
def lp(x, f, order=2): return sosfilt(butter(order, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, min(hi, SR / 2 - 200)], "band", fs=SR, output="sos"), x)
def saw(f, d, phase=0.0): return 2 * ((f * tt(d) + phase) % 1.0) - 1


class Bus:
    def __init__(self, n): self.L = np.zeros(n); self.R = np.zeros(n); self.n = n
    def add(self, x, at, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= self.n: return
        x = x[: self.n - i] * gain
        self.L[i:i + len(x)] += x * np.sqrt(0.5 * (1 - pan))
        self.R[i:i + len(x)] += x * np.sqrt(0.5 * (1 + pan))


def kick(gain=1.0):
    d = 0.42; t = tt(d); f = 45 + 95 * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    return np.tanh(1.6 * (body + hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 300) * 0.25)) * gain

def tom(pitch=90, d=0.6):
    t = tt(d); f = pitch * (1 + 0.6 * np.exp(-t * 18))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)
    skin = bp(rng.standard_normal(len(t)), 200, 1200) * np.exp(-t * 25) * 0.25
    return np.tanh(1.5 * (body + skin))

def tick():
    d = 0.05; t = tt(d)
    return (np.sin(2 * np.pi * 2600 * t) * 0.6 + hp(rng.standard_normal(len(t)), 4000) * 0.3) * np.exp(-t * 120)

def hat(open_=False):
    d = 0.18 if open_ else 0.05; t = tt(d)
    return hp(rng.standard_normal(len(t)), 7500, 4) * np.exp(-t * (18 if open_ else 70)) * 0.5

def snare(level=1.0):
    d = 0.16; t = tt(d)
    return (np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.4 + bp(rng.standard_normal(len(t)), 1500, 7000) * np.exp(-t * 24) * 0.6) * level

def braam(notes, d=1.8):
    """Trailer-style low brass hit: stacked detuned saws, filter opens then closes."""
    t = tt(d); x = np.zeros(len(t))
    for m in notes:
        for det in (-0.12, 0.0, 0.12):
            x += saw(mtof(m) * 2 ** (det / 12), d, rng.random())
    x /= len(notes) * 3
    out = np.zeros(len(t)); step = 1200
    for s in range(0, len(t), step):
        tc = s / SR; fc = 180 + 1800 * np.exp(-tc * 2.2) * min(1, tc / 0.08)
        out[s:s + step] = lp(x[s:s + step], fc, 2)
    return np.tanh(2.2 * out) * np.minimum(1, t / 0.02) * np.exp(-t * 1.3)

def pluck(m, d=0.22, bright=2500):
    t = tt(d); x = lp(saw(mtof(m), d) + 0.5 * saw(mtof(m) * 1.003, d, 0.3), bright, 2)
    return x * np.minimum(1, t / 0.002) * np.exp(-t * 16) * 0.35

def string_note(m, d, bright=1800):
    """Short bowed-string-like note for ostinatos."""
    t = tt(d); x = lp(saw(mtof(m), d) + saw(mtof(m) * 1.004, d, 0.5), bright, 2)
    return x * np.minimum(1, t / 0.012) * np.exp(-t * 7) * 0.3

def pad(notes, d, cutoff=1400, attack=0.6, release=0.4):
    t = tt(d); x = np.zeros(len(t))
    for m in notes:
        for det in (-0.08, 0.0, 0.08):
            x += saw(mtof(m) * 2 ** (det / 12), d, rng.random())
    x = lp(x / (len(notes) * 3), cutoff, 2)
    return x * np.minimum(1, t / attack) * np.clip((d - t) / release, 0, 1)

def drone(m, d, cutoff=300):
    t = tt(d)
    x = lp(saw(mtof(m), d) * 0.6 + np.sin(2 * np.pi * mtof(m) * t), cutoff, 2)
    return x * np.minimum(1, t / 1.0) * np.clip((d - t) / 0.3, 0, 1)

def bell(m, d=1.6):
    t = tt(d); f = mtof(m)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 8)
    return x * np.minimum(1, t / 0.003) * np.exp(-t * 2.4) * 0.3

def riser(d, lo=300, hi=6000):
    t = tt(d); n = rng.standard_normal(len(t)); out = np.zeros(len(t)); step = 2400
    for s in range(0, len(t), step):
        fc = lo * (hi / lo) ** (s / len(t))
        out[s:s + step] = bp(n[s:s + step], fc * 0.7, fc * 1.4)
    return out * (t / d) ** 2 * 0.5

def impact(d=2.2):
    t = tt(d)
    sub = np.sin(2 * np.pi * (38 + 40 * np.exp(-t * 6)) * t) * np.exp(-t * 1.6)
    return np.tanh(1.3 * (sub + lp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 3.5) * 0.35))

def reverb(x, secs=2.2, mix=0.25):
    t = tt(secs); ir = lp(rng.standard_normal(len(t)) * np.exp(-t * 2.8), 6000); ir /= np.sqrt(np.sum(ir ** 2))
    return fftconvolve(x, ir)[: len(x)] * mix

def master(L, R, dur, path, fade_in=0.8, fade_out=1.2):
    n = len(L); t = np.arange(n) / SR
    fade = np.clip(t / fade_in, 0, 1) ** 2 * np.clip((dur - t) / fade_out, 0, 1) ** 1.5
    L = hp(L, 28) * fade; R = hp(R, 28) * fade
    peak = max(np.abs(L).max(), np.abs(R).max())
    L, R = np.tanh(1.2 * L / peak) / np.tanh(1.2) * 0.89, np.tanh(1.2 * R / peak) / np.tanh(1.2) * 0.89
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.stack([L, R], axis=1) * 32767).astype(np.int16).tobytes())
    print(path, f"{dur:.1f}s")
