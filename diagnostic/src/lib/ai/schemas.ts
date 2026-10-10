/**
 * JSON shapes Claude must return at each pipeline step (structured outputs). Documents are
 * rendered only from these, never from free text.
 *
 * Structured-output rules: every field is required (use `nullable` for "may be missing"),
 * no recursive types, no numeric/length constraints the API cannot enforce.
 */
import { z } from "zod";

export const ERROR_TYPES = [
  "conceptual", "procedural", "calculation", "prerequisite_gap", "comprehension", "careless", "not_attempted",
  // Physics
  "formula_selection", "unit_conversion", "numerical_setup",
  // Chemistry
  "equation_balancing", "formula_writing", "valency", "terminology",
  // Biology
  "diagram_labelling", "process_sequencing",
] as const;
export const ErrorType = z.enum(ERROR_TYPES);

export const Confidence = z.enum(["high", "medium", "low"]);

/** One piece of evidence: a specific question in a specific paper. */
export const Evidence = z.object({
  paper: z.string().describe("Paper key exactly as given in the input, e.g. P1 or P2"),
  q: z.string().describe("Question number as printed, e.g. A9 or Q37(iii)"),
  marks: z.string().nullable().describe("Marks scored on that question, e.g. 0/1 or 1½/2"),
  observation: z.string().describe("What the student actually wrote or did"),
});
export type Evidence = z.infer<typeof Evidence>;

const QA = z.object({ q: z.string(), a: z.string() });

// ───────────── Step: paper (question paper + answer key) ─────────────
export const PaperOut = z.object({
  title: z.string(),
  total_marks: z.number(),
  duration_min: z.number().nullable(),
  questions: z.array(z.object({
    q: z.string().describe("Question number as printed"),
    section: z.string().nullable(),
    text: z.string().describe("Full question text, maths written in Unicode (x², √, ≠, θ)"),
    max_marks: z.number(),
    concept_ids: z.array(z.string()).describe("IDs from the concept map that this question tests"),
    answer: z.string().describe("Model answer with key steps"),
    marking_scheme: z.string().describe("How marks are split, e.g. '1 for factors, 1 for both zeros'"),
    key_source: z.enum(["uploaded", "drafted"]),
  })),
  notes: z.string(),
});
export type PaperOut = z.infer<typeof PaperOut>;

// ───────────── Step: read (student's answer sheet) ─────────────
export const ReadOut = z.object({
  legibility: z.enum(["good", "fair", "poor"]),
  name_visible: z.boolean().describe("True if a student name is written on the sheet"),
  notes: z.string(),
  responses: z.array(z.object({
    q: z.string(),
    attempted: z.boolean(),
    student_answer: z.string().describe("Final answer as written"),
    working: z.string().describe("The student's working, transcribed faithfully including mistakes"),
    illegible: z.boolean(),
    teacher_marks: z.number().nullable().describe("Marks written on the sheet by the teacher, if any"),
    suggested_marks: z.number().describe("Your marks against the answer key and marking scheme"),
    marking_note: z.string(),
  })),
});
export type ReadOut = z.infer<typeof ReadOut>;

// ───────────── Step: analysis → Conceptual Mistakes Report ─────────────
export const AnalysisOut = z.object({
  headline: z.string().describe("2–3 sentences: what the papers show together"),
  questions: z.array(z.object({
    paper: z.string(),
    q: z.string(),
    outcome: z.enum(["right", "wrong", "partial", "blank"]),
    what_went_wrong: z.string().describe("Empty string if right"),
    error_types: z.array(ErrorType),
    concept_ids: z.array(z.string()),
    confidence: Confidence,
  })),
  mistakes: z.array(z.object({
    title: z.string().describe("Short catchy name, e.g. 'The Missing ± Root'"),
    one_line: z.string(),
    summary: z.string().describe("Two sentences for the top of the mistake page"),
    student_writes: z.string().describe("The wrong idea in symbols, e.g. 'x² = 9 ⇒ x = 3'"),
    correct_idea: z.string(),
    recurs_in_all_papers: z.boolean(),
    evidence: z.array(Evidence),
    why_it_happens: z.string(),
    teach_this: z.string(),
    fix_type: z.enum(["one_lesson", "weeks_practice", "pattern_recognition"]),
    error_types: z.array(ErrorType),
    concept_ids: z.array(z.string()),
    confidence: Confidence,
  })),
  fixed_mistakes: z.array(z.object({
    concept: z.string(),
    before: Evidence,
    after: Evidence,
  })).describe("Only when there are two or more papers: mistakes in the earlier paper that did not recur"),
  caution: z.string().nullable(),
  genuine_strengths: z.array(z.object({ statement: z.string(), evidence: z.array(Evidence) })),
  nature_of_problem: z.object({
    primary: z.enum(["understanding", "practice", "carelessness", "confidence"]),
    explanation: z.string(),
    evidence: z.array(Evidence),
  }),
  priorities: z.array(z.object({
    rank: z.number(),
    label: z.string().describe("e.g. 'One Lesson', 'Daily · 3–4 Weeks', '2 Questions a Day'"),
    title: z.string(),
    what: z.string(),
  })),
  check_in_plan: z.array(z.object({ when: z.string(), what: z.string() })),
  closing_note: z.string().describe("One sentence: what comes back if these priorities are cleared"),
  data_gaps: z.array(z.string()),
  escalate_recommended: z.boolean().describe("True if the evidence is too thin or contradictory for a routine report"),
});
export type AnalysisOut = z.infer<typeof AnalysisOut>;

