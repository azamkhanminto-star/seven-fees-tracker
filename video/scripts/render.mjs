/** Renders the final WhatsApp Status video: 1080×1920, 30 fps, H.264 + AAC, under 16 MB. */
import { renderMedia } from "@remotion/renderer";
import fs from "node:fs";
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
const mb = fs.statSync(out).size / 1e6;
console.log(`\n${out}: ${mb.toFixed(1)} MB${mb >= 16 ? "  ⚠ over the 16 MB WhatsApp limit: lower videoBitrate" : ""}`);
