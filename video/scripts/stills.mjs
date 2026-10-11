/** Renders one still per main scene to out/stills/ (plus a contact sheet). */
import { renderStill } from "@remotion/renderer";
import fs from "node:fs";
import { browserExecutable, prepare, which } from "./common.mjs";

const STILLS = which.stills;
const dir = `out/stills-${which.id}`;
const { serveUrl, composition } = await prepare();
fs.mkdirSync(dir, { recursive: true });
for (const [name, sec] of STILLS) {
  await renderStill({ serveUrl, composition, frame: Math.round(sec * composition.fps), output: `${dir}/${name}.png`, browserExecutable: browserExecutable() });
  console.log("still", name);
}