// ───────────── Step: tracing → Teacher Pack Part A ─────────────
export const TracingOut = z.object({
  weak_areas: z.array(z.object({
    title: z.string().describe("e.g. 'Brackets and Functions'"),
    fixing: z.string().describe("The mistake being fixed, e.g. 'sin(A ± B) = sin A ± sin B'"),
    mistake_titles: z.array(z.string()).describe("Titles from the analysis step that this area covers"),
    sub_skills: z.array(z.object({
      name: z.string(),
      chain: z.array(z.object({
        concept_id: z.string(),
        note: z.string().describe("What this link means here, e.g. '(a + b)² ≠ a² + b²'"),
        is_break: z.boolean(),
      })).describe("Current class first, going backwards to the foundation"),
    })),
    break_point: z.object({
      concept_id: z.string(),
      headline: z.string(),
      weak_evidence: z.array(Evidence),
      secure_evidence: z.array(Evidence),
      explanation: z.string(),
      confidence: Confidence,
    }),
  })),
  shared_roots: z.array(z.object({
    root: z.string(),
    weak_areas: z.array(z.string()),
    concept_ids: z.array(z.string()),
    evidence: z.array(Evidence),
  })),
  biggest_payoff: z.object({ concept_id: z.string(), title: z.string(), why: z.string() }),
});
export type TracingOut = z.infer<typeof TracingOut>;

// ───────────── Step: confirmation → Teacher Pack Part B + workbook level map ─────────────
export const ConfirmationOut = z.object({
  minutes: z.number(),
  how_to_give: z.string(),
  sections: z.array(z.object({
    letter: z.string().describe("A, B, C …"),
    weak_area: z.string(),
    items: z.array(z.object({
      q: z.string().describe("e.g. A4"),
      class_level: z.number(),
      concept_id: z.string(),
      concept_tested: z.string(),
      question: z.string(),
      answer: z.string(),
    })).describe("Ordered from the lowest class to the current class"),
    rules: z.array(z.object({
      if_fails: z.array(z.string()),
      break_point: z.string(),
      start_step: z.string().describe("Workbook step number, e.g. '1.2'"),
    })),
    prediction: z.string(),
    steps: z.array(z.object({
      step: z.string().describe("'1.1' = part 1, level 1"),
      level: z.number(),
      class_band: z.string().describe("e.g. 'Class 6–7'"),
      title: z.string(),
      concept_ids: z.array(z.string()),
    })).describe("Workbook levels for this weak area, lowest first (usually 4)"),
  })),
  whole_section_correct_rule: z.string(),
});
export type ConfirmationOut = z.infer<typeof ConfirmationOut>;

// ───────────── Step: workbook (one call per weak area) ─────────────
export const WorkbookStep = z.object({
  step: z.string(),
  title: z.string(),
  understand: z.string().describe("The idea in simple words, 3–5 sentences"),
  hindi_terms: z.array(z.object({ en: z.string(), hi: z.string() })),
  real_life: z.string(),
  examples: z.array(QA).describe("Exactly 2 solved examples"),
  practice: z.array(QA).describe("Exactly 5 practice questions with answers"),
  watch_out: z.array(z.string()).describe("Common mistakes, written as the wrong line"),
  checkpoint: z.array(QA).describe("Exactly 5 checkpoint questions with answers"),
});
export type WorkbookStep = z.infer<typeof WorkbookStep>;
export const WorkbookPartOut = z.object({ steps: z.array(WorkbookStep) });
export type WorkbookPartOut = z.infer<typeof WorkbookPartOut>;

// ───────────── Step: plan (day plan, final test, parent summary) ─────────────
const ParentLang = z.object({
  headline: z.string(),
  strengths: z.string(),
  working_on: z.string(),
  how_to_help: z.string(),
});
export const PlanOut = z.object({
  days: z.number(),
  minutes_per_day: z.number(),
  day_split: z.string(),
  weeks: z.array(z.object({
    title: z.string(),
    days: z.array(z.object({ day: z.number(), step: z.string().nullable(), task: z.string() })),
  })),
  final_test: z.object({
    minutes: z.number(),
    items: z.array(z.object({
      q: z.string(),
      marks: z.number(),
      question: z.string(),
      solution: z.string(),
      mirrors: z.object({ paper: z.string(), q: z.string() }),
      step: z.string().describe("Workbook step this question checks"),
    })),
  }),
  target_pct: z.number(),
  parent_summary: z.object({ en: ParentLang, hi: ParentLang }),
});
export type PlanOut = z.infer<typeof PlanOut>;

// ───────────── Step: diagnostic re-test (optional) ─────────────
export const DiagnosticTestOut = z.object({
  title: z.string(),
  minutes: z.number(),
  instructions: z.array(z.object({ title: z.string(), text: z.string() })),
  sections: z.array(z.object({
    name: z.string(),
    marks_each: z.number(),
    minutes: z.number(),
    items: z.array(z.object({
      q: z.string(),
      question: z.string(),
      answer: z.string(),
      concept_id: z.string(),
      retests: z.string().describe("Which earlier mistake or question this checks, e.g. 'P1 Q24'"),
    })),
  })),
});
export type DiagnosticTestOut = z.infer<typeof DiagnosticTestOut>;
