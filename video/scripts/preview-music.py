"""Quick music previews: existing teaser picture + a different music file + the same sound effects.
   python3 scripts/preview-music.py <music.wav> <out.mp4>   (no re-render needed)"""
import json, re, subprocess, sys
music, out = sys.argv[1], sys.argv[2]
cfg = open("src/teaser/config.ts").read()
cues = re.findall(r"\[(\d+(?:\.\d+)?), \"([\w.]+\.wav)\"\]", cfg)
mv = float(re.search(r"musicVolume: ([\d.]+)", cfg).group(1)); ev = float(re.search(r"effectsVolume: ([\d.]+)", cfg).group(1))
args = ["ffmpeg", "-loglevel", "error", "-y", "-i", "out/SEVEN_teaser_status.mp4", "-i", music]
for _, f in cues: args += ["-i", f"public/sfx/{f}"]
parts = [f"[1:a]volume={mv}[m]"]
labels = ["[m]"]
for i, (sec, _) in enumerate(cues):
    ms = int(float(sec) * 1000)
    parts.append(f"[{i + 2}:a]adelay={ms}|{ms},volume={ev}[s{i}]"); labels.append(f"[s{i}]")
parts.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0,atrim=0:30,loudnorm=I=-14:TP=-2:LRA=11[a]")
args += ["-filter_complex", ";".join(parts), "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-t", "30", "-movflags", "+faststart", out]
subprocess.run(args, check=True)
print(out)
