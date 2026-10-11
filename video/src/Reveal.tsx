import React from "react";
import { AbsoluteFill, interpolateColors, useCurrentFrame } from "remotion";
import { COLORS, SUBJECTS, TEXT, VIDEO } from "./config";
import { alpha, AmbientStreaks, Background, ease, EASE_IN_OUT, FONT, KineticLine, Streak } from "./lib";
import logo from "./logo-parts.json";

/** Logo placement on screen. The logo's own SVG (page 2 of the PDF) is drawn here, untouched, at the end. */
const LOGO_W = 860;
const [VX, VY, VW, VH] = logo.viewBox;
const S = LOGO_W / VW;
const LOGO_H = VH * S;
const LOGO_LEFT = (VIDEO.width - LOGO_W) / 2;
const LOGO_TOP = 560;
const toScreen = ([x1, y1, x2, y2]: number[]) => ({
  left: LOGO_LEFT + (x1 - VX) * S, top: LOGO_TOP + (y1 - VY) * S, width: (x2 - x1) * S, height: (y2 - y1) * S,
});

/** Bars sweep in, slide into the logo's four bars, the tick draws as the V, SEVEN completes around it. */
export function LogoAssembly({ bars }: { bars: readonly { color: string; soft: string }[] }) {
  const frame = useCurrentFrame();
  const L = logo.onTeal;

  // 1 · bars sweep in, then slide into the logo's four bars
  const enter = ease(frame, [0, 12], [0, 1]);
  const merge = ease(frame, [10, 30], [0, 1], EASE_IN_OUT);
  // 2 · tick draws itself as the V
  const tickShort = ease(frame, [26, 34], [0, 1], EASE_IN_OUT);
  const tickLong = ease(frame, [32, 44], [0, 1], EASE_IN_OUT);
  // 3 · SEVEN completes around the tick, tagline follows
  const letters = ease(frame, [36, 52], [0, 1]);
  const tagline = ease(frame, [46, 60], [0, 1]);
  // 4 · moving bars hand over to the logo's own bars
  const handover = ease(frame, [52, 58], [0, 1]);

  const g = (inner: string, style: string) => `<g style="${style}">${inner}</g>`;
  const svg = [
    `<defs>${L.defs}</defs>`,
    g(L.se, `opacity:${letters};transform:translateX(${(1 - letters) * -26}px)`),
    g(L.en, `opacity:${letters};transform:translateX(${(1 - letters) * 26}px)`),
    g(L.tickShort, `stroke-dasharray:1;stroke-dashoffset:${1 - tickShort}`),
    g(L.tickLong, `stroke-dasharray:1;stroke-dashoffset:${1 - tickLong}`),
    g(L.bars.join(""), `opacity:${handover}`),
    g(L.tagline, `opacity:${tagline};transform:translateY(${(1 - tagline) * 6}px)`),
  ].join("");

  return (
    <>
      {bars.map((s, i) => {
        const from = { left: 140, top: 760 + i * 74, width: 800, height: 26 };
        const to = toScreen(L.barBoxes[i]);
        const lerp = (a: number, b: number) => a + (b - a) * merge;
        const color = interpolateColors(merge, [0, 1], [s.color, s.soft]);
        return (
          <div key={i} style={{
            position: "absolute", left: lerp(from.left, to.left) + (1 - enter) * -1100 * (i % 2 ? -1 : 1), top: lerp(from.top, to.top),
            width: lerp(from.width, to.width), height: lerp(from.height, to.height), borderRadius: 999, background: color,
            boxShadow: `0 0 ${24 * (1 - merge) + 6}px ${alpha(s.color, 0.6 * (1 - merge))}`, opacity: 1 - handover,
          }} />
        );
      })}
      {/* the logo itself (exact vectors from the PDF) */}
      <svg viewBox={logo.viewBox.join(" ")} width={LOGO_W} height={LOGO_H} style={{ position: "absolute", left: LOGO_LEFT, top: LOGO_TOP, overflow: "visible" }}
        dangerouslySetInnerHTML={{ __html: svg }} />
    </>
  );
}

export const LOGO_BOTTOM = LOGO_TOP + LOGO_H;

export function Reveal() {
  const frame = useCurrentFrame();
  const t = TEXT.reveal;
  return (
    <AbsoluteFill>
      <Background />
      <AmbientStreaks seed={6} intensity={0.22} />
      <Streak color={COLORS.yellow} y={1500} start={48} duration={30} angle={-8} length={900} thickness={12} intensity={0.8} />
      <LogoAssembly bars={SUBJECTS} />
      {/* product line and address */}
      <div style={{ position: "absolute", top: LOGO_BOTTOM + 120, width: VIDEO.width, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 22, opacity: ease(frame, [54, 66], [0, 1]), transform: `translateY(${(1 - ease(frame, [54, 66], [0, 1])) * 40}px)` }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 104, color: COLORS.yellow, textShadow: `0 0 30px ${alpha(COLORS.yellow, 0.45)}` }}>{t.product}</span>
          <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 56, color: COLORS.white }}>— {t.productRest}</span>
        </div>
        <div style={{ width: ease(frame, [58, 72], [0, 380]), height: 6, borderRadius: 6, background: alpha(COLORS.white, 0.35) }} />
        <KineticLine words={t.address.split(" ")} start={60} size={52} weight={500} stagger={2} style={{ letterSpacing: "0.08em" }} />
      </div>
    </AbsoluteFill>
  );
}
