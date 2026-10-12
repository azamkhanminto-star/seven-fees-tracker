"""
Original 10-second music for the SEVEN Runway reel (synthesised, royalty-free), in the same
dreamy-indie sound as the 50 s reel.

  python3 scripts/compose-runway-sting.py   -> public/music/seven_runway_sting.wav

100 BPM (a beat every 0.6 s), so the picture changes in src/runway/RunwayReel.tsx land on beats:
3.0 s (beat 5) "We find the real gap", 6.0 s (beat 10) the classroom, 7.2 s (beat 12) the logo.
Story: unsure (A minor, sparse) -> hopeful (F, C) -> lift (G) -> one bright C major chord.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from synth import *
from indie_kit import *

DUR = 10.0
N = int(SR * DUR)
BEAT = 0.6
E = BEAT / 2
gtr, bass, drums, voc, fx = Bus(N), Bus(N), Bus(N), Bus(N), Bus(N)

# 0–3 s · "Stuck in Maths?": sparse guitar on A minor, soft heartbeat kick
for k, m in enumerate([57, 64, 69, 72, 69]):
    gtr.add(guitar(m, 1.6), 0.05 + k * BEAT, 0.75, pan=-0.15)
for t in (0.05, 1.25, 2.45):
    drums.add(soft_kick(0.6), t); drums.add(soft_kick(0.45), t + E)

# 3–6 s · "We find the real gap first.": brighter figure, bass and snare arrive
FIG = [0, 2, 3, 2, 4, 2, 3, 1]
for bar, (root, v) in enumerate([(41, [53, 60, 65, 69, 72]), (48, [55, 60, 64, 67, 72])]):
    t0 = 3.0 + bar * 3 * BEAT                                        # F for 3 beats, C for 2 beats
    steps = 6 if bar == 0 else 4
    for k, idx in enumerate(FIG[:steps]):
        gtr.add(guitar(v[idx], 1.2), t0 + k * E, 0.7 if k % 2 == 0 else 0.55, pan=-0.15)
    bass.add(bass_note(root, 1.4), t0, 1.0)
    drums.add(soft_kick(0.85), t0); drums.add(soft_kick(0.6), t0 + E)
    drums.add(rim_snare(0.75), t0 + (2 if bar == 0 else 1) * BEAT)
    for k in range(steps): drums.add(hat(), t0 + k * E, 0.16, pan=0.25)
fx.add(crash(2.0), 3.0, 0.5, pan=0.2)

# 6–7.2 s · the classroom: lift on G, voices, shaker, swell into the logo
gtr_v = [55, 59, 62, 67, 71]
for k, idx in enumerate([0, 2, 3, 4]):
    gtr.add(guitar(gtr_v[idx], 1.0), 6.0 + k * E, 0.7, pan=-0.15)
    gtr.add(guitar(gtr_v[idx] + 12, 0.8, bright=4500), 6.0 + k * E + 0.012, 0.25, pan=0.3)
bass.add(bass_note(43, 1.1), 6.0, 1.0)
drums.add(soft_kick(1.0), 6.0); drums.add(soft_kick(0.75), 6.0 + E)
voc.add(choir([55, 62, 67], 1.2, vowel=(450, 900), attack=0.3), 6.0, 0.4)
fx.add(crash(2.0), 6.0, 0.7, pan=0.2)
for k in range(6): drums.add(shaker(), 6.0 + k * E / 2, 0.6, pan=-0.3)
for k, g in enumerate(np.linspace(0.3, 0.85, 6)):                    # snare build
    drums.add(rim_snare(g), 6.6 + k * BEAT / 6)
fx.add(riser(1.0, 400, 9000), 6.2, 0.45)

# 7.2 s · the logo: one big, bright C major chord, voices, bells as the tick draws
LOGO = 7.2
drums.add(soft_kick(1.2), LOGO); drums.add(impact(2.4), LOGO, 0.6); fx.add(crash(3.5), LOGO, 0.9)
for k, m in enumerate([48, 55, 60, 64, 67, 74]):
    gtr.add(guitar(m, 2.8, bright=4000, damp=0.9985), LOGO + k * 0.018, 0.75, pan=-0.2 + 0.08 * k)
bass.add(bass_note(36, 2.8), LOGO, 1.0)
voc.add(choir([60, 64, 67, 72], 2.8, vowel=(450, 900), attack=0.2), LOGO, 0.5)
for k, m in enumerate([79, 84, 88]):
    fx.add(bell(m, 1.8), LOGO + 0.9 + k * 0.2, 0.25, pan=-0.3 + 0.3 * k)

dL, dR = delay(gtr.L, gtr.R, 0.75 * BEAT)
L = gtr.L + dL + bass.L + drums.L + voc.L + fx.L
R = gtr.R + dR + bass.R + drums.R + voc.R + fx.R
L += reverb(gtr.L + dL + voc.L + drums.L * 0.35 + fx.L * 0.4, secs=2.8, mix=0.4)
R += reverb(gtr.R + dR + voc.R + drums.R * 0.35 + fx.R * 0.4, secs=2.8, mix=0.4)
master(L, R, DUR, "public/music/seven_runway_sting.wav", fade_in=0.02, fade_out=0.8)
