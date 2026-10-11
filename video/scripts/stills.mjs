/** Renders one still per main scene to out/stills/ (plus a contact sheet). */
import { renderStill } from "@remotion/renderer";
import fs from "node:fs";
import { browserExecutable, prepare } from "./common.mjs";

const STILLS = [
  ["1-hook", 2.2], ["2-twist", 4.8], ["3-upload", 9.0], ["4-diagnosis", 16.0],
  ["5-root-cause", 21.0], ["6-report", 25.2], ["7-reveal", 29.5],
];
const { serveUrl, composition } = await prepare();
fs.mkdirSync("out/stills", { recursive: true });
for (const [name, sec] of STILLS) {
  await renderStill({ serveUrl, composition, frame: Math.round(sec * composition.fps), output: `out/stills/${name}.png`, browserExecutable: browserExecutable() });
  console.log("still", name);
}
