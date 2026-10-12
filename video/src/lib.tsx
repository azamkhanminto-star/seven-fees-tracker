import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COLORS, VIDEO } from "./config";

/** House easing: fast start, soft landing. No linear motion anywhere. */
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const EASE_IN = Easing.bezier(0.55, 0, 1, 0.45);

/** Eased, clamped interpolation over local frames. */
export function ease(frame: number, [f0, f1]: [number, number], [v0, v1]: [number, number], easing = EASE_OUT) {
  return interpolate(frame, [f0, f1], [v0, v1], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

/** rgba() of a brand hex colour (opacity only; the colour itself stays on-palette). */
export function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export const FONT = "Poppins";

/** Loads the bundled Poppins Medium and Bold before any frame renders. */
export function useFonts() {
  const [handle] = useState(() => delayRender("Loading Poppins"));
  useEffect(() => {
    const faces = [
      new FontFace(FONT, `url(${staticFile("fonts/poppins-latin-500-normal.woff2")}) format("woff2")`, { weight: "500" }),
      new FontFace(FONT, `url(${staticFile("fonts/poppins-latin-700-normal.woff2")}) format("woff2")`, { weight: "700" }),
    ];
    Promise.all(faces.map((f) => f.load())).then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    });
  }, [handle]);
}

/** Deep teal space: teal base, ink vignette. `inkCover` (0–1) blacks the whole frame out. */
export function Background({ inkCover = 0 }: { inkCover?: number }) {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.teal }}>
      <AbsoluteFill style={{ background: `radial-gradient(120% 75% at 50% 45%, ${alpha(COLORS.ink, 0)} 35%, ${alpha(COLORS.ink, 0.55)} 100%)` }} />
      <AbsoluteFill style={{ backgroundColor: COLORS.ink, opacity: inkCover }} />
    </AbsoluteFill>
  );
}

/** A glowing pill-shaped light streak racing across the frame. */
export function Streak({ color, y, start, duration, angle = -14, length = 760, thickness = 14, intensity = 1 }: {
  color: string; y: number; start: number; duration: number; angle?: number; length?: number; thickness?: number; intensity?: number;
}) {
  const frame = useCurrentFrame();
  if (frame < start || frame > start + duration) return null;
  const x = ease(frame, [start, start + duration], [-length - 200, VIDEO.width + 200], EASE_IN_OUT);
  const fade = ease(frame, [start, start + duration * 0.25], [0, 1]) * ease(frame, [start + duration * 0.7, start + duration], [1, 0], EASE_IN);
  return (
    <div style={{
      position: "absolute", left: x, top: y, width: length, height: thickness, borderRadius: thickness,
      transform: `rotate(${angle}deg)`, transformOrigin: "left center", opacity: fade * intensity,
      background: `linear-gradient(90deg, ${alpha(color, 0)} 0%, ${alpha(color, 0.65)} 70%, ${COLORS.white} 100%)`,
      boxShadow: `0 0 ${thickness * 2.5}px ${alpha(color, 0.75)}, 0 0 ${thickness * 6}px ${alpha(color, 0.35)}`,
    }} />
  );
}

/** Slow ambient streaks in the background of every scene. */
export function AmbientStreaks({ seed = 0, intensity = 0.35 }: { seed?: number; intensity?: number }) {
  const colors = [COLORS.yellow, COLORS.coral, COLORS.green, COLORS.blue];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {colors.map((c, i) => (
        <Streak key={i} color={c} y={360 + ((i * 397 + seed * 211) % 1200)} start={(i * 23 + seed * 7) % 40} duration={95 + i * 9}
          angle={-12 - (i % 2) * 6} length={520} thickness={8} intensity={intensity} />
      ))}
    </AbsoluteFill>
  );
}

/** Words rise into place one after another, then the line leaves quickly at `exitAt`. */
export function KineticLine({ words, start, size, weight = 700, color = COLORS.white, stagger = 3, exitAt, style, highlight }: {
  words: string[]; start: number; size: number; weight?: number; color?: string; stagger?: number; exitAt?: number;
  style?: React.CSSProperties; highlight?: Record<string, React.CSSProperties>;
}) {
  const frame = useCurrentFrame();
  const exit = exitAt === undefined ? 0 : ease(frame, [exitAt, exitAt + 9], [0, 1], EASE_IN);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${size * 0.26}px`, fontFamily: FONT, fontWeight: weight,
      fontSize: size, lineHeight: 1.12, color, letterSpacing: "-0.01em", opacity: 1 - exit, transform: `translateY(${-40 * exit}px)`, ...style }}>
      {words.map((w, i) => {
        const s = start + i * stagger;
        const p = ease(frame, [s, s + 12], [0, 1]);
        return (
          <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 60}px)`, filter: `blur(${(1 - p) * 8}px)`, ...(highlight?.[w] ?? {}) }}>
            {w}
          </span>
        );
      })}
    </div>
  );
}

/** Rounded pill label. */
export function Chip({ text, bg, color, size = 48, style }: { text: string; bg: string; color: string; size?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: size, color, background: bg, padding: `${size * 0.22}px ${size * 0.6}px`,
      borderRadius: 999, whiteSpace: "nowrap", lineHeight: 1.2, ...style }}>{text}</div>
  );
}
