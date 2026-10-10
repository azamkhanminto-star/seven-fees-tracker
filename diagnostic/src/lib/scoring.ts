/**
 * All arithmetic lives here, never in the AI: totals, percentages, section and chapter
 * scores, the improvement baseline, and reading the confirmation-paper results.
 */
import type { ConfirmationOut, PlanOut } from "./ai/schemas";
import type { ConfirmationMark, PaperBundle } from "./case-model";
import { lookupConcept } from "./concepts";
import { MATHS_CHAPTERS } from "./concepts/editions";

export type Score = { scored: number; max: number; pct: number };

const pct = (scored: number, max: number) => (max > 0 ? Math.round((scored / max) * 1000) / 10 : 0);

/** "54½", "7", "0.25" → nicely printed marks. */
export function fmtMarks(n: number): string {
  const whole = Math.floor(n);
  const frac = Math.round((n - whole) * 100) / 100;
  if (frac === 0) return String(whole);
  if (frac === 0.5) return whole === 0 ? "½" : `${whole}½`;
  return String(Math.round(n * 100) / 100);
}

export function paperScore(p: PaperBundle): Score {
  let scored = 0;
  let max = 0;
  for (const q of p.paper.questions) {
    max += q.max_marks;
    const r = p.responses.find((x) => x.q === q.q);
    scored += r?.marks ?? 0;
  }
  return { scored, max, pct: pct(scored, max) };
}

export function sectionScores(p: PaperBundle): { section: string; scored: number; max: number; pct: number }[] {
  const by = new Map<string, { scored: number; max: number }>();
  for (const q of p.paper.questions) {
    const key = q.section ?? "—";
    const s = by.get(key) ?? { scored: 0, max: 0 };
    s.max += q.max_marks;
    s.scored += p.responses.find((x) => x.q === q.q)?.marks ?? 0;
    by.set(key, s);
  }
  return [...by.entries()].map(([section, s]) => ({ section, ...s, pct: pct(s.scored, s.max) }));
}

/**
 * Chapter-wise scores for the strength map. A question tagged with several concepts counts
 * towards each of their chapters (current-class chapters only).
 */
export function chapterScores(p: PaperBundle, currentClass: number) {
  const by = new Map<string, { chapter: string; scored: number; max: number }>();
  for (const q of p.paper.questions) {
    const chapters = new Set<string>();
    for (const id of q.concept_ids) {
      const c = lookupConcept(id);
      if (!c || c.cls !== currentClass) continue;
      const row = MATHS_CHAPTERS[c.cls]?.find((r) => r.key === c.chapter);
      if (row) chapters.add(row.name);
    }
    for (const chapter of chapters) {
      const s = by.get(chapter) ?? { chapter, scored: 0, max: 0 };
      s.max += q.max_marks;
      s.scored += p.responses.find((x) => x.q === q.q)?.marks ?? 0;
      by.set(chapter, s);
    }
  }
  return [...by.values()].map((s) => {
    const percent = pct(s.scored, s.max);
    const level: "strong" | "average" | "weak" = percent >= 75 ? "strong" : percent >= 50 ? "average" : "weak";
    return { ...s, pct: percent, level };
  });
}

/** Marks the student scored on the original questions that the final test mirrors. */
export function baseline(plan: PlanOut, papers: PaperBundle[]) {
  const detail = plan.final_test.items.map((item) => {
    const paper = papers.find((p) => p.key === item.mirrors.paper);
    const q = paper?.paper.questions.find((x) => x.q === item.mirrors.q);
    const r = paper?.responses.find((x) => x.q === item.mirrors.q);
    return {
      finalQ: item.q,
      paper: item.mirrors.paper,
      paperName: paper?.shortName ?? item.mirrors.paper,
      q: item.mirrors.q,
      scored: r?.marks ?? 0,
      max: q?.max_marks ?? 0,
      found: Boolean(q),
    };
  });
  const found = detail.filter((d) => d.found);
  const scored = found.reduce((a, d) => a + d.scored, 0);
  const max = found.reduce((a, d) => a + d.max, 0);
  const finalMax = plan.final_test.items.reduce((a, i) => a + i.marks, 0);
  return { detail, scored, max, pct: pct(scored, max), finalMax, targetMarks: Math.ceil((plan.target_pct / 100) * finalMax) };
}

