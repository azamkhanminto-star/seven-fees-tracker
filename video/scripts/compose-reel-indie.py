"""
Original 50-second "indie" music for the SEVEN reel (synthesised, royalty-free).
Style brief from the owner's reference: dreamy minimal indie. A clean, reverb-soaked electric
guitar figure, a warm bass, a "boom-boom" kick, half-time snare, soft "ooh" voices, a slow
build, then one big chord as the logo lands. The melody and parts are our own; only the
mood is borrowed.

  python3 scripts/compose-reel-indie.py   -> public/music/seven_reel_indie.wav

96 BPM, so one bar = 2.5 s and every scene in src/teaser/config.ts is exactly two bars:
each cut lands on a downbeat. Key A minor, chords Am F C G (one per bar).
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from synth import *

DUR = 50.0
N = int(SR * DUR)
BEAT = 60 / 96          # 0.625 s
BAR = 4 * BEAT          # 2.5 s
REVEAL = 45.0           # logo scene starts here (bar 18)
gtr, bass, drums, voc, fx = Bus(N), Bus(N), Bus(N), Bus(N), Bus(N)

# ── instruments
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

# ── harmony: one chord per bar, Am F C G (roots, voicing tones for the guitar figure)
CHORDS = [
    (45, [57, 64, 69, 72, 76]),   # Am
    (41, [53, 60, 65, 69, 72]),   # F
    (48, [55, 60, 64, 67, 72]),   # C
    (43, [55, 59, 62, 67, 71]),   # G
]
FIGURE = [0, 2, 3, 2, 4, 2, 3, 1]          # our guitar figure: index into the voicing, 8ths
EIGHTH = BEAT / 2
bars = int(REVEAL / BAR)                    # 18 bars of groove before the logo

for b in range(bars):
    t0 = b * BAR
    root, v = CHORDS[b % 4]
    sec = t0                                 # where are we in the reel
    # guitar: sparse quarter notes in the intro, the full figure from bar 2, octave double from 30 s
    if sec < 5:
        for k, idx in enumerate([0, 3, 2, 4]):
            gtr.add(guitar(v[idx], 1.6), t0 + k * BEAT, 0.8, pan=-0.15)
    else:
        for k, idx in enumerate(FIGURE):
            if b == bars - 1 and k >= 6: break               # leave the last beat silent: the breath
            gtr.add(guitar(v[idx], 1.2), t0 + k * EIGHTH, 0.75 if k % 2 == 0 else 0.6, pan=-0.15)
            if sec >= 30 and k % 2 == 0:
                gtr.add(guitar(v[idx] + 12, 0.9, bright=4500), t0 + k * EIGHTH + 0.012, 0.3, pan=0.3)
    # bass from 5 s: root on 1 (long), and on the "and" of 2, fifth on 4
    if sec >= 5:
        bass.add(bass_note(root, BEAT * 1.4), t0, 1.0)
        bass.add(bass_note(root, BEAT * 0.45), t0 + 1.5 * BEAT, 0.8)
        last = b == bars - 1
        if not last: bass.add(bass_note(root + 7, BEAT * 0.9), t0 + 3 * BEAT, 0.75)
    # kick "boom-boom" on 1 (with the and), from the start but soft; stronger later
    kg = 0.55 if sec < 5 else (0.8 if sec < 30 else 1.0)
    drums.add(soft_kick(kg), t0); drums.add(soft_kick(kg * 0.75), t0 + EIGHTH)
    if sec >= 30 and b != bars - 1: drums.add(soft_kick(0.8), t0 + 2.5 * BEAT)
    # half-time snare on 3 from 10 s
    if sec >= 10: drums.add(rim_snare(0.75 if sec < 30 else 0.95), t0 + 2 * BEAT)
    # hats (8ths) from 10 s, shaker 16ths from 30 s
    if sec >= 10:
        for k in range(8):
            if b == bars - 1 and k >= 6: break
            drums.add(hat(open_=(sec >= 30 and k % 2 == 1)), t0 + k * EIGHTH, 0.22 if k % 2 else 0.14, pan=0.25)
    if sec >= 30:
        for k in range(16):
            if b == bars - 1 and k >= 12: break
            drums.add(shaker(), t0 + k * EIGHTH / 2, 0.7 if k % 2 else 0.4, pan=-0.3)
    # soft "ooh" voices from 20 s (third USP), fuller from 30 s
    if sec >= 20:
        notes = [v[0], v[2], v[3]] if sec < 30 else [v[0], v[2], v[3], v[4]]
        dd = BAR if b != bars - 1 else BAR - BEAT
        voc.add(choir(notes, dd + 0.2, vowel=(450, 900), attack=0.5), t0, 0.32 if sec < 30 else 0.45)

# scene-cut accents: a crash on every second cut once the drums are in, a reverse swell into each scene
for c in np.arange(10, REVEAL, 5.0):
    if c >= 30 or c in (10, 20): fx.add(crash(), c, 0.8, pan=0.2)
for c in np.arange(5, REVEAL, 5.0):
    fx.add(riser(0.6, 800, 7000), c - 0.6, 0.18)
# fill into the logo: snare build on the last bar's 3rd beat
for k, g in enumerate(np.linspace(0.35, 0.9, 6)):
    drums.add(rim_snare(g), (bars - 1) * BAR + 2 * BEAT + k * BEAT / 6)
fx.add(riser(1.4, 400, 9000), REVEAL - 1.4, 0.45)

# ── the logo: one big Am chord, strummed, with voices, then ring out
drums.add(soft_kick(1.2), REVEAL); drums.add(impact(2.4), REVEAL, 0.7); fx.add(crash(4.0), REVEAL, 1.0)
for k, m in enumerate([45, 52, 57, 60, 64, 69]):
    gtr.add(guitar(m, 4.6, bright=4000, damp=0.9985), REVEAL + k * 0.018, 0.75, pan=-0.2 + 0.08 * k)
bass.add(bass_note(33, 4.5), REVEAL, 1.0)
voc.add(choir([57, 64, 69, 72], 4.8, vowel=(450, 900), attack=0.25), REVEAL, 0.55)
for k, m in enumerate([76, 81, 84]):
    fx.add(bell(m, 2.5), REVEAL + 1.0 + k * 0.25, 0.25, pan=-0.3 + 0.3 * k)

# ── mix: dreamy guitar = echo + big room
dL, dR = delay(gtr.L, gtr.R, 0.75 * BEAT)
L = gtr.L + dL + bass.L + drums.L + voc.L + fx.L
R = gtr.R + dR + bass.R + drums.R + voc.R + fx.R
L += reverb(gtr.L + dL + voc.L + drums.L * 0.35 + fx.L * 0.4, secs=3.2, mix=0.42)
R += reverb(gtr.R + dR + voc.R + drums.R * 0.35 + fx.R * 0.4, secs=3.2, mix=0.42)
master(L, R, DUR, "public/music/seven_reel_indie.wav", fade_in=0.05, fade_out=2.0)
