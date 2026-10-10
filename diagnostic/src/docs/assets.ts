/**
 * Fonts and logos, embedded as data URIs so the PDF renderer needs no network access and
 * looks identical on every server.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const fontsource = (pkg: string) => path.join(ROOT, "node_modules", "@fontsource", pkg);

/** Inline a fontsource CSS file (keeps its unicode-range), replacing file URLs with data URIs. */
function inlineFontCss(pkg: string, file: string): string {
  const dir = fontsource(pkg);
  const css = fs.readFileSync(path.join(dir, file), "utf8");
  return css.replace(/url\(\.\/files\/([^)]+)\)/g, (_m, name: string) => {
    if (!name.endsWith(".woff2")) return "url(data:,)";
    const b64 = fs.readFileSync(path.join(dir, "files", name)).toString("base64");
    return `url(data:font/woff2;base64,${b64})`;
  }).replace(/,\s*url\(data:,\)\s*format\('woff'\)/g, "");
}

let fontCssCache: string | null = null;
export function fontCss(): string {
  if (fontCssCache) return fontCssCache;
  fontCssCache = [
    ...["400", "500", "600", "700"].map((w) => inlineFontCss("poppins", `${w}.css`)),
    ...["400", "600", "700"].map((w) => inlineFontCss("noto-sans", `${w}.css`)),
    ...["400", "600"].map((w) => inlineFontCss("noto-sans-devanagari", `${w}.css`)),
    inlineFontCss("noto-sans-math", "400.css"),
  ].join("\n");
  return fontCssCache;
}

/** Only the Latin Poppins 400 face, small enough for header/footer templates. */
export function footerFontCss(): string {
  const b64 = fs.readFileSync(path.join(fontsource("poppins"), "files", "poppins-latin-400-normal.woff2")).toString("base64");
  return `@font-face{font-family:Poppins;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
}

export type LogoVariant = "dark" | "light";
const logoCache: Partial<Record<LogoVariant, string>> = {};
export function logoDataUri(variant: LogoVariant): string {
  if (logoCache[variant]) return logoCache[variant]!;
  const file = variant === "dark" ? "seven-logo.svg" : "seven-logo-light.svg";
  const svg = fs.readFileSync(path.join(ROOT, "brand", file));
  return (logoCache[variant] = `data:image/svg+xml;base64,${svg.toString("base64")}`);
}

export const INSTITUTE = {
  name: "SEVEN Career Institute",
  address: process.env.INSTITUTE_ADDRESS ?? "Medical Road, Aligarh",
};
