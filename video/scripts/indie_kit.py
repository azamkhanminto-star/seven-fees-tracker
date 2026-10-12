"""Instruments for the dreamy-indie SEVEN music (used by compose-reel-indie.py and compose-runway-sting.py)."""
import numpy as np
from synth import *

_cache = {}
def guitar(m, d=1.4, bright=3200, damp=0.9965):
    """Clean electric guitar: Karplus-Strong string, picked with a soft attack."""
    key = (m, d, bright, damp)
    if key in _cache: return _cache[key]
    f = mtof(m); P = int(round(SR / f - 0.5)); n = int(d * SR)   # the loop filter adds half a sample
    y = np.zeros(n + P + 2)
    y[:P] = lp(rng.uniform(-1, 1, P * 3), bright)[:P]
    for i in range(P, n):                           # string loop, block-free but cached per note
        y[i] = damp * 0.5 * (y[i - P] + y[i - P - 1])
    y = hp(y[:n], 90)
    y = y / (np.abs(y).max() + 1e-9) * np.clip((d - tt(d)) / 0.08, 0, 1)
    _cache[key] = y * 0.4
    return _cache[key]

def bass_note(m, d):
    """Round picked bass: sine + a little 2nd harmonic, quick pluck then sustain."""
    t = tt(d); f = mtof(m)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6)
    x = np.tanh(1.6 * x) * (0.55 + 0.45 * np.exp(-t * 5))
    return x * np.minimum(1, t / 0.006) * np.clip((d - t) / 0.06, 0, 1) * 0.55

def soft_kick(g=1.0):
    d = 0.5; t = tt(d); f = 46 + 70 * np.exp(-t * 22)
    return np.tanh(1.4 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5)) * g

def rim_snare(g=1.0):
    """Big, soft indie snare (lots of room comes from the reverb send)."""
    d = 0.35; t = tt(d)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 22) * 0.5
    wires = bp(rng.standard_normal(len(t)), 1200, 6500) * np.exp(-t * 11) * 0.7
    return (body + wires) * g

def crash(d=2.5):
    t = tt(d)
    return hp(rng.standard_normal(len(t)), 5000, 2) * np.exp(-t * 1.8) * 0.25 * np.minimum(1, t / 0.004)

def shaker():
    d = 0.09; t = tt(d)
    return bp(rng.standard_normal(len(t)), 5000, 11000) * np.sin(np.pi * t / d) ** 2 * 0.22

def delay(L, R, secs, fb=0.38, mix=0.35):
    """Ping-pong echo (a dotted-eighth echo is the classic dreamy-guitar sound)."""
    k = int(secs * SR); outL = np.zeros_like(L); outR = np.zeros_like(R)
    srcL, srcR, g = L, R, mix
    for rep in range(6):
        sh = k * (rep + 1)
        if sh >= len(L): break
        a, b = (srcR, srcL) if rep % 2 == 0 else (srcL, srcR)   # bounce left/right
        outL[sh:] += a[:-sh] * g; outR[sh:] += b[:-sh] * g
        g *= fb
    return lp(outL, 4000), lp(outR, 4000)

