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
from indie_kit import *

DUR = 50.0
N = int(SR * DUR)
BEAT = 60 / 96          # 0.625 s
BAR = 4 * BEAT          # 2.5 s
REVEAL = 45.0           # logo scene starts here (bar 18)
gtr, bass, drums, voc, fx = Bus(N), Bus(N), Bus(N), Bus(N), Bus(N)

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
