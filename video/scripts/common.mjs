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

/** Which video: `node scripts/x.mjs teaser|runway` picks that one, anything else the RDT launch. */
export const VIDEOS = {
  rdt: { id: "RDTLaunch", file: "RDT_launch_status.mp4", stills: [["1-hook", 2.2], ["2-twist", 4.8], ["3-upload", 9.0], ["4-diagnosis", 16.0], ["5-root-cause", 21.0], ["6-report", 25.2], ["7-reveal", 29.5]] },
  teaser: { id: "SevenTeaser", file: "SEVEN_teaser_reel.mp4", stills: [["01-hey", 3.2], ["02-different", 6.8], ["03-system", 9.6], ["04-rdt", 14.6], ["05-care", 19.6], ["06-life-skills", 24.6], ["07-ai", 29.6], ["08-stat", 34.6], ["09-courses", 39.6], ["10-cta", 44.6], ["11-reveal", 49.5]] },
  runway: { id: "RunwayReel", file: "SEVEN_runway_10s.mp4", stills: [["1-stuck", 1.6], ["2-gap", 4.6], ["3-class", 6.8], ["4-logo", 9.6]] },
};
export const which = VIDEOS[process.argv[2] in VIDEOS ? process.argv[2] : "rdt"];

export async function prepare() {
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
  const composition = await selectComposition({ serveUrl, id: which.id, browserExecutable: browserExecutable() });
  return { serveUrl, composition };
}
