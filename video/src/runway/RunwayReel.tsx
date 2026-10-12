/**
 * 10-second SEVEN reel built on three Runway-generated photos (public/runway/shot1-3.png).
 * Runway gives the realistic pictures; everything with exact words, the logo and the music is
 * added here so nothing is misspelled or warped. Render with `npm run render:runway`.
 */
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { COLORS, VIDEO } from "../config";
import { alpha, Background, ease, EASE_IN_OUT, FONT, KineticLine, useFonts } from "../lib";
import { LOGO_BOTTOM, LogoAssembly } from "../Reveal";
import { USPS } from "../teaser/config";

export const R_DURATION = 10; // seconds
const f = (s: number) => Math.round(s * VIDEO.fps);

export const R_TEXT = {
  shot1: { line1: "Stuck in", line2: "Maths?" },
  shot2: { line1: "We find the", line2: "real gap", line3: "first." },
  logo: { free: "FREE", test: "Root Diagnostic Test", address: "Medical Road, Aligarh" },
};
export const R_AUDIO = { music: "music/seven_runway_sting.wav", volume: 0.9 };

/** A still photo that moves like a camera shot: slow push-in plus a gentle drift. */
function Shot({ src, from, to, zoom = [1.04, 1.16], drift = [0, -40], fadeIn = 9, fadeOut = 9 }: {
  src: string; from: number; to: number; zoom?: [number, number]; drift?: [number, number]; fadeIn?: number; fadeOut?: number;
}) {
  const frame = useCurrentFrame();
  const d = to - from;
  const p = ease(frame, [0, d], [0, 1], EASE_IN_OUT);
  const o = Math.min(ease(frame, [0, fadeIn], [0, 1]), 1 - ease(frame, [d - fadeOut, d], [0, 1]));
  return (
    <AbsoluteFill style={{ opacity: o, overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover",
        transform: `scale(${zoom[0] + (zoom[1] - zoom[0]) * p}) translateY(${drift[0] + (drift[1] - drift[0]) * p}px)` }} />
      {/* top shade so the words read on any photo */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${alpha(COLORS.ink, 0.75)} 0%, ${alpha(COLORS.ink, 0.25)} 38%, transparent 60%)` }} />
    </AbsoluteFill>
  );
}

function Shot1Text() {
  const t = R_TEXT.shot1;
  return (
    <div style={{ position: "absolute", top: VIDEO.safeTop + 40, width: VIDEO.width, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <KineticLine words={t.line1.split(" ")} start={6} size={104} weight={500} exitAt={f(3.0) - 10} />
      <KineticLine words={[t.line2]} start={12} size={160} color={COLORS.yellow} exitAt={f(3.0) - 8}
        style={{ textShadow: `0 0 40px ${alpha(COLORS.yellow, 0.45)}` }} />
    </div>
  );
}

function Shot2Text() {
  const frame = useCurrentFrame();
  const t = R_TEXT.shot2;
  const mark = ease(frame, [24, 40], [0, 1]);
  return (
    <div style={{ position: "absolute", top: VIDEO.safeTop + 40, width: VIDEO.width, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <KineticLine words={t.line1.split(" ")} start={4} size={92} weight={500} exitAt={f(3.2) - 10} />
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: -20, right: -20, top: "18%", bottom: "8%", borderRadius: 24, background: COLORS.yellow,
          transform: `scaleX(${mark})`, transformOrigin: "left", opacity: 1 - ease(frame, [f(3.2) - 10, f(3.2) - 1], [0, 1]) }} />
        <KineticLine words={t.line2.split(" ")} start={12} size={140} color={COLORS.ink} exitAt={f(3.2) - 8} style={{ position: "relative" }} />
      </div>
      <KineticLine words={[t.line3]} start={20} size={92} weight={500} exitAt={f(3.2) - 6} />
    </div>
  );
}

function LogoScene() {
  const frame = useCurrentFrame();
  const t = R_TEXT.logo;
  const wipe = ease(frame, [0, 12], [0, 1], EASE_IN_OUT);
  const pop = (a: number) => ({ opacity: ease(frame, [a, a + 10], [0, 1]), transform: `translateY(${(1 - ease(frame, [a, a + 10], [0, 1])) * 30}px)` });
  return (
    <AbsoluteFill style={{ clipPath: `circle(${wipe * 150}% at 50% 100%)` }}>
      <Background />
      <Sequence from={8}><LogoAssembly bars={USPS} /></Sequence>
      <div style={{ position: "absolute", top: LOGO_BOTTOM + 80, width: VIDEO.width, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, ...pop(44) }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 72, color: COLORS.ink, background: COLORS.yellow, borderRadius: 999, padding: "4px 36px",
            boxShadow: `0 0 40px ${alpha(COLORS.yellow, 0.5)}` }}>{t.free}</span>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 60, color: COLORS.white }}>{t.test}</span>
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 50, color: alpha(COLORS.white, 0.9), ...pop(52) }}>{t.address}</div>
      </div>
    </AbsoluteFill>
  );
}

export function RunwayReel() {
  useFonts();
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <Sequence from={0} durationInFrames={f(3.2)}>
        <Shot src="runway/shot1.png" from={0} to={f(3.2)} zoom={[1.0, 1.14]} drift={[0, 30]} fadeIn={1} />
        <Shot1Text />
      </Sequence>
      <Sequence from={f(3.0)} durationInFrames={f(3.3)}>
        <Shot src="runway/shot2.png" from={0} to={f(3.3)} zoom={[1.12, 1.02]} drift={[-30, 0]} />
        <Shot2Text />
      </Sequence>
      <Sequence from={f(6.0)} durationInFrames={f(4.0)}>
        <Shot src="runway/shot3.png" from={0} to={f(4.0)} zoom={[1.0, 1.1]} fadeOut={1} />
      </Sequence>
      <Sequence from={f(7.2)}><LogoScene /></Sequence>
      {R_AUDIO.music ? <Audio src={staticFile(R_AUDIO.music)} volume={R_AUDIO.volume} /> : null}
    </AbsoluteFill>
  );
}
