/** Renders the final WhatsApp Status video: 1080×1920, 30 fps, H.264 + AAC, under 16 MB. */
import { renderMedia } from "@remotion/renderer";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { browserExecutable, prepare } from "./common.mjs";

const out = "out/RDT_launch_status.mp4";
const { serveUrl, composition } = await prepare();
fs.mkdirSync("out", { recursive: true });
await renderMedia({
  serveUrl, composition, codec: "h264", audioCodec: "aac", outputLocation: out,
  videoBitrate: "3800k", audioBitrate: "128k", pixelFormat: "yuv420p",
  browserExecutable: browserExecutable(),
  onProgress: ({ progress }) => process.stdout.write(`\r${Math.round(progress * 100)}%`),
});
// Bring the sound to the usual social-video loudness (−14 LUFS), video stream copied untouched.
try {
  const tmp = out.replace(".mp4", ".tmp.mp4");
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", out, "-t", String(composition.durationInFrames / composition.fps), "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", tmp]);
  fs.renameSync(tmp, out);
  console.log("\nloudness normalised to -14 LUFS");
} catch {
  console.log("\n(ffmpeg not found: skipped loudness normalisation)");
}
const mb = fs.statSync(out).size / 1e6;
console.log(`\n${out}: ${mb.toFixed(1)} MB${mb >= 16 ? "  ⚠ over the 16 MB WhatsApp limit: lower videoBitrate" : ""}`);
