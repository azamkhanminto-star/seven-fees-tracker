"""
Original 50-second "pulse" music for the SEVEN reel (synthesised, royalty-free).
Style brief from the owner's reference reel: dark and minimal, a heartbeat intro, a steady
120 BPM pulse over a deep drone, a bright hit on every scene cut, a steady build, a swell into
one huge sustained hit, then a calm soft chord to close. Nothing is copied: only the structure.

  python3 scripts/compose-reel-music.py   -> public/music/seven_reel_pulse.wav

Key A minor. Scene cuts come from src/teaser/config.ts.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from synth import *

DUR = 50.0
N = int(SR * DUR)
BEAT = 0.5
cfg = open(os.path.join(os.path.dirname(__file__), "..", "src", "teaser", "config.ts")).read()
CUTS = sorted({float(x) for x in re.findall(r"from: (\d+(?:\.\d+)?)", cfg)} - {0.0})   # scene starts
REVEAL = 46.0
drums, low, tones, fx = Bus(N), Bus(N), Bus(N), Bus(N)

# ── sounds
def heartbeat(gain=1.0):
    """lub-dub: two soft sub thumps."""
    def thump(f0, d=0.28):
        t = tt(d); f = f0 * (1 + 0.5 * np.exp(-t * 25))
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    a = thump(58); b = thump(52) * 0.7
    out = np.zeros(int(0.6 * SR)); out[:len(a)] += a; s = int(0.28 * SR); out[s:s + len(b)] += b
    return np.tanh(1.5 * out) * gain

def pulse(gain=1.0):
    """The steady beat: a deep, soft thump (felt more than heard) plus a faint click so phones hear it."""
    d = 0.32; t = tt(d); f = 48 * (1 + 0.8 * np.exp(-t * 30))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    click = hp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 220) * 0.12
    return np.tanh(1.8 * (body + click)) * gain

def hit(size=1.0):
    """Bright scene-cut hit: sub boom + airy noise burst."""
    d = 1.6; t = tt(d)
    boom = np.sin(2 * np.pi * (42 + 50 * np.exp(-t * 9)) * t) * np.exp(-t * 3.2)
    air = hp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 7) * 0.45
    shimmer = bp(rng.standard_normal(len(t)), 4000, 12000) * np.exp(-t * 4) * 0.25
    return np.tanh(1.4 * (boom + air + shimmer)) * size

def tension(notes, d):
    """Sustained dark brass-and-strings wall for the climax."""
    t = tt(d); x = np.zeros(len(t))
    for m in notes:
        for det in (-0.1, 0.0, 0.1):
            x += saw(mtof(m) * 2 ** (det / 12), d, rng.random())
    x = lp(x / (len(notes) * 3), 1400, 2)
    tremolo = 1 + 0.12 * np.sin(2 * np.pi * 6 * t)
    return np.tanh(1.6 * x) * tremolo * np.minimum(1, t / 0.03) * np.clip((d - t) / 0.25, 0, 1)

# ── drone: A1 + E2, slowly opening filter, the whole way to the climax
dr = drone(33, REVEAL + 1.4, 180) + 0.6 * drone(40, REVEAL + 1.4, 220)
ramp = np.linspace(0.55, 1.0, len(dr))                       # the build: drone grows
low.add(dr * ramp, 0.0, 0.5)

# ── 0–4 s: heartbeat in near silence
for t in (0.05, 1.6, 3.1):
    drums.add(heartbeat(0.9), t)
tones.add(bell(81, 1.4), 0.4, 0.22)                            # tiny sparkle on "Hey Aligarh!"

# ── 4–45.5 s: steady pulse on every beat, getting stronger; ticks join later
n_beats = int((45.5 - 4.0) / BEAT)
for i in range(n_beats):
    t = 4.0 + i * BEAT
    grow = 0.55 + 0.45 * (t - 4.0) / (45.5 - 4.0)
    drums.add(pulse(grow), t, 0.95)
    if t >= 21.0: drums.add(tick() * 0.6, t + 0.25, 0.25 + 0.2 * (t - 21) / 24, pan=0.25)       # offbeat ticks from the 3rd USP
    if t >= 33.0 and i % 2: drums.add(hat(), t + 0.125, 0.18, pan=-0.25)

# a quiet minor pad underneath, swelling with each section (A minor, F, C, G colours)
CH = {4: [57, 60, 64], 9: [57, 60, 64], 15: [53, 57, 60], 21: [48, 52, 55], 27: [55, 59, 62], 33: [53, 57, 60], 37: [55, 59, 62], 42: [57, 60, 64]}
for start, ch in CH.items():
    nxt = min([c for c in CH if c > start] + [45.5])
    tones.add(pad(ch, nxt - start + 0.3, cutoff=700 + 25 * start, attack=0.6), start, 0.22 + 0.004 * start)

# ── a bright hit on every scene cut (the reference's signature), bigger as we go
for c in CUTS:
    if c >= REVEAL: continue
    fx.add(hit(0.6 + 0.4 * c / REVEAL), c, 0.8)
fx.add(hit(0.6), 6.25, 0.6)                                    # second half of the feeling scene
fx.add(hit(0.9), 42.87, 0.8)                                   # "FREE"

# ── climax: swell → huge sustained hit as the logo assembles → calm A minor chord
fx.add(riser(1.6, 300, 9000), 44.4, 0.6)
# 45.5–46: a breath
fx.add(hit(1.3), REVEAL, 1.0)
fx.add(impact(2.4), REVEAL, 0.8)
low.add(tension([33, 45, 52, 57, 60], 1.6), REVEAL, 0.6)
# calm resolution as the tick finishes drawing
fx.add(hit(0.7), REVEAL + 1.5, 0.55)
tones.add(pad([57, 60, 64, 69], 2.6, cutoff=1800, attack=0.15, release=1.4), REVEAL + 1.5, 0.55)
for k, m in enumerate([69, 72, 76]):
    tones.add(bell(m, 2.2), REVEAL + 1.6 + k * 0.2, 0.3, pan=-0.2 + 0.2 * k)

# ── mix
L = drums.L + low.L + tones.L + fx.L
R = drums.R + low.R + tones.R + fx.R
L += reverb(tones.L + fx.L * 0.5 + drums.L * 0.15, secs=2.6, mix=0.3)
R += reverb(tones.R + fx.R * 0.5 + drums.R * 0.15, secs=2.6, mix=0.3)
master(L, R, DUR, "public/music/seven_reel_pulse.wav", fade_in=0.3, fade_out=1.4)
