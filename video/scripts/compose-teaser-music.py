"""
Original 30-second cinematic teaser theme for SEVEN Career Institute (synthesised, royalty-free).
Timed to src/teaser/config.ts.   python3 scripts/compose-teaser-music.py -> public/music/seven_teaser.wav

Key D minor, 120 BPM. Resolves to D major on the logo ("RISE").
  0–3.5 s    ticking clock over a low drone, heartbeat pulse, riser          "something new is coming"
  3.5 s      impact; D minor pad swells                                       "Understood, not just taught"
  6.5/10.5/14.5/18.5 s  a deep "braam" hit opens each USP; string ostinato builds,
             toms join at 10.5 s, hats at 14.5 s, snare roll into 22.5 s
  22.5–25.5  full drive on the dominant (tension) under the 2000+ count
  25.5–27    silence, reverse swell
  27–30      BASS DROP: 808 bass line, kick, claps, hats under the logo; short fade
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from synth import *

DUR = 30.0
N = int(SR * DUR)
drums, low, strings, pads, fx = Bus(N), Bus(N), Bus(N), Bus(N), Bus(N)

# chords per section (MIDI), D minor: Dm, Bb, F, C under the USPs; Gm → A under the stat
DM, BB, F_, C_, GM, A_ = [50, 53, 57], [46, 50, 53], [41, 45, 48], [48, 52, 55], [43, 46, 50], [45, 49, 52]
USP_CHORDS = [(6.5, DM), (10.5, BB), (14.5, F_), (18.5, C_)]

# ── 0–3.5 s: drone, ticking clock, heartbeat, riser
low.add(drone(38, 6.6, 260), 0.0, 0.55)
for i in range(7):
    drums.add(tick(), i * 0.5, 0.35, pan=0.3 if i % 2 else -0.3)
for t in (1.5, 2.5):
    drums.add(kick(0.6), t); drums.add(kick(0.4), t + 0.22)
fx.add(riser(2.4, 250, 6000), 1.1, 0.45)

# ── 3.5 s: impact + pad
fx.add(impact(), 3.5, 0.85)
pads.add(pad([38, 50, 53, 57, 62], 3.1, cutoff=900, attack=0.6), 3.5, 0.5)
for i in range(6):
    drums.add(tick(), 3.5 + i * 0.5, 0.25, pan=0.3 if i % 2 else -0.3)
fx.add(riser(1.2, 400, 7000), 5.3, 0.4)

# ── USP sections
for k, (start, ch) in enumerate(USP_CHORDS):
    root = ch[0]
    low.add(braam([root - 12, root - 5, root], 2.0), start, 0.85)
    drums.add(tom(70, 0.9), start, 0.9)
    pads.add(pad([root - 12] + [m + 12 for m in ch], 4.0, cutoff=1000 + 400 * k, attack=0.3), start, 0.32)
    # string ostinato in 8ths (16ths from the third USP), climbing in brightness
    step = 0.25 if k < 2 else 0.125
    pattern = [0, 2, 1, 2]
    for j in range(int(4.0 / step)):
        t = start + j * step
        m = ch[pattern[j % 4]] + 12
        strings.add(string_note(m, step * 0.95, 1200 + 600 * k), t, 0.55, pan=(-0.25 if j % 2 else 0.25))
    # toms on beats 2 & 4 from USP 2, hats from USP 3
    for b in range(8):
        t = start + b * 0.5
        if k >= 1 and b % 2 == 1: drums.add(tom(110, 0.4), t, 0.55)
        if k >= 2: drums.add(hat(), t + 0.25, 0.4, pan=0.2)
        if k >= 1 and b % 2 == 0 and b > 0: drums.add(kick(0.7), t)
# snare roll into the stat
for t in np.concatenate([np.arange(20.5, 21.5, 0.25), np.arange(21.5, 22.0, 0.125), np.arange(22.0, 22.5, 0.0625)]):
    drums.add(snare(0.3 + 0.7 * (t - 20.5) / 2), t, 0.55)
fx.add(riser(2.0, 400, 9000), 20.5, 0.5)

# ── 22.5–25.5 s: full drive on Gm → A (tension under the counter)
fx.add(impact(1.6), 22.5, 0.6)
for half, ch in ((22.5, GM), (24.0, A_)):
    low.add(braam([ch[0] - 12, ch[0]], 1.5), half, 0.7)
    pads.add(pad([m + 12 for m in ch], 1.5, cutoff=2200, attack=0.05), half, 0.35)
    for j in range(12):
        t = half + j * 0.125
        strings.add(string_note(ch[[0, 2, 1, 2][j % 4]] + 24, 0.12, 3000), t, 0.5, pan=(-0.3 if j % 2 else 0.3))
for b in range(6):
    t = 22.5 + b * 0.5
    drums.add(kick(0.85), t); drums.add(hat(), t + 0.25, 0.45)
    if b % 2: drums.add(snare(0.8), t, 0.6)

# ── 25.5–27 s: break and reverse swell
swell = pad([50, 54, 57, 62, 66], 1.2, cutoff=3000, attack=1.1)
pads.add(swell * np.linspace(0, 1, len(swell)) ** 2, 25.8, 0.6)
fx.add(riser(1.2, 600, 9500), 25.8, 0.5)

# ── 26.9 s: pitch-falling boom into the drop
fx.add(sub_drop(1.0), 26.0, 0.55)

# ── 27–30 s: BASS DROP on the logo reveal (D), 808 bass + punchy drums, D major colour on top
fx.add(impact(1.6), 27.0, 0.6)
pads.add(pad([50, 54, 57, 62], 3.0, cutoff=2600, attack=0.04), 27.0, 0.32)
for k, m in enumerate([74, 78, 81, 86]):
    strings.add(bell(m, 2.0), 27.0 + k * 0.125, 0.45, pan=-0.3 + 0.2 * k)
# 808 line (D2 = 38): rhythm in 16ths, with a jump up to A and back
BASS_LINE = [(0.0, 38, 0.7), (0.75, 38, 0.25), (1.0, 45, 0.45), (1.5, 38, 0.7), (2.25, 41, 0.25), (2.5, 38, 0.5)]
for at, m, d in BASS_LINE:
    low.add(bass808(m, d, glide=12 if at == 0 else 5), 27.0 + at, 0.95)
for b in range(6):                       # kick on every beat
    drums.add(kick(1.0), 27.0 + b * 0.5)
for t in (27.5, 28.5, 29.5):             # claps on 2 and 4
    drums.add(clap(1.0), t, 0.8)
for j in range(24):                      # 16th hats, accent on offbeats
    drums.add(hat(), 27.0 + j * 0.125, 0.45 if j % 2 else 0.22, pan=(0.25 if j % 4 else -0.25))
drums.add(hat(True), 28.875, 0.4)

# ── mix
L = drums.L + low.L + strings.L + pads.L + fx.L
R = drums.R + low.R + strings.R + pads.R + fx.R
L += reverb(strings.L + pads.L * 0.7 + drums.L * 0.2 + low.L * 0.1)
R += reverb(strings.R + pads.R * 0.7 + drums.R * 0.2 + low.R * 0.1)
master(L, R, DUR, "public/music/seven_teaser.wav", fade_out=0.7)
