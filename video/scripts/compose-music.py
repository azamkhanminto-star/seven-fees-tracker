"""
Original 30-second theme for the RDT launch video, synthesised from scratch (no samples),
so it is fully owned and royalty-free. Timed to the scenes in src/config.ts.

  python3 scripts/compose-music.py   ->  public/music/rdt_theme.wav

Key A minor, 120 BPM (one beat = 0.5 s, one bar = 2 s).
  0–3 s   dark pad swell out of silence, riser
  3 s     impact on "WHY", beat starts
  3–17 s  driving pulse: kick, hats, bass, plucked arpeggio
  17–22 s build: filter opens, claps, snare roll into 22 s
  22–26 s full energy
  26–27 s drop-out with reverse swell
  27–30 s bright resolving chord + bells on the logo reveal, fade out
"""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave, os

SR = 48000
DUR = 30.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(7)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(d): return np.arange(int(d * SR)) / SR
def lp(x, f, order=2): return sosfilt(butter(order, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)
def saw(f, d, phase=0.0):
    t = tt(d); return 2 * ((f * t + phase) % 1.0) - 1

class Bus:
    def __init__(self): self.L = np.zeros(N); self.R = np.zeros(N)
    def add(self, x, at, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= N: return
        x = x[: N - i] * gain
        self.L[i:i + len(x)] += x * np.sqrt(0.5 * (1 - pan))
        self.R[i:i + len(x)] += x * np.sqrt(0.5 * (1 + pan))

drums, bass, keys, pads, fx = Bus(), Bus(), Bus(), Bus(), Bus()

# ── harmony: Am – F – C – G, one chord per 2-second bar; final chord C major
PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # A3 C4 E4 / F3 A3 C4 / C3 E3 G3 / G3 B3 D4
def chord_at(t): return PROG[int(t // 2) % 4]

# ── instruments
def kick():
    d = 0.42; t = tt(d)
    f = 45 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 300) * 0.25
    return np.tanh(1.6 * (body + click))

def hat(open_=False):
    d = 0.18 if open_ else 0.05; t = tt(d)
    return hp(rng.standard_normal(len(t)), 7500, 4) * np.exp(-t * (18 if open_ else 70)) * 0.5

def clap():
    d = 0.3; t = tt(d); n = rng.standard_normal(len(t))
    e = np.exp(-t * 22) + 0.6 * np.exp(-np.maximum(0, t - 0.012) * 30) * (t > 0.012) + 0.4 * np.exp(-np.maximum(0, t - 0.024) * 26) * (t > 0.024)
    return bp(n, 900, 3200) * e * 0.7

def snare(level=1.0):
    d = 0.16; t = tt(d)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.4
    nz = bp(rng.standard_normal(len(t)), 1500, 7000) * np.exp(-t * 24) * 0.6
    return (tone + nz) * level

def bass_note(m, d, cutoff=380):
    t = tt(d)
    x = 0.7 * saw(mtof(m), d) + 0.6 * np.sin(2 * np.pi * mtof(m) * t)
    x = lp(x, cutoff, 2)
    e = np.minimum(1, t / 0.004) * np.exp(-t * 5)
    return np.tanh(1.4 * x * e)

def pluck(m, d=0.22, bright=2500):
    t = tt(d)
    x = saw(mtof(m), d) + 0.5 * saw(mtof(m) * 1.003, d, 0.3)
    x = lp(x, bright, 2)
    return x * np.minimum(1, t / 0.002) * np.exp(-t * 16) * 0.35

def pad(notes, d, cutoff=1400, attack=0.6):
    t = tt(d); x = np.zeros(len(t))
    for m in notes:
        for det in (-0.08, 0.0, 0.08):
            x += saw(mtof(m) * 2 ** (det / 12), d, rng.random())
    x = lp(x / (len(notes) * 3), cutoff, 2)
    e = np.minimum(1, t / attack) * np.minimum(1, (d - t) / 0.4)
    return x * e

def bell(m, d=1.6):
    t = tt(d)
    f = mtof(m)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 8)
    return x * np.minimum(1, t / 0.003) * np.exp(-t * 2.4) * 0.3

def riser(d, lo=300, hi=6000):
    t = tt(d); n = rng.standard_normal(len(t)); out = np.zeros(len(t)); step = 2400
    for s in range(0, len(t), step):
        frac = s / len(t); fc = lo * (hi / lo) ** frac
        seg = n[s:s + step]; out[s:s + step] = bp(seg, fc * 0.7, min(fc * 1.4, SR / 2 - 200))
    return out * (t / d) ** 2 * 0.5

def impact():
    d = 2.2; t = tt(d)
    sub = np.sin(2 * np.pi * (38 + 40 * np.exp(-t * 6)) * t) * np.exp(-t * 1.6)
    crash = lp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 3.5) * 0.35
    return np.tanh(1.3 * (sub + crash))

# ── arrangement
# Intro 0–3 s: Am pad swell + riser into the impact
pads.add(pad([45, 57, 60, 64], 3.4, cutoff=700, attack=2.2), 0.0, 0.55)
fx.add(riser(2.6, 200, 5000), 0.4, 0.45)

# 3 s: impact on "WHY"
fx.add(impact(), 3.0, 0.9)

# Drums 3–25.5 s
for i in range(int(3.0 / 0.125), int(25.5 / 0.125)):
    t = i * 0.125
    beat_pos = round((t % BEAT) / 0.125)
    if beat_pos == 0: drums.add(kick(), t, 0.75)
    if beat_pos == 2: drums.add(hat(), t, 0.55, pan=0.2)                      # offbeat 8ths
    if t >= 11 and beat_pos in (1, 3): drums.add(hat(), t, 0.22, pan=-0.25)    # 16th shuffle from the diagnosis
    if t >= 6 and abs((t % 1.0) - 0.5) < 1e-6: drums.add(clap(), t, 0.5 if t < 17 else 0.65)  # beats 2 & 4
    if 22 <= t < 25.5 and abs((t % 2.0) - 1.75) < 1e-6: drums.add(hat(True), t, 0.35)
# Snare roll 20–22 s, accelerating and rising
for k, t in enumerate(np.concatenate([np.arange(20.0, 21.0, 0.25), np.arange(21.0, 21.5, 0.125), np.arange(21.5, 22.0, 0.0625)])):
    drums.add(snare(0.35 + 0.65 * (t - 20) / 2), t, 0.6)
fx.add(riser(2.0, 400, 8000), 20.0, 0.5)

# Bass 3–25.5 s: 8th-note pulse on the chord root, filter opens through the build
for i in range(int(3.0 / 0.25), int(25.5 / 0.25)):
    t = i * 0.25
    root = chord_at(t)[0] - 12
    cutoff = 300 if t < 17 else (300 + 900 * (t - 17) / 5 if t < 22 else 1200)
    octave = 12 if (i % 4 == 3 and t >= 11) else 0
    bass.add(bass_note(root + octave, 0.24, cutoff), t, 0.55)

# Plucked arpeggio 6–25.5 s (16ths), brighter after 17 s
ARP = [0, 1, 2, 1, 0, 2, 1, 2]
for i in range(int(6.0 / 0.125), int(25.5 / 0.125)):
    t = i * 0.125
    notes = chord_at(t)
    m = notes[ARP[i % 8] % 3] + 12 + (12 if (t >= 22 and i % 8 in (2, 5)) else 0)
    bright = 1600 if t < 11 else (2400 if t < 17 else 2400 + 2600 * min(1, (t - 17) / 5))
    keys.add(pluck(m, 0.22, bright), t, 0.5 if t < 11 else 0.62, pan=(-0.35 if i % 2 else 0.35))

# Pads under the groove, one per bar
for b in range(2, 13):
    start = b * 2.0
    if start >= 26: break
    pads.add(pad(PROG[b % 4], 2.05, cutoff=900 if start < 17 else 1800, attack=0.25), start, 0.28 if start < 22 else 0.36)

# 26–27 s: drop-out, reverse swell into the reveal
fx.add(riser(1.0, 600, 9000), 26.0, 0.55)
rev = pad([48, 55, 60, 64, 67], 1.0, cutoff=2500, attack=0.9)
pads.add(rev * np.linspace(0, 1, len(rev)) ** 2, 26.0, 0.6)

# 27 s: reveal — bright C major (A minor resolves to its relative major), bells spell the chord
fx.add(impact(), 27.0, 0.7)
drums.add(kick(), 27.0, 0.9)
pads.add(pad([36, 48, 55, 60, 64, 67, 72], 3.0, cutoff=3200, attack=0.05), 27.0, 0.7)
bass.add(bass_note(36, 2.8, 500) * np.linspace(1, 0.4, int(2.8 * SR)), 27.0, 0.6)
for k, m in enumerate([72, 76, 79, 84]):
    keys.add(bell(m, 2.6), 27.0 + k * 0.125, 0.55, pan=(-0.3 + 0.2 * k))

# ── mix: reverb send, sidechain duck, master
def reverb(x, secs=1.8, mix=0.22):
    t = tt(secs); ir = rng.standard_normal(len(t)) * np.exp(-t * 3.2); ir = lp(ir, 6000); ir /= np.sqrt(np.sum(ir ** 2))
    return fftconvolve(x, ir)[: len(x)] * mix

# sidechain: duck bass and pads after every kick (classic pumping drive)
duck = np.ones(N)
for i in range(int(3.0 / BEAT), int(25.5 / BEAT)):
    s = int(i * BEAT * SR); t = tt(0.28)
    duck[s:s + len(t)] = np.minimum(duck[s:s + len(t)], 1 - 0.55 * np.exp(-t * 14))

L = drums.L + (bass.L + pads.L) * duck + keys.L + fx.L
R = drums.R + (bass.R + pads.R) * duck + keys.R + fx.R
L += reverb(keys.L + pads.L * 0.6 + drums.L * 0.15); R += reverb(keys.R + pads.R * 0.6 + drums.R * 0.15)
L = hp(L, 28); R = hp(R, 28)

fade = np.ones(N); t = np.arange(N) / SR
fade *= np.clip(t / 0.8, 0, 1) ** 2
fade *= np.clip((DUR - t) / 1.2, 0, 1) ** 1.5
L *= fade; R *= fade

peak = max(np.abs(L).max(), np.abs(R).max())
L, R = np.tanh(1.2 * L / peak) / np.tanh(1.2), np.tanh(1.2 * R / peak) / np.tanh(1.2)
L *= 0.89; R *= 0.89  # about −1 dBFS

os.makedirs("public/music", exist_ok=True)
pcm = (np.stack([L, R], axis=1) * 32767).astype(np.int16)
with wave.open("public/music/rdt_theme.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("public/music/rdt_theme.wav", f"{DUR:.1f}s")
