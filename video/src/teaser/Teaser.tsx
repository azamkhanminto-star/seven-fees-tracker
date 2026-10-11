import React from "react";
import { AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, VIDEO } from "../config";
import { alpha, AmbientStreaks, Background, ease, EASE_IN, EASE_IN_OUT, FONT, KineticLine, Streak, useFonts } from "../lib";
import { LOGO_BOTTOM, LogoAssembly } from "../Reveal";
import { T_AUDIO, T_SCENES, T_TEXT, USPS } from "./config";

const W = VIDEO.width;
const TOP = VIDEO.safeTop;
const f = (s: number) => Math.round(s * VIDEO.fps);

function useExit(duration: number) {
  const frame = useCurrentFrame();
  return 1 - ease(frame, [duration - 8, duration], [0, 1], EASE_IN);
}

// ───────────────────────── icons (rounded strokes that draw themselves on) ─────────────────────────
const ICONS: Record<string, string[]> = {
  diagnose: ["M 42 18 A 24 24 0 1 1 41.9 18", "M 59 59 L 82 82", "M 28 42 L 36 42 L 40 32 L 46 52 L 50 42 L 56 42"],
  heart: ["M 50 82 C 20 62 12 46 18 32 C 24 18 42 16 50 30 C 58 16 76 18 82 32 C 88 46 80 62 50 82", "M 38 50 C 44 57 56 57 62 50"],
  rise: ["M 16 82 L 36 82 L 36 64 L 56 64 L 56 46 L 76 46 L 76 28", "M 66 22 L 78 14 L 86 26", "M 78 14 L 74 36"],
  ai: ["M 30 30 L 70 30 L 70 70 L 30 70 Z", "M 40 18 L 40 30 M 60 18 L 60 30 M 40 70 L 40 82 M 60 70 L 60 82 M 18 40 L 30 40 M 18 60 L 30 60 M 70 40 L 82 40 M 70 60 L 82 60", "M 42 56 L 50 40 L 58 56 M 45 51 L 55 51"],
  book: ["M 50 30 C 40 22 26 22 16 26 L 16 76 C 26 72 40 72 50 80 C 60 72 74 72 84 76 L 84 26 C 74 22 60 22 50 30 Z", "M 50 30 L 50 80"],
};

function Icon({ name, color, progress, size = 300 }: { name: string; color: string; progress: number; size?: number }) {
  const paths = ICONS[name] ?? ICONS.diagnose;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", filter: `drop-shadow(0 0 10px ${alpha(color, 0.7)})` }}>
      {paths.map((d, i) => {
        const p = Math.min(1, Math.max(0, progress * paths.length - i * 0.6));
        return <path key={i} d={d} pathLength={1} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={1} strokeDashoffset={1 - p} />;
      })}
    </svg>
  );
}