export type SectionVerdict = {
  letter: string;
  weakArea: string;
  status: "secure" | "break" | "not_marked";
  breakLevel: number | null;
  startStep: string | null;
  /** Workbook steps below the start step, which can be skipped. */
  skipSteps: string[];
  possibleSlips: string[];
  note: string;
};

const wrongness = (m: ConfirmationMark | undefined) => (m === "wrong" ? 1 : m === "half" ? 0.5 : 0);

/**
 * Applies the interpretation rule: the break point is the lowest class level where half or
 * more of that level's questions are wrong. A single wrong answer at a low level with every
 * higher level right is treated as a probable slip.
 */
export function interpretConfirmation(conf: ConfirmationOut, results: Record<string, ConfirmationMark>): SectionVerdict[] {
  return conf.sections.map((s) => {
    const marked = s.items.filter((i) => results[i.q] !== undefined);
    const stepsAsc = [...s.steps].sort((a, b) => a.step.localeCompare(b.step, undefined, { numeric: true }));
    const base = { letter: s.letter, weakArea: s.weak_area, possibleSlips: [] as string[] };
    if (marked.length === 0) {
      return { ...base, status: "not_marked", breakLevel: null, startStep: null, skipSteps: [], note: "Results not entered yet." };
    }

    const levels = [...new Set(s.items.map((i) => i.class_level))].sort((a, b) => a - b);
    const levelWrong = (lvl: number) => {
      const items = s.items.filter((i) => i.class_level === lvl);
      const w = items.reduce((a, i) => a + wrongness(results[i.q]), 0);
      return { items, w, frac: items.length ? w / items.length : 0 };
    };

    let breakLevel: number | null = null;
    for (const [k, lvl] of levels.entries()) {
      const { frac, w } = levelWrong(lvl);
      if (frac < 0.5) continue;
      // A single wrong answer with the next level up fully right is a probable slip, not a break.
      const nextUp = levels[k + 1];
      if (w <= 1 && nextUp !== undefined && levelWrong(nextUp).w === 0) continue;
      breakLevel = lvl;
      break;
    }

    // Wrong answers at levels below the break (or anywhere, if secure) are probable slips:
    // ask them again orally before deciding.
    for (const lvl of levels) {
      if (breakLevel !== null && lvl >= breakLevel) break;
      for (const i of levelWrong(lvl).items) {
        if (wrongness(results[i.q]) > 0) base.possibleSlips.push(i.q);
      }
    }

    if (breakLevel === null) {
      const last = stepsAsc.at(-1)?.step ?? null;
      return {
        ...base, status: "secure", breakLevel: null, startStep: last,
        skipSteps: stepsAsc.slice(0, -1).map((x) => x.step),
        note: "Whole section secure: give only the last level as practice before the final test.",
      };
    }

    const failedQs = levelWrong(breakLevel).items.filter((i) => wrongness(results[i.q]) > 0).map((i) => i.q);
    const rule = s.rules.find((r) => r.if_fails.some((q) => failedQs.includes(q)));
    const startStep = rule?.start_step ?? stepForLevel(stepsAsc, breakLevel);
    const skipSteps = stepsAsc.filter((x) => x.step.localeCompare(startStep ?? "", undefined, { numeric: true }) < 0).map((x) => x.step);
    return {
      ...base, status: "break", breakLevel, startStep, skipSteps,
      note: rule ? `Break point: ${rule.break_point}.` : `Break point at Class ${breakLevel}.`,
    };
  });
}

function stepForLevel(steps: ConfirmationOut["sections"][number]["steps"], cls: number): string | null {
  // Pick the lowest step whose class band reaches the break level.
  for (const st of steps) {
    const nums = (st.class_band.match(/\d+/g) ?? []).map(Number);
    if (nums.length && Math.max(...nums) >= cls) return st.step;
  }
  return steps.at(-1)?.step ?? null;
}
