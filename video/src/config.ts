/**
 * RDT launch video: EVERYTHING you may want to change lives here.
 * Wording, colours, scene timings, sound cues and the optional music track.
 * Change a value, then run `npm run stills` (previews) or `npm run render` (final MP4).
 */

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  seconds: 30,
  /** WhatsApp covers these areas with its own interface; keep text and logo out of them. */
  safeTop: 250,
  safeBottom: 300,
};

/** Exact brand colours from the logo. Nothing outside this list is used. */
export const COLORS = {
  teal: "#0F766E",
  ink: "#0E0F12",
  white: "#FFFFFF",
  yellow: "#FFC72C",
  coral: "#FF5A4E",
  green: "#22B573",
  blue: "#3D8BFF",
  coralSoft: "#FF8A80",
  mintSoft: "#7FE0B4",
  skySoft: "#8EC2FF",
};

/**
 * The four bars = the four subjects. Order matches the bars under the logo
 * (left to right), so they can slide straight into place at the end.
 * `soft` is the logo's own tint of that bar on teal.
 */
export const SUBJECTS = [
  { name: "Maths", color: COLORS.yellow, soft: COLORS.yellow },
  { name: "Chemistry", color: COLORS.coral, soft: COLORS.coralSoft },
  { name: "Biology", color: COLORS.green, soft: COLORS.mintSoft },
  { name: "Physics", color: COLORS.blue, soft: COLORS.skySoft },
];

/** Scene start and end, in seconds. Each scene's own animation scales to fit. */
export const SCENES = {
  hook: { from: 0, to: 3 },
  twist: { from: 3, to: 6 },
  upload: { from: 6, to: 11 },
  diagnosis: { from: 11, to: 17 },
  rootCause: { from: 17, to: 22 },
  report: { from: 22, to: 26 },
  reveal: { from: 26, to: 30 },
};

/** On-screen words. Keep lines to 6–7 words so they read on a phone. */
export const TEXT = {
  hook: { line1: "Marks tell you", emphasis: "WHAT", line2rest: "went wrong." },
  twist: { line1: "RDT tells you", emphasis: "WHY." },
  upload: { label: "Upload the test." },
  diagnosis: {
    label: "Every mistake, diagnosed.",
    chips: ["Conceptual", "Calculation", "Prerequisite Gap", "Careless"],
  },
  rootCause: {
    line1: "Find where the gap",
    line2: "really started.",
    classes: ["Class 10", "Class 9", "Class 8", "Class 7"],
    /** Which class the chain stops at (index in `classes`). 3 = Class 7. */
    breakAt: 3,
    breakLabel: "Break point",
  },
  report: {
    line1: "Complete diagnosis.",
    line2: "Clear fix.",
    cardTitle: "Diagnostic Report",
    strengthTitle: "Strength map",
    weakTitle: "Weak topics",
    weakTopics: ["Quadratics", "Identities", "Trig ratios"],
    planTitle: "Remedial plan",
    planRows: ["Week 1 · Fix the root", "Week 2 · Practise", "Week 3 · Re-test"],
  },
  reveal: {
    product: "RDT",
    productRest: "Root Diagnostic Test",
    address: "Medical Road, Aligarh",
  },
};

/** Sound. Put a royalty-free track in public/ and set `music` to its file name to use it. */
export const AUDIO = {
  music: null as string | null, // e.g. "music.mp3"
  musicVolume: 0.35,
  effectsVolume: 0.8,
  /** Effect cues: [second, file in public/sfx]. */
  cues: [
    [0.15, "whoosh.wav"],
    [0.9, "whoosh.wav"],
    [3.0, "pop.wav"],
    [3.25, "click.wav"],
    [6.0, "whoosh.wav"],
    [7.1, "scan.wav"],
    [11.6, "click.wav"],
    [12.1, "click.wav"],
    [12.6, "click.wav"],
    [13.1, "click.wav"],
    [14.2, "pop.wav"],
    [17.0, "whoosh.wav"],
    [19.9, "pulse.wav"],
    [22.0, "whoosh.wav"],
    [24.2, "click.wav"],
    [26.0, "whoosh.wav"],
    [27.0, "reveal.wav"],
  ] as [number, string][],
};
