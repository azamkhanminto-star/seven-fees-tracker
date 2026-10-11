import { bundle } from "@remotion/bundler";
import { selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

/** Uses a local Chromium if one is installed (set CHROME_PATH to override). */
export function browserExecutable() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const pw = "/opt/pw-browsers";
  if (fs.existsSync(pw)) {
    const dir = fs.readdirSync(pw).find((d) => d.startsWith("chromium_headless_shell-"));
    if (dir) {
      const p = path.join(pw, dir, "chrome-linux", "headless_shell");
      if (fs.existsSync(p)) return p;
    }
  }
  return null; // Remotion downloads its own browser
}

/** Which video: `node scripts/x.mjs teaser` picks the teaser, anything else the RDT launch. */
export const VIDEOS = {
  rdt: { id: "RDTLaunch", file: "RDT_launch_status.mp4", stills: [["1-hook", 2.2], ["2-twist", 4.8], ["3-upload", 9.0], ["4-diagnosis", 16.0], ["5-root-cause", 21.0], ["6-report", 25.2], ["7-reveal", 29.5]] },
  teaser: { id: "SevenTeaser", file: "SEVEN_teaser_status.mp4", stills: [["1-intro", 2.6], ["2-promise", 5.6], ["3-rdt", 9.6], ["4-care", 13.6], ["5-life-skills", 17.6], ["6-ai-kiosk", 21.6], ["7-stat", 25.4], ["8-reveal", 29.5]] },
};
export const which = VIDEOS[process.argv[2] === "teaser" ? "teaser" : "rdt"];

export async function prepare() {
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
  const composition = await selectComposition({ serveUrl, id: which.id, browserExecutable: browserExecutable() });
  return { serveUrl, composition };
}
