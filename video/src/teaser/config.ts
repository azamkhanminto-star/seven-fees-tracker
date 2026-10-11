/**
 * SEVEN teaser reel (50 s): everything you may want to change lives here.
 * Words and USPs are taken from the SEVEN Parent Brochure.
 * Render with `npm run render:teaser`, previews with `npm run stills:teaser`.
 */
import { COLORS } from "../config";

export const T_DURATION = 50; // seconds

/** Scene start and end, in seconds. */
export const T_SCENES = {
  intro: { from: 0, to: 4 },
  feel: { from: 4, to: 9 },
  usp1: { from: 9, to: 15 },
  usp2: { from: 15, to: 21 },
  usp3: { from: 21, to: 27 },
  usp4: { from: 27, to: 33 },
  stat: { from: 33, to: 37 },
  courses: { from: 37, to: 42 },
  cta: { from: 42, to: 46 },
  reveal: { from: 46, to: 50 },
};

/**
 * The four USPs. Order and colours follow the four bars under the logo (left to right),
 * so the bars can slide into the logo at the end. `icon` picks a drawing in teaser/Teaser.tsx.
 * `points` appear one by one under the line (max 4, keep them short).
 */
export const USPS = [
  { title: "Root Diagnostic Test", line: "We find the real gap first.", color: COLORS.yellow, soft: COLORS.yellow, icon: "diagnose",
    points: ["Test", "Analyse", "Find root gap", "Personal plan"] },
  { title: "SEVEN Care Centre", line: "A happy mind learns better.", color: COLORS.coral, soft: COLORS.coralSoft, icon: "heart",
    points: ["Counselling support", "Exam-anxiety help", "Mentor check-ins"] },
  { title: "WHO 10 Life Skills", line: "Ready for exams and for life.", color: COLORS.green, soft: COLORS.mintSoft, icon: "rise",
    points: ["Critical thinking", "Problem solving", "Coping with stress"] },
  { title: "AI-Powered Learning", line: "Practice made for each child.", color: COLORS.blue, soft: COLORS.skySoft, icon: "ai",
    points: ["Instant doubt solving", "Personalised practice", "Progress reports for parents"] },
] as const;

export const T_TEXT = {
  intro: { hey: "Hey Aligarh!", line2: "Something new", line3: "is coming…" },
  feel: {
    line1: "Every student",
    line1b: "is different.",
    line2: "So we built a system",
    glow: "you've never seen before.",
  },
  stat: { number: 2000, suffix: "+", label: "Selections", sub: "by our faculty team across", exams: "AMU · JEE · NEET" },
  courses: {
    title: "Courses for every stage",
    items: [
      { name: "Class 8–12 Regular", note: "Concepts + school & board" },
      { name: "AMU Entrance", note: "Class 9 & Class 11" },
      { name: "NEET", note: "Full batch + crash course" },
      { name: "B.Tech & B.Sc Entrance", note: "Crash courses for Class 12" },
    ],
  },
  cta: { line1: "Book your child's", free: "FREE", line2: "Root Diagnostic Test", sub: "Start with the real gap." },
  reveal: {
    tagline: ["THINK", "LEARN", "RISE"],
    admissions: "Admissions open · December 2026",
    address: "Meer Heights, Medical Road, Aligarh",
  },
};

/** Beat sync for the visuals. Must match scripts/compose-reel-music.py (120 BPM pulse, hits on cuts). */
export const T_BEAT = {
  from: 4, to: 45.5, every: 0.5,                              // the zoom "breathes" on every beat
  hits: [4, 6.25, 9, 15, 21, 27, 33, 37, 42, 42.87, 46, 47.5], // a light flash on every music hit
};

export const T_AUDIO = {
  music: "music/seven_reel_pulse.wav" as string | null, // made by scripts/compose-reel-music.py
  musicVolume: 0.6,
  effectsVolume: 0.5,
  cues: [
    [0.2, "whoosh.wav"],
    [0.8, "pop.wav"],
    [4.0, "whoosh.wav"],
    [6.5, "click.wav"],
    [9.0, "whoosh.wav"], [9.7, "pop.wav"],
    [15.0, "whoosh.wav"], [15.7, "pop.wav"],
    [21.0, "whoosh.wav"], [21.7, "pop.wav"],
    [27.0, "whoosh.wav"], [27.7, "pop.wav"],
    [33.0, "whoosh.wav"],
    [37.0, "whoosh.wav"],
    [42.0, "whoosh.wav"], [42.9, "pop.wav"],
    [46.0, "whoosh.wav"],
    [47.0, "reveal.wav"],
  ] as [number, string][],
};
