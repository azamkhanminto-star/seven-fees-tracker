"""
Original 50-second music for the SEVEN teaser reel (synthesised, royalty-free).
Timed to src/teaser/config.ts.

  python3 scripts/compose-teaser-music.py [cinematic|inspiring|desi|drop]
      -> public/music/seven_teaser_<ending>.wav   (copy the chosen one to seven_teaser.wav)

Key D minor, 120 BPM (beat 0.5 s).
  0–4      "Hey Aligarh!": ticking clock, low drone, heartbeat, riser
  4–9      the feeling: impact, soft piano over a warm pad ("Every student is different"),
           swell into "a system you've never seen before"
  9–33     four USPs, 6 s each: a deep hit opens each one; strings build; toms, hats, snare roll
  33–37    2000+ selections: full drive on Gm → A
  37–42    courses: brighter groove on Bb → C
  42–46    FREE RDT call to action: stab on "FREE", build, short silence
  46–50    ending (choose): cinematic · inspiring · desi · drop
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from synth import *

ENDING = sys.argv[1] if len(sys.argv) > 1 else "cinematic"
DUR = 50.0
N = int(SR * DUR)
REVEAL = 46.0           # logo scene starts; the big moment lands one second later
drums, low, strings, pads, fx = Bus(N), Bus(N), Bus(N), Bus(N), Bus(N)

DM, BB, F_, C_, GM, A_ = [50, 53, 57], [46, 50, 53], [41, 45, 48], [48, 52, 55], [43, 46, 50], [45, 49, 52]

def ostinato(start, dur, ch, step, bright, gain=0.5, octave=12):
    pattern = [0, 2, 1, 2]
    for j in range(int(dur / step)):
        strings.add(string_note(ch[pattern[j % 4]] + octave, step * 0.95, bright), start + j * step, gain, pan=(-0.25 if j % 2 else 0.25))

def snare_roll(a, b):
    ts = np.concatenate([np.arange(a, a + (b - a) / 2, 0.25), np.arange(a + (b - a) / 2, b - (b - a) / 4, 0.125), np.arange(b - (b - a) / 4, b, 0.0625)])
    for t in ts:
        drums.add(snare(0.3 + 0.7 * (t - a) / (b - a)), t, 0.55)

# ── 0–4 s: "Hey Aligarh!"
low.add(drone(38, 9.2, 260), 0.0, 0.5)
for i in range(8):
    drums.add(tick(), i * 0.5, 0.33, pan=0.3 if i % 2 else -0.3)
strings.add(bell(74, 1.2), 0.4, 0.35); strings.add(bell(81, 1.2), 0.45, 0.25)        # sparkle on "Hey Aligarh!"
for t in (2.0, 3.0):
    drums.add(kick(0.6), t); drums.add(kick(0.4), t + 0.22)
fx.add(riser(2.4, 250, 6000), 1.6, 0.45)

# ── 4–9 s: the feeling
fx.add(impact(), 4.0, 0.8)
pads.add(pad([38, 50, 53, 57, 62], 5.1, cutoff=900, attack=0.8), 4.0, 0.45)
for at, m in [(0.0, 62), (0.5, 65), (1.0, 69), (1.5, 67), (2.0, 65)]:          # "Every student is different."
    strings.add(piano(m, 1.8, 0.8), 4.25 + at, 0.8, pan=0.1)
for at, m in [(0.0, 57), (0.5, 62), (1.0, 65), (1.5, 69), (2.0, 74)]:          # rising: "So we built a system…"
    strings.add(piano(m, 1.6, 0.9), 6.25 + at, 0.8, pan=-0.1)
strings.add(bell(86, 1.6), 7.1, 0.3)                                             # glow on "never seen before"
fx.add(riser(1.6, 400, 8000), 7.4, 0.45)

# ── 9–33 s: the four USPs
for k, (start, ch) in enumerate([(9.0, DM), (15.0, BB), (21.0, F_), (27.0, C_)]):
    root = ch[0]
    low.add(braam([root - 12, root - 5, root], 2.2), start, 0.85)
    drums.add(tom(70, 0.9), start, 0.9)
    pads.add(pad([root - 12] + [m + 12 for m in ch], 6.0, cutoff=1000 + 400 * k, attack=0.3), start, 0.3)
    ostinato(start, 6.0, ch, 0.25 if k < 2 else 0.125, 1200 + 600 * k, 0.5)
    for b in range(12):
        t = start + b * 0.5
        if k >= 1 and b % 2 == 1: drums.add(tom(110, 0.4), t, 0.5)
        if k >= 1 and b % 2 == 0 and b > 0: drums.add(kick(0.7), t)
        if k >= 2: drums.add(hat(), t + 0.25, 0.38, pan=0.2)
    strings.add(bell(ch[1] + 36 if ch[1] + 36 < 92 else ch[1] + 24, 1.2), start + 0.7, 0.25)   # chime as the icon draws
snare_roll(31.0, 33.0)
fx.add(riser(2.0, 400, 9000), 31.0, 0.5)

# ── 33–37 s: 2000+ selections, full drive Gm → A
fx.add(impact(1.6), 33.0, 0.6)
for half, ch in ((33.0, GM), (35.0, A_)):
    low.add(braam([ch[0] - 12, ch[0]], 1.8), half, 0.7)
    pads.add(pad([m + 12 for m in ch], 2.0, cutoff=2200, attack=0.05), half, 0.33)
    ostinato(half, 2.0, ch, 0.125, 3000, 0.48, octave=24)
for b in range(8):
    t = 33.0 + b * 0.5
    drums.add(kick(0.85), t); drums.add(hat(), t + 0.25, 0.42)
    if b % 2: drums.add(snare(0.8), t, 0.55)

# ── 37–42 s: courses, brighter groove Bb → C
for seg, ch in ((37.0, BB), (39.5, C_)):
    low.add(braam([ch[0] - 12, ch[0]], 1.6), seg, 0.55)
    pads.add(pad([m + 12 for m in ch] + [ch[0] + 24], 2.5, cutoff=2600, attack=0.1), seg, 0.32)
    ostinato(seg, 2.5, ch, 0.125, 2800, 0.42, octave=24)
for b in range(10):
    t = 37.0 + b * 0.5
    drums.add(kick(0.75), t); drums.add(hat(), t + 0.25, 0.4, pan=0.2)
    if b % 2: drums.add(clap(0.8), t, 0.5)

# ── 42–46 s: FREE RDT call to action
pads.add(pad([38, 50, 53, 57], 3.5, cutoff=1400, attack=0.4), 42.0, 0.35)
low.add(drone(38, 3.6, 300), 42.0, 0.45)
low.add(braam([38, 45, 50, 57], 1.4), 42.87, 0.8)                                 # stab on "FREE"
drums.add(tom(80, 0.7), 42.87, 0.8)
for t in np.arange(43.5, 45.0, 0.5):
    drums.add(tom(100, 0.4), t, 0.45)
snare_roll(44.0, 45.5)
fx.add(riser(1.6, 400, 9000), 44.0, 0.5)
# 45.5–46: a breath of silence before the logo

# ── 46–50 s: the ending
R = REVEAL
if ENDING == "cinematic":
    for k, t in enumerate(np.arange(R, R + 1.0, 0.0625)):
        drums.add(timpani(38, 0.4, 0.25 + 0.75 * k / 16), t, 0.5)
    fx.add(riser(1.0, 500, 9000), R, 0.45)
    fx.add(impact(2.4), R + 1, 0.95)
    drums.add(timpani(38, 2.0, 1.0), R + 1, 0.9)
    low.add(braam([26, 38, 45, 50], 3.0), R + 1, 0.8)
    pads.add(choir([62, 66, 69, 74], 3.0, attack=0.15), R + 1, 0.75)
    pads.add(pad([38, 50, 54, 57, 62, 66], 3.0, cutoff=3000, attack=0.05), R + 1, 0.45)
    for k, m in enumerate([74, 78, 81, 86, 90]):
        strings.add(bell(m, 2.4), R + 1.25 + k * 0.18, 0.5, pan=-0.4 + 0.2 * k)
    for t in (R + 2, R + 3):
        drums.add(timpani(45, 1.0, 0.6), t, 0.6)
elif ENDING == "inspiring":
    sw = pad([50, 54, 57, 62], 1.0, cutoff=2400, attack=0.9)
    pads.add(sw * np.linspace(0, 1, len(sw)) ** 2, R, 0.5)
    pads.add(pad([38, 50, 54, 57, 62, 66], 3.0, cutoff=2200, attack=0.3), R + 1, 0.4)
    low.add(drone(38, 3.0, 220), R + 1, 0.6)
    for at, m in [(0.0, 62), (0.25, 66), (0.5, 69), (0.75, 74), (1.0, 73), (1.25, 69), (1.5, 71), (1.75, 74), (2.0, 78), (2.25, 74), (2.5, 69), (2.75, 74)]:
        strings.add(piano(m, 1.6, 0.9 if at % 1 == 0 else 0.7), R + 1 + at, 0.9, pan=0.15)
    for b in range(6): drums.add(kick(0.55), R + 1 + b * 0.5)
    for t in (R + 1.5, R + 2.5, R + 3.5): drums.add(clap(0.6), t, 0.6)
    for k, m in enumerate([86, 90, 93, 98]): strings.add(bell(m, 1.4), R + 1 + k * 0.75, 0.3, pan=-0.3 + 0.2 * k)
elif ENDING == "desi":
    for k, t in enumerate(np.arange(R, R + 1.0, 0.125)):
        drums.add(dhol("ta", 0.4 + 0.6 * k / 8), t, 0.7, pan=0.2)
        if k % 2 == 0: drums.add(dhol("dha", 0.5 + 0.5 * k / 8), t, 0.7)
    fx.add(impact(1.6), R + 1, 0.7)
    pads.add(pad([38, 50, 57, 62], 3.0, cutoff=1800, attack=0.05), R + 1, 0.35)
    low.add(bass808(38, 3.0, glide=7, drive=1.6), R + 1, 0.55)
    groove = ["dha", "ta", "ta", "dha", "ta", "dha", "ta", "ta"]
    for j in range(12):
        g = groove[j % 8]; drums.add(dhol(g, 1.0 if g == "dha" else 0.8), R + 1 + j * 0.25, 0.8, pan=(0.2 if g == "ta" else 0))
    for j, kind in enumerate(["ge", "na", "na", "ge", "na", "ge", "na", "na", "ge", "na", "na", "na"]):
        drums.add(tabla(kind, 0.8), R + 1.125 + j * 0.25, 0.55, pan=-0.3)
    for at, m, bend in [(0.0, 74, 0), (0.25, 76, 0), (0.5, 78, 0), (0.75, 81, 0), (1.0, 83, 0), (1.5, 81, -2), (1.75, 78, 0), (2.0, 76, 0), (2.25, 74, 1)]:
        strings.add(sitar(m - 12, 0.9, bend), R + 1 + at, 0.9, pan=0.25)
elif ENDING == "drop":
    fx.add(sub_drop(1.0), R, 0.55)
    fx.add(impact(1.6), R + 1, 0.6)
    pads.add(pad([50, 54, 57, 62], 3.0, cutoff=2600, attack=0.04), R + 1, 0.32)
    for at, m, d in [(0.0, 38, 0.7), (0.75, 38, 0.25), (1.0, 45, 0.45), (1.5, 38, 0.7), (2.25, 41, 0.25), (2.5, 38, 0.5)]:
        low.add(bass808(m, d, glide=12 if at == 0 else 5), R + 1 + at, 0.95)
    for b in range(6): drums.add(kick(1.0), R + 1 + b * 0.5)
    for t in (R + 1.5, R + 2.5, R + 3.5): drums.add(clap(1.0), t, 0.8)
    for j in range(24): drums.add(hat(), R + 1 + j * 0.125, 0.45 if j % 2 else 0.22)

# ── mix
L = drums.L + low.L + strings.L + pads.L + fx.L
R_ = drums.R + low.R + strings.R + pads.R + fx.R
L += reverb(strings.L + pads.L * 0.7 + drums.L * 0.2 + low.L * 0.1)
R_ += reverb(strings.R + pads.R * 0.7 + drums.R * 0.2 + low.R * 0.1)
master(L, R_, DUR, f"public/music/seven_teaser_{ENDING}.wav", fade_out=0.7 if ENDING in ("drop", "desi") else 1.2)