// ───────────────────────── 0–3.5 s · Intro ─────────────────────────
function Intro({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const t = T_TEXT.intro;
  return (
    <AbsoluteFill>
      <Background inkCover={1 - ease(frame, [0, 40], [0, 1], EASE_IN_OUT)} />
      {USPS.map((u, i) => <Streak key={i} color={u.color} y={560 + i * 220} start={6 + i * 6} duration={36} angle={-14} length={880} thickness={14} />)}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 6, opacity: useExit(duration) }}>
        <KineticLine words={[t.line1]} start={14} size={92} weight={500} color={COLORS.yellow} />
        <KineticLine words={t.line2.split(" ")} start={24} size={104} />
        <KineticLine words={t.line3.split(" ")} start={34} size={104} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ───────────────────────── 3.5–6.5 s · Promise ─────────────────────────
function Promise_({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = T_TEXT.promise;
  const snap = spring({ frame: frame - 4, fps, config: { damping: 14, stiffness: 200, mass: 0.7 } });
  return (
    <AbsoluteFill>
      <Background />
      <AmbientStreaks seed={8} intensity={0.35} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 22, opacity: useExit(duration) }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 132, color: COLORS.white, letterSpacing: "-0.02em",
          transform: `scale(${1.25 - 0.25 * snap})`, opacity: Math.min(1, snap * 1.5) }}>{t.line1}</div>
        <KineticLine words={t.line2.split(" ")} start={16} size={92} weight={500} color={COLORS.yellow} />
        <div style={{ width: ease(frame, [24, 44], [0, 520]), height: 12, borderRadius: 12, background: COLORS.yellow, boxShadow: `0 0 24px ${alpha(COLORS.yellow, 0.6)}` }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ───────────────────────── 6.5–22.5 s · the four USPs ─────────────────────────
function UspScene({ index, duration }: { index: number; duration: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = USPS[index];
  const exit = useExit(duration);
  // coloured pill wipes across the frame as the transition in
  const wipe = ease(frame, [0, 14], [0, 1], EASE_IN_OUT);
  const ring = spring({ frame: frame - 6, fps, config: { damping: 13, stiffness: 160 } });
  const draw = ease(frame, [10, 44], [0, 1], EASE_IN_OUT);
  const num = ease(frame, [4, 18], [0, 1]);
  return (
    <AbsoluteFill>
      <Background />
      <AmbientStreaks seed={10 + index} intensity={0.25} />
      {/* wipe */}
      <div style={{ position: "absolute", left: -600 + wipe * 2400, top: 700, width: 1400, height: 520, borderRadius: 520, background: u.color,
        transform: "rotate(-18deg)", opacity: 1 - ease(frame, [8, 16], [0, 1], EASE_IN), boxShadow: `0 0 120px ${alpha(u.color, 0.6)}` }} />
      <div style={{ opacity: exit }}>
        {/* number */}
        <div style={{ position: "absolute", top: TOP + 30, width: W, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 16,
          opacity: num, transform: `translateY(${(1 - num) * -30}px)` }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 120, color: u.color, textShadow: `0 0 30px ${alpha(u.color, 0.5)}` }}>{String(index + 1).padStart(2, "0")}</span>
          <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 52, color: alpha(COLORS.white, 0.7) }}>/ 04</span>
        </div>
        {/* icon in a glowing ring */}
        <div style={{ position: "absolute", top: 560, left: (W - 420) / 2, width: 420, height: 420, borderRadius: 420, border: `10px solid ${u.color}`,
          background: alpha(COLORS.ink, 0.25), display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${ring})`, boxShadow: `0 0 60px ${alpha(u.color, 0.45)}, inset 0 0 40px ${alpha(u.color, 0.25)}` }}>
          <Icon name={u.icon} color={COLORS.white} progress={draw} size={260} />
        </div>
        {/* title and line */}
        <div style={{ position: "absolute", top: 1060, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <KineticLine words={u.title.split(" ")} start={14} size={88} stagger={3} />
          <div style={{ width: ease(frame, [22, 40], [0, 300]), height: 12, borderRadius: 12, background: u.color, boxShadow: `0 0 20px ${alpha(u.color, 0.6)}` }} />
          <KineticLine words={u.line.split(" ")} start={26} size={56} weight={500} stagger={2} />
        </div>
        {/* progress: four pills */}
        <div style={{ position: "absolute", top: 1530, width: W, display: "flex", justifyContent: "center", gap: 16 }}>
          {USPS.map((x, i) => (
            <div key={i} style={{ width: i === index ? 120 : 60, height: 16, borderRadius: 16, background: i <= index ? x.color : alpha(COLORS.white, 0.18) }} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ───────────────────────── 22.5–26 s · 2000+ selections ─────────────────────────
function Stat({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const t = T_TEXT.stat;
  const count = Math.round(ease(frame, [6, 50], [0, t.number], EASE_IN_OUT));
  const done = ease(frame, [48, 58], [0, 1]);
  return (
    <AbsoluteFill>
      <Background />
      <AmbientStreaks seed={20} intensity={0.35} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 10, opacity: useExit(duration) }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 280, lineHeight: 1, color: COLORS.yellow, fontVariantNumeric: "tabular-nums",
          textShadow: `0 0 ${20 + 40 * done}px ${alpha(COLORS.yellow, 0.55)}` }}>
          {count}<span style={{ opacity: done }}>{t.suffix}</span>
        </div>
        <KineticLine words={[t.label]} start={10} size={96} />
        <KineticLine words={t.sub.split(" ")} start={18} size={52} weight={500} stagger={2} color={alpha(COLORS.white, 0.85)} />
        <div style={{ display: "flex", gap: 18, marginTop: 24 }}>
          {t.exams.split(" · ").map((e, i) => {
            const p = ease(frame, [26 + i * 5, 38 + i * 5], [0, 1]);
            return <div key={e} style={{ fontFamily: FONT, fontWeight: 700, fontSize: 56, color: COLORS.ink, background: [COLORS.yellow, COLORS.mintSoft, COLORS.skySoft][i],
              padding: "10px 34px", borderRadius: 999, opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>{e}</div>;
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ───────────────────────── 26–30 s · logo reveal ─────────────────────────
function TeaserReveal() {
  const frame = useCurrentFrame();
  const t = T_TEXT.reveal;
  const fade = (a: number) => ({ opacity: ease(frame, [a, a + 12], [0, 1]), transform: `translateY(${(1 - ease(frame, [a, a + 12], [0, 1])) * 30}px)` });
  return (
    <AbsoluteFill>
      <Background />
      <AmbientStreaks seed={6} intensity={0.22} />
      <Streak color={COLORS.yellow} y={1560} start={48} duration={30} angle={-8} length={900} thickness={12} intensity={0.8} />
      <LogoAssembly bars={USPS} />
      <div style={{ position: "absolute", top: LOGO_BOTTOM + 70, width: W, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <div style={{ display: "flex", gap: 28, ...fade(52) }}>
          {t.tagline.map((w, i) => (
            <span key={w} style={{ fontFamily: FONT, fontWeight: 700, fontSize: 60, letterSpacing: "0.16em", color: COLORS.white }}>
              {w}{i < t.tagline.length - 1 ? <span style={{ color: USPS[i].color, marginLeft: 28 }}>·</span> : null}
            </span>
          ))}
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 48, color: COLORS.ink, background: COLORS.yellow, padding: "12px 36px", borderRadius: 999, ...fade(57) }}>
          {t.admissions}
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 50, color: COLORS.white, ...fade(61) }}>{t.address}</div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 64, color: COLORS.white, letterSpacing: "0.04em", ...fade(64) }}>
          <span style={{ fontWeight: 500, fontSize: 46, color: alpha(COLORS.white, 0.8), marginRight: 18 }}>Call / WhatsApp</span>{t.phone}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ───────────────────────── timeline ─────────────────────────
export function SevenTeaser() {
  useFonts();
  const seq = (key: keyof typeof T_SCENES, node: (d: number) => React.ReactNode) => {
    const { from, to } = T_SCENES[key];
    const d = f(to) - f(from);
    return <Sequence key={key} from={f(from)} durationInFrames={d} name={key}>{node(d)}</Sequence>;
  };
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      {seq("intro", (d) => <Intro duration={d} />)}
      {seq("promise", (d) => <Promise_ duration={d} />)}
      {seq("usp1", (d) => <UspScene index={0} duration={d} />)}
      {seq("usp2", (d) => <UspScene index={1} duration={d} />)}
      {seq("usp3", (d) => <UspScene index={2} duration={d} />)}
      {seq("usp4", (d) => <UspScene index={3} duration={d} />)}
      {seq("stat", (d) => <Stat duration={d} />)}
      {seq("reveal", () => <TeaserReveal />)}
      {T_AUDIO.music ? <Audio src={staticFile(T_AUDIO.music)} volume={T_AUDIO.musicVolume} /> : null}
      {T_AUDIO.cues.map(([sec, file], i) => (
        <Sequence key={i} from={f(sec)} durationInFrames={f(3)} name={`sfx ${file}`}>
          <Audio src={staticFile(`sfx/${file}`)} volume={T_AUDIO.effectsVolume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
