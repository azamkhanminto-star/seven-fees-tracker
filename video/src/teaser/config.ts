/**
 * SEVEN teaser reel (50 s): everything you may want to change lives here.
 * Words and USPs are taken from the SEVEN Parent Brochure.
 * Render with `npm run render:teaser`, previews with `npm run stills:teaser`.
 */
import { COLORS } from "../config";

export const T_DURATION = 50; // seconds

/** Scene start and end, in seconds. Every scene is two bars of the 96 BPM music (5 s), so each cut lands on a downbeat. */
export const T_SCENES = {
  intro: { from: 0, to: 5 },
  feel: { from: 5, to: 10 },
  usp1: { from: 10, to: 15 },
  usp2: { from: 15, to: 20 },
  usp3: { from: 20, to: 25 },
  usp4: { from: 25, to: 30 },
  stat: { from: 30, to: 35 },
  courses: { from: 35, to: 40 },
  cta: { from: 40, to: 45 },
  reveal: { from: 45, to: 50 },
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

/** Beat sync for the visuals. Must match scripts/compose-reel-indie.py (96 BPM, a bar every 2.5 s). */
export const T_BEAT = {
  from: 5, to: 44.375, every: 60 / 96,                          // the picture "breathes" on every beat
  hits: [5, 7.5, 10, 15, 20, 25, 30, 35, 40, 45],                    // a light flash on every scene cut (downbeats)
};

export const T_AUDIO = {
  music: "music/seven_reel_indie.wav" as string | null, // made by scripts/compose-reel-indie.py
  musicVolume: 0.6,
  effectsVolume: 0.4,
  cues: [
    [0.8, "pop.wav"],
    [5.0, "whoosh.wav"],
    [10.0, "whoosh.wav"], [10.7, "pop.wav"],
    [15.0, "whoosh.wav"], [15.7, "pop.wav"],
    [20.0, "whoosh.wav"], [20.7, "pop.wav"],
    [25.0, "whoosh.wav"], [25.7, "pop.wav"],
    [30.0, "whoosh.wav"],
    [35.0, "whoosh.wav"],
    [40.0, "whoosh.wav"], [40.9, "pop.wav"],
    [46.0, "reveal.wav"],
  ] as [number, string][],
};
