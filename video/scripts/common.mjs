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

export async function prepare() {
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
  const composition = await selectComposition({ serveUrl, id: "RDTLaunch", browserExecutable: browserExecutable() });
  return { serveUrl, composition };
}
