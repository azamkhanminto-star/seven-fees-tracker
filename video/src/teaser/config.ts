/**
 * SEVEN teaser video: everything you may want to change lives here.
 * Words and USPs are taken from the SEVEN Parent Brochure.
 * Render with `npm run render:teaser`, previews with `npm run stills:teaser`.
 */
import { COLORS } from "../config";

/** Scene start and end, in seconds (30 s total). */
export const T_SCENES = {
  intro: { from: 0, to: 3.5 },
  promise: { from: 3.5, to: 6.5 },
  usp1: { from: 6.5, to: 10.5 },
  usp2: { from: 10.5, to: 14.5 },
  usp3: { from: 14.5, to: 18.5 },
  usp4: { from: 18.5, to: 22.5 },
  stat: { from: 22.5, to: 26 },
  reveal: { from: 26, to: 30 },
};

/**
 * The four USPs. Order and colours follow the four bars under the logo (left to right),
 * so the bars can slide into the logo at the end. `icon` picks a drawing in teaser/icons.tsx.
 * Swap in "Study Material · In-house books + digital library" (icon "book") if you prefer.
 */
export const USPS = [
  { title: "Root Diagnostic Test", line: "We find the real gap first.", color: COLORS.yellow, soft: COLORS.yellow, icon: "diagnose" },
  { title: "SEVEN Care Centre", line: "A happy mind learns better.", color: COLORS.coral, soft: COLORS.coralSoft, icon: "heart" },
  { title: "WHO 10 Life Skills", line: "Ready for exams and for life.", color: COLORS.green, soft: COLORS.mintSoft, icon: "rise" },
  { title: "AI Study Kiosk", line: "Practice made for each child.", color: COLORS.blue, soft: COLORS.skySoft, icon: "ai" },
] as const;

export const T_TEXT = {
  intro: { line1: "Aligarh,", line2: "something new", line3: "is coming." },
  promise: { line1: "Understood,", line2: "not just taught." },
  stat: { number: 2000, suffix: "+", label: "Selections", sub: "by our faculty team across", exams: "AMU · JEE · NEET" },
  reveal: {
    tagline: ["THINK", "LEARN", "RISE"],
    admissions: "Admissions open · December 2026",
    address: "Meer Heights, Medical Road, Aligarh",
    phone: "7895969239",
  },
};

export const T_AUDIO = {
  music: "music/seven_teaser.wav" as string | null, // made by scripts/compose-teaser-music.py
  musicVolume: 0.6,
  effectsVolume: 0.75,
  cues: [
    [0.2, "whoosh.wav"],
    [3.5, "whoosh.wav"],
    [6.5, "whoosh.wav"], [7.2, "pop.wav"],
    [10.5, "whoosh.wav"], [11.2, "pop.wav"],
    [14.5, "whoosh.wav"], [15.2, "pop.wav"],
    [18.5, "whoosh.wav"], [19.2, "pop.wav"],
    [22.5, "whoosh.wav"],
    [26.0, "whoosh.wav"],
    [27.0, "reveal.wav"],
  ] as [number, string][],
};
