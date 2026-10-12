import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SUBJECTS, TEXT, VIDEO } from "./config";
import { alpha, AmbientStreaks, Background, Chip, ease, EASE_IN, EASE_IN_OUT, FONT, KineticLine, Streak } from "./lib";

const W = VIDEO.width;
const TOP = VIDEO.safeTop; // first usable y

/** Fades a whole scene out in its last 8 frames (transitions stay under 0.5 s). */
function useExit(duration: number) {
  const frame = useCurrentFrame();
  return 1 - ease(frame, [duration - 8, duration], [0, 1], EASE_IN);
}

// ───────────────────────── 0–3 s · Hook ─────────────────────────
export function Hook({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const inkCover = 1 - ease(frame, [0, 28], [0, 1], EASE_IN_OUT);
  const t = TEXT.hook;
  return (
    <AbsoluteFill>
      <Background inkCover={inkCover} />
      {[COLORS.yellow, COLORS.coral, COLORS.green, COLORS.blue].map((c, i) => (
        <Streak key={c} color={c} y={520 + i * 230} start={2 + i * 5} duration={34} angle={-16} length={900} thickness={16} />
      ))}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 56px", gap: 18, opacity: useExit(duration) }}>
        <KineticLine words={t.line1.split(" ")} start={14} size={88} weight={500} />
        <KineticLine words={[t.emphasis, ...t.line2rest.split(" ")]} start={22} size={92}
          highlight={{ [t.emphasis]: { borderBottom: `14px solid ${COLORS.coral}`, borderRadius: 8, paddingBottom: 6 } }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ───────────────────────── 3–6 s · Twist ─────────────────────────
export function Twist({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const snap = spring({ frame: frame - 10, fps, config: { damping: 13, stiffness: 220, mass: 0.6 } });
  const glow = ease(frame, [14, 34], [0, 1]);
  const t = TEXT.twist;
  return (
    <AbsoluteFill>
      <Background />
      <AmbientStreaks seed={1} intensity={0.4} />
      <Streak color={COLORS.yellow} y={980} start={8} duration={22} angle={-10} length={1000} thickness={20} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 10, opacity: useExit(duration) }}>
        <KineticLine words={t.line1.split(" ")} start={0} size={96} weight={500} stagger={2} />
        <div style={{
          fontFamily: FONT, fontWeight: 700, fontSize: 320, lineHeight: 1, color: COLORS.yellow, letterSpacing: "-0.02em",
          opacity: Math.min(1, snap * 1.4), transform: `scale(${1.35 - 0.35 * snap})`,
          textShadow: `0 0 ${40 * glow}px ${alpha(COLORS.yellow, 0.7)}, 0 0 ${110 * glow}px ${alpha(COLORS.yellow, 0.35)}`,
        }}>{t.emphasis}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ───────────────────────── Answer sheet (shared by Upload and Diagnosis) ─────────────────────────
/** Lines of "handwriting" as rounded ink strokes; `err` marks the ones that will be flagged. */
const SHEET_ROWS: { q: string; widths: number[]; err?: number }[] = [
  { q: "Q1", widths: [300, 140] },
  { q: "Q2", widths: [220, 260], err: 0 },
  { q: "Q3", widths: [360] },
  { q: "Q4", widths: [180, 200], err: 1 },
  { q: "Q5", widths: [280, 120] },
  { q: "Q6", widths: [240, 210], err: 2 },
  { q: "Q7", widths: [330] },
  { q: "Q8", widths: [200, 230], err: 3 },
];
export const SHEET = { w: 720, h: 980 };

export function AnswerSheet({ flagged = [] as number[], ticks = [] as number[] }) {
  return (
    <div style={{ width: SHEET.w, height: SHEET.h, background: COLORS.white, borderRadius: 36, padding: "56px 56px", display: "flex", flexDirection: "column", gap: 30,
      boxShadow: `0 40px 90px ${alpha(COLORS.ink, 0.45)}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 40, color: COLORS.ink }}>Maths Test</div>
        <div style={{ width: 170, height: 16, borderRadius: 16, background: alpha(COLORS.ink, 0.18) }} />
      </div>
      <div style={{ height: 4, borderRadius: 4, background: alpha(COLORS.ink, 0.1) }} />
      {SHEET_ROWS.map((r, i) => {
        const isFlag = r.err !== undefined && flagged.includes(r.err);
        const isTick = ticks.includes(i);
        return (
          <div key={r.q} style={{ display: "flex", alignItems: "center", gap: 22, position: "relative" }}>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: alpha(COLORS.ink, 0.55), width: 54 }}>{r.q}</div>
            {r.widths.map((w, k) => (
              <div key={k} style={{ width: w, height: 14, borderRadius: 14, background: isFlag ? COLORS.coral : alpha(COLORS.ink, 0.72),
                boxShadow: isFlag ? `0 0 18px ${alpha(COLORS.coral, 0.7)}` : "none" }} />
            ))}
            {isFlag ? <div style={{ position: "absolute", inset: "-14px -18px", border: `5px solid ${COLORS.coral}`, borderRadius: 999 }} /> : null}
            {isTick ? <MiniTick /> : null}
          </div>
        );
      })}
    </div>
  );
}

/** Small green-and-blue tick (the logo's motif) marking a correct answer. */
function MiniTick() {
  return (
    <svg width="58" height="44" viewBox="0 0 58 44" style={{ marginLeft: "auto" }}>
      <path d="M8 24 L20 36" stroke={COLORS.green} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M20 36 L50 8" stroke={COLORS.blue} strokeWidth="9" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ───────────────────────── 6–11 s · Upload ─────────────────────────
export function Upload({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 16, stiffness: 120 } });
  const sheetTop = 460;
  const beamY = ease(frame, [30, 115], [-40, SHEET.h + 20], EASE_IN_OUT);
  const beamOn = ease(frame, [26, 34], [0, 1]) * (1 - ease(frame, [110, 122], [0, 1], EASE_IN));
  const ticks = [0, 2, 4, 6].filter((i) => beamY > 140 + i * 102);
  return (
    <AbsoluteFill>
      <Background />
      <AmbientStreaks seed={2} intensity={0.3} />
      <div style={{ position: "absolute", top: TOP + 40, width: W, opacity: useExit(duration) }}>
        <KineticLine words={TEXT.upload.label.split(" ")} start={4} size={92} />
      </div>
      <div style={{
        position: "absolute", left: (W - SHEET.w) / 2, top: sheetTop, width: SHEET.w, height: SHEET.h,
        transform: `translateY(${(1 - enter) * 1200}px) rotate(${(1 - enter) * -8}deg)`, overflow: "visible",
      }}>
        <AnswerSheet ticks={ticks} />
        {/* scanning light beam */}
        <div style={{ position: "absolute", left: -40, right: -40, top: beamY, height: 12, borderRadius: 12, background: COLORS.white, opacity: beamOn,
          boxShadow: `0 0 30px ${COLORS.white}, 0 0 80px ${alpha(COLORS.mintSoft, 0.8)}` }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: Math.max(0, beamY - 160), height: Math.min(160, Math.max(0, beamY)), borderRadius: 24,
          background: `linear-gradient(180deg, ${alpha(COLORS.mintSoft, 0)}, ${alpha(COLORS.mintSoft, 0.28)})`, opacity: beamOn }} />
      </div>
    </AbsoluteFill>
  );
}

// ───────────────────────── 11–17 s · Diagnosis ─────────────────────────
export function Diagnosis({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = TEXT.diagnosis;
  // Sheet shrinks from the Upload position to the top of the frame.
  const shrink = ease(frame, [0, 16], [0, 1], EASE_IN_OUT);
  const scale = 1 - 0.42 * shrink;
  const sheetTop = 460 + (TOP + 140 - 460) * shrink;
  const flagged = [0, 1, 2, 3].filter((i) => frame >= 18 + i * 15);
  const exit = useExit(duration);
  const chipColors = [COLORS.yellow, COLORS.white, COLORS.mintSoft, COLORS.skySoft];
  return (
    <AbsoluteFill>
      <Background />
      <AmbientStreaks seed={3} intensity={0.25} />
      <div style={{ position: "absolute", top: TOP + 20, width: W, opacity: exit }}>
        <KineticLine words={t.label.split(" ")} start={6} size={64} weight={700} stagger={2} />
      </div>
      <div style={{ position: "absolute", left: (W - SHEET.w) / 2, top: sheetTop, width: SHEET.w, height: SHEET.h, transform: `scale(${scale})`, transformOrigin: "top center", opacity: exit }}>
        <AnswerSheet flagged={flagged} ticks={[0, 2, 4, 6]} />
      </div>
      {/* error-type chips */}
      <div style={{ position: "absolute", top: 1000, left: 60, right: 60, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20, opacity: exit }}>
        {t.chips.map((c, i) => {
          const p = spring({ frame: frame - (22 + i * 15), fps, config: { damping: 12, stiffness: 180, mass: 0.7 } });
          return (
            <div key={c} style={{ transform: `scale(${p}) translateY(${(1 - p) * -120}px)`, opacity: Math.min(1, p * 1.5) }}>
              <Chip text={c} bg={COLORS.ink} color={COLORS.white} size={48} style={{ border: `4px solid ${chipColors[i]}` }} />
            </div>
          );
        })}
      </div>
      {/* the four subjects as four bars */}
      <div style={{ position: "absolute", top: 1220, left: 90, right: 90, display: "flex", flexDirection: "column", gap: 26, opacity: exit }}>
        {SUBJECTS.map((s, i) => {
          const start = 92 + i * 8;
          const grow = ease(frame, [start, start + 26], [0, 1]);
          const label = ease(frame, [start, start + 12], [0, 1]);
          return (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <div style={{ width: 300, fontFamily: FONT, fontWeight: 500, fontSize: 52, color: COLORS.white, opacity: label, transform: `translateX(${(1 - label) * -40}px)` }}>{s.name}</div>
              <div style={{ flex: 1, height: 26, borderRadius: 26, background: alpha(COLORS.white, 0.12) }}>
                <div style={{ width: `${grow * (100 - i * 9)}%`, height: "100%", borderRadius: 26, background: s.color, boxShadow: `0 0 26px ${alpha(s.color, 0.7)}` }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ───────────────────────── 17–22 s · Root cause (hero) ─────────────────────────
export function RootCause({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const t = TEXT.rootCause;
  const x = 300;
  const y0 = 690;
  const gap = 250;
  const last = t.breakAt;
  const draw = ease(frame, [14, 92], [0, 1], EASE_IN_OUT); // 0..1 along the chain to the break node
  const lineEnd = y0 + draw * gap * last;
  const reached = (i: number) => lineEnd >= y0 + i * gap - 2;
  const breakT = frame - 94;
  const exit = useExit(duration);
  return (
    <AbsoluteFill>
      <Background />
      <AmbientStreaks seed={4} intensity={0.25} />
      <div style={{ position: "absolute", top: TOP + 40, width: W, display: "flex", flexDirection: "column", gap: 4, opacity: exit }}>
        <KineticLine words={t.line1.split(" ")} start={2} size={84} weight={500} />
        <KineticLine words={t.line2.split(" ")} start={8} size={84} />
      </div>
      <svg width={W} height={VIDEO.height} style={{ position: "absolute", inset: 0, opacity: exit }}>
        {/* faint track */}
        <line x1={x} y1={y0} x2={x} y2={y0 + gap * (t.classes.length - 1)} stroke={alpha(COLORS.white, 0.16)} strokeWidth={18} strokeLinecap="round" />
        {/* travelling chain */}
        <line x1={x} y1={y0} x2={x} y2={lineEnd} stroke={COLORS.yellow} strokeWidth={18} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 14px ${alpha(COLORS.yellow, 0.8)})` }} />
        {/* break-point pulse */}
        {breakT >= 0 ? [0, 12, 24].map((d) => {
          const p = ease(breakT - d, [0, 30], [0, 1]);
          return p > 0 && p < 1 ? <circle key={d} cx={x} cy={y0 + gap * last} r={30 + p * 110} fill="none" stroke={COLORS.coral} strokeWidth={8 * (1 - p) + 1} opacity={1 - p} /> : null;
        }) : null}
      </svg>
      {t.classes.map((c, i) => {
        const on = reached(i);
        const isBreak = i === last && breakT >= 0;
        const pop = ease(frame, [14 + (92 - 14) * (i / Math.max(1, last)), 14 + (92 - 14) * (i / Math.max(1, last)) + 10], [0, 1]);
        const y = y0 + i * gap;
        return (
          <div key={c} style={{ position: "absolute", left: x - 34, top: y - 34, display: "flex", alignItems: "center", gap: 46, opacity: exit }}>
            <div style={{ width: 68, height: 68, borderRadius: 68, border: `8px solid ${on ? (isBreak ? COLORS.coral : COLORS.yellow) : alpha(COLORS.white, 0.35)}`,
              background: isBreak ? COLORS.coral : on ? COLORS.teal : "transparent", transform: `scale(${on ? 1 + 0.25 * (1 - pop) : 1})`,
              boxShadow: isBreak ? `0 0 40px ${alpha(COLORS.coral, 0.8)}` : on ? `0 0 24px ${alpha(COLORS.yellow, 0.6)}` : "none" }} />
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 72, color: on ? COLORS.white : alpha(COLORS.white, 0.45) }}>{c}</div>
            {isBreak ? (
              <div style={{ opacity: ease(breakT, [4, 14], [0, 1]), transform: `translateX(${(1 - ease(breakT, [4, 14], [0, 1])) * 30}px)` }}>
                <Chip text={t.breakLabel} bg={COLORS.coral} color={COLORS.ink} size={44} />
              </div>
            ) : null}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: x + 34 + 46, top: y0 - 140, fontFamily: FONT, fontWeight: 500, fontSize: 36, letterSpacing: "0.22em", color: COLORS.mintSoft, opacity: exit * ease(frame, [6, 18], [0, 1]) }}>
        TRACING BACK
      </div>
    </AbsoluteFill>
  );
}

// ───────────────────────── 22–26 s · Report & fix ─────────────────────────
export function Report({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = TEXT.report;
  const piece = (i: number) => spring({ frame: frame - (6 + i * 7), fps, config: { damping: 15, stiffness: 160 } });
  const tickA = ease(frame, [58, 68], [0, 1], EASE_IN_OUT);
  const tickB = ease(frame, [66, 84], [0, 1], EASE_IN_OUT);
  const exit = useExit(duration);
  const sectionTitle = (s: string) => <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 40, color: COLORS.teal, letterSpacing: "0.04em" }}>{s}</div>;
  const card = piece(0);
  return (
    <AbsoluteFill>
      <Background />
      <AmbientStreaks seed={5} intensity={0.25} />
      <div style={{ position: "absolute", top: TOP + 30, width: W, display: "flex", flexDirection: "column", gap: 2, opacity: exit }}>
        <KineticLine words={t.line1.split(" ")} start={4} size={86} weight={700} />
        <KineticLine words={t.line2.split(" ")} start={12} size={86} weight={500} color={COLORS.yellow} />
      </div>
      <div style={{ position: "absolute", left: 100, right: 100, top: 560, padding: "48px 54px", background: COLORS.white, borderRadius: 40, display: "flex", flexDirection: "column", gap: 30,
        transform: `translateY(${(1 - card) * 160}px) scale(${0.92 + 0.08 * card})`, opacity: Math.min(1, card * 1.6) * exit, boxShadow: `0 40px 90px ${alpha(COLORS.ink, 0.45)}` }}>
        <div style={{ opacity: piece(1), fontFamily: FONT, fontWeight: 700, fontSize: 56, color: COLORS.ink }}>{t.cardTitle}</div>
        <div style={{ opacity: piece(2), transform: `translateX(${(1 - piece(2)) * -60}px)`, display: "flex", flexDirection: "column", gap: 14 }}>
          {sectionTitle(t.strengthTitle)}
          {SUBJECTS.map((s, i) => (
            <div key={s.name} style={{ height: 22, borderRadius: 22, background: alpha(COLORS.ink, 0.08) }}>
              <div style={{ width: `${ease(frame, [20 + i * 3, 44 + i * 3], [0, 1]) * [78, 55, 88, 64][i]}%`, height: "100%", borderRadius: 22, background: s.color }} />
            </div>
          ))}
        </div>
        <div style={{ opacity: piece(3), transform: `translateX(${(1 - piece(3)) * 60}px)`, display: "flex", flexDirection: "column", gap: 14 }}>
          {sectionTitle(t.weakTitle)}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {t.weakTopics.map((w) => <Chip key={w} text={w} bg={COLORS.ink} color={COLORS.white} size={40} />)}
          </div>
        </div>
        <div style={{ opacity: piece(4), transform: `translateX(${(1 - piece(4)) * -60}px)`, display: "flex", flexDirection: "column", gap: 12 }}>
          {sectionTitle(t.planTitle)}
          {t.planRows.map((r) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: FONT, fontWeight: 500, fontSize: 44, color: COLORS.ink }}>
              <div style={{ width: 22, height: 22, borderRadius: 22, background: COLORS.teal }} />{r}
            </div>
          ))}
        </div>
      </div>
      {/* the big green-and-blue tick drawing over the report */}
      <svg width={W} height={VIDEO.height} style={{ position: "absolute", inset: 0, opacity: exit, overflow: "visible" }}>
        <path d="M 610 1180 L 720 1290" pathLength={1} stroke={COLORS.green} strokeWidth={46} strokeLinecap="round" fill="none"
          strokeDasharray={1} strokeDashoffset={1 - tickA} style={{ filter: `drop-shadow(0 0 18px ${alpha(COLORS.green, 0.7)})` }} />
        <path d="M 720 1290 L 950 1000" pathLength={1} stroke={COLORS.blue} strokeWidth={46} strokeLinecap="round" fill="none"
          strokeDasharray={1} strokeDashoffset={1 - tickB} style={{ filter: `drop-shadow(0 0 18px ${alpha(COLORS.blue, 0.7)})` }} />
      </svg>
    </AbsoluteFill>
  );
}

