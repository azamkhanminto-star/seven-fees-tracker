import "server-only";
/**
 * The diagnostic pipeline. Each call to `advanceCase` claims the case, runs exactly one step
 * (one Claude call, or one parallel group), saves the result and returns. The job route then
 * re-invokes itself for the next step, so no single server call runs for too long and a
 * failure only repeats the step that failed.
 *
 * Order: paper → read (per paper) → [teacher checks transcript] → analysis → tracing →
 *        confirmation → workbook (one call per weak area, in parallel) → plan → needs_review.
 *
 * Privacy: Claude receives the student's code (e.g. S-1042), class, board, pronoun and the
 * answers. Never the name, school, roll number or guardian details.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type Anthropic from "@anthropic-ai/sdk";
import { fileBlock, runStep, StepError, StepRun, textBlock } from "./ai/client";
import * as S from "./ai/schemas";
import type { StepName } from "./ai/prompts";
import { loadCase, LoadedCase } from "./bundle";
import type { WorkbookPart } from "./case-model";
import { EDITION_LABEL, editionFor } from "./concepts/editions";
import type { FileRef, OutputStep, PaperRow } from "./db-types";
import { loadSettings, prices, AppSettings } from "./settings";
import { parseMarkGrid, readGrid } from "./marksheet";
import { paperScore, fmtMarks } from "./scoring";
import { BUCKET } from "./supabase/server";

const LEASE_MS = 14 * 60 * 1000;

export type AdvanceResult = "continue" | "waiting" | "done" | "busy" | "failed";

type Next =
  | { kind: "paper"; paper: PaperRow }
  | { kind: "read"; attemptId: string }
  | { kind: "marksheet"; attemptId: string }
  | { kind: "wait_transcript" }
  | { kind: "no_papers" }
  | { kind: "analysis" | "tracing" | "confirmation" | "plan" }
  | { kind: "workbook"; parts: number[] }
  | null;

const STEP_LABEL: Record<string, string> = {
  paper: "Reading the question paper",
  read: "Reading the answer sheet",
  marksheet: "Reading the marks sheet",
  analysis: "Analysing every answer",
  tracing: "Tracing root causes",
  confirmation: "Writing the confirmation paper",
  workbook: "Writing the workbook",
  plan: "Writing the plan, final test and parent summary",
  diagnostic: "Writing the diagnostic re-test",
};

export async function advanceCase(db: SupabaseClient, caseId: string): Promise<AdvanceResult> {
  const now = new Date();
  const { data: claimed } = await db.from("cases")
    .update({ lease_until: new Date(now.getTime() + LEASE_MS).toISOString() })
    .eq("id", caseId)
    .or(`lease_until.is.null,lease_until.lt.${now.toISOString()}`)
    .select("id");
  if (!claimed?.length) return "busy";

  const release = (patch: Record<string, unknown>) =>
    db.from("cases").update({ ...patch, lease_until: null, updated_at: new Date().toISOString() }).eq("id", caseId);

  try {
    const settings = await loadSettings(db);
    const c = await loadCase(db, caseId);
    const next = nextStep(c);
    if (next === null) {
      await release({ status: "needs_review", pipeline_step: null, pipeline_error: null });
      return "done";
    }
    if (next.kind === "no_papers") {
      await release({ status: "collecting", pipeline_step: null });
      return "waiting";
    }
    if (next.kind === "wait_transcript") {
      await release({ status: "transcript_review", pipeline_step: "Waiting for the teacher to check the transcription" });
      return "waiting";
    }
    await db.from("cases").update({ status: "processing", pipeline_step: STEP_LABEL[next.kind], pipeline_error: null }).eq("id", caseId);
    await runNext(db, c, next, settings);
    await release({ status: "processing" });
    return "continue";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await release({ status: "failed", pipeline_error: msg });
    return "failed";
  }
}

function nextStep(c: LoadedCase): Next {
  if (!c.attempts.length) return { kind: "no_papers" };
  for (const a of c.attempts) if (!a.paper.parsed) return { kind: "paper", paper: a.paper };
  for (const a of c.attempts) if (a.source === "scan" && !a.read_json) return { kind: "read", attemptId: a.id };
  for (const a of c.attempts) if (a.source === "marksheet" && !a.read_json) return { kind: "marksheet", attemptId: a.id };
  if (c.row.check_transcripts && c.attempts.some((a) => a.source === "scan" && !a.transcript_confirmed)) return { kind: "wait_transcript" };
  const b = c.bundle;
  if (!b.analysis) return { kind: "analysis" };
  if (!b.tracing) return { kind: "tracing" };
  if (!b.confirmation) return { kind: "confirmation" };
  const missing = b.confirmation.sections.map((_, i) => i)
    .filter((i) => !c.outputs.some((o) => o.step === "workbook" && o.part === i));
  if (missing.length) return { kind: "workbook", parts: missing };
  if (!b.plan) return { kind: "plan" };
  return null;
}

async function runNext(db: SupabaseClient, c: LoadedCase, next: Exclude<Next, null | { kind: "wait_transcript" } | { kind: "no_papers" }>, s: AppSettings) {
  const model = c.row.difficult ? s.difficult_model : s.routine_model;
  const call = <T extends import("zod").ZodType>(step: StepName, schema: T, content: Anthropic.Beta.BetaContentBlockParam[]) =>
    logged(db, c.row.id, step, () => runStep({ step, subject: "maths", model, schema, content, prices: prices(s) }));

  switch (next.kind) {
    case "paper": {
      const p = next.paper;
      const content: Anthropic.Beta.BetaContentBlockParam[] = [
        textBlock(`Question paper for ${subjectLine(c)}. Title given by the teacher: "${p.title}".`),
        ...(await fileBlocks(db, p.files)),
      ];
      if (p.typed_text) content.push(textBlock(`Question paper (typed by the teacher):\n${p.typed_text}`));
      if (p.key_files.length) content.push(textBlock("Answer key / marking scheme:"), ...(await fileBlocks(db, p.key_files)));
      else content.push(textBlock("No answer key was uploaded: draft one."));
      const run = await call("paper", S.PaperOut, content);
      await db.from("papers").update({ parsed: run.data }).eq("id", p.id);
      return;
    }
    case "read": {
      const a = c.attempts.find((x) => x.id === next.attemptId)!;
      const questions = a.paper.parsed!.questions.map((q) => ({ q: q.q, max_marks: q.max_marks, text: q.text, answer: q.answer, marking_scheme: q.marking_scheme }));
      const run = await call("read", S.ReadOut, [
        textBlock(`Question list and answer key (JSON):\n${JSON.stringify(questions)}`),
        textBlock("The student's answer sheet follows."),
        ...(await fileBlocks(db, a.files)),
      ]);
      await saveResponses(db, a.id, a.paper.parsed!, run.data);
      await db.from("attempts").update({ read_json: run.data }).eq("id", a.id);
      const illegible = run.data.responses.filter((r) => r.illegible).length / Math.max(1, run.data.responses.length);
      if (illegible > s.illegible_escalate_fraction && !c.row.difficult) {
        await db.from("cases").update({ difficult: true }).eq("id", c.row.id);
      }
      return;
    }
    case "marksheet": {
      // No AI: question-wise marks straight from the spreadsheet.
      const a = c.attempts.find((x) => x.id === next.attemptId)!;
      const f = a.files[0];
      const { data, error } = await db.storage.from(BUCKET).download(f.path);
      if (error || !data) throw new Error(`Could not read ${f.name}`);
      const marks = parseMarkGrid(await readGrid(Buffer.from(await data.arrayBuffer()), f.name));
      const paper = a.paper.parsed!;
      const unknown = marks.filter((m) => !paper.questions.some((q) => q.q === m.q)).map((m) => m.q);
      if (unknown.length) throw new Error(`The marks sheet has questions that are not in the paper: ${unknown.join(", ")}. Use the paper's question numbers.`);
      const read: S.ReadOut = {
        legibility: "good", name_visible: false, notes: "Marks entered from a marks sheet; no working available.",
        responses: paper.questions.map((q) => {
          const m = marks.find((x) => x.q === q.q);
          return { q: q.q, attempted: m?.marks != null, student_answer: "", working: "", illegible: false,
                   teacher_marks: m?.marks ?? 0, suggested_marks: m?.marks ?? 0, marking_note: "from marks sheet" };
        }),
      };
      await saveResponses(db, a.id, paper, read);
      await db.from("attempts").update({ read_json: read, transcript_confirmed: true }).eq("id", a.id);
      return;
    }
    case "analysis": {
      const run = await call("analysis", S.AnalysisOut, [textBlock(caseContext(c))]);
      await saveOutput(db, c.row.id, "analysis", 0, run.data, run.model);
      if (run.data.escalate_recommended && s.auto_escalate && !c.row.difficult && s.difficult_model !== model) {
        // Re-run the analysis with the stronger model on the next turn.
        await db.from("cases").update({ difficult: true }).eq("id", c.row.id);
        await supersede(db, c.row.id, ["analysis"]);
      }
      return;
    }
    case "tracing": {
      const run = await call("tracing", S.TracingOut, [
        textBlock(caseContext(c)),
        textBlock(`ANALYSIS (JSON):\n${JSON.stringify(slimAnalysis(c))}`),
      ]);
      await saveOutput(db, c.row.id, "tracing", 0, run.data, run.model);
      return;
    }
    case "confirmation": {
      const run = await call("confirmation", S.ConfirmationOut, [
        textBlock(studentContext(c)),
        textBlock(`MISTAKES (JSON):\n${JSON.stringify(c.bundle.analysis!.mistakes.map((m) => ({ title: m.title, student_writes: m.student_writes, evidence: m.evidence })))}`),
        textBlock(`ROOT-CAUSE TRACING (JSON):\n${JSON.stringify(c.bundle.tracing)}`),
      ]);
      await saveOutput(db, c.row.id, "confirmation", 0, run.data, run.model);
      return;
    }
    case "workbook": {
      // Weak areas run in parallel; each one first reuses approved library levels.
      const conf = c.bundle.confirmation!;
      await Promise.all(next.parts.map(async (i) => {
        const sec = conf.sections[i];
        const fixing = c.bundle.tracing?.weak_areas.find((w) => w.title === sec.weak_area)?.fixing ?? "";
        const fromLibrary = await libraryLevels(db, sec.steps);
        const missing = sec.steps.filter((st) => !fromLibrary.has(st.step));
        let written: S.WorkbookStep[] = [];
        if (missing.length) {
          const run = await call("workbook", S.WorkbookPartOut, [
            textBlock(studentContext(c)),
            textBlock(`WEAK AREA: ${sec.weak_area}\nFixing: ${fixing}\nMistakes behind it: ${JSON.stringify(c.bundle.analysis!.mistakes.filter((m) => c.bundle.tracing?.weak_areas.find((w) => w.title === sec.weak_area)?.mistake_titles.includes(m.title)).map((m) => ({ title: m.title, student_writes: m.student_writes, correct_idea: m.correct_idea })))}`),
            textBlock(`LEVELS TO WRITE (JSON):\n${JSON.stringify(missing)}`),
          ]);
          written = run.data.steps;
        }
        const steps = sec.steps.map((st) => {
          const w = written.find((x) => x.step === st.step) ?? fromLibrary.get(st.step);
          return w ? { ...w, step: st.step, title: st.title } : null;
        }).filter((x): x is S.WorkbookStep => x !== null);
        const part: WorkbookPart = { weakArea: sec.weak_area, fixing, steps };
        await saveOutput(db, c.row.id, "workbook", i, part, model);
      }));
      return;
    }
    case "plan": {
      const conf = c.bundle.confirmation!;
      const lost = c.bundle.papers.flatMap((p) => p.responses
        .filter((r) => r.marks !== null && r.marks < r.maxMarks)
        .map((r) => ({ paper: p.key, q: r.q, marks: `${fmtMarks(r.marks ?? 0)}/${fmtMarks(r.maxMarks)}`, text: p.paper.questions.find((q) => q.q === r.q)?.text ?? "" })));
      const run = await call("plan", S.PlanOut, [
        textBlock(studentContext(c)),
        textBlock(`WORKBOOK LEVELS (JSON):\n${JSON.stringify(conf.sections.map((sec) => ({ weak_area: sec.weak_area, steps: sec.steps.map((st) => ({ step: st.step, title: st.title })) })))}`),
        textBlock(`PRIORITIES AND SHARED ROOTS (JSON):\n${JSON.stringify({ priorities: c.bundle.analysis!.priorities, shared_roots: c.bundle.tracing!.shared_roots, biggest_payoff: c.bundle.tracing!.biggest_payoff })}`),
        textBlock(`QUESTIONS THAT LOST MARKS (JSON):\n${JSON.stringify(lost)}`),
        textBlock(`STRENGTHS AND MISTAKES (for the parent summary, JSON):\n${JSON.stringify({ headline: c.bundle.analysis!.headline, strengths: c.bundle.analysis!.genuine_strengths.map((x) => x.statement), mistakes: c.bundle.analysis!.mistakes.map((m) => m.one_line), latest_score_pct: Math.round(paperScore(c.bundle.papers.at(-1)!).pct) })}`),
      ]);
      await saveOutput(db, c.row.id, "plan", 0, run.data, run.model);
      return;
    }
  }
}

/** Optional: a diagnostic re-test built from the findings so far. Run on request. */
export async function generateDiagnosticTest(db: SupabaseClient, caseId: string) {
  const s = await loadSettings(db);
  const c = await loadCase(db, caseId);
  if (!c.bundle.analysis) throw new Error("Run the analysis first.");
  const model = c.row.difficult ? s.difficult_model : s.routine_model;
  const run = await logged(db, caseId, "diagnostic", () => runStep({
    step: "diagnostic", subject: "maths", model, schema: S.DiagnosticTestOut, prices: prices(s),
    content: [textBlock(caseContext(c)), textBlock(`ANALYSIS (JSON):\n${JSON.stringify(slimAnalysis(c))}`)],
  }));
  await saveOutput(db, caseId, "diagnostic", 0, run.data, run.model);
}

// ───────────────────────── helpers ─────────────────────────

async function logged<T>(db: SupabaseClient, caseId: string, step: string, fn: () => Promise<StepRun<T>>): Promise<StepRun<T>> {
  try {
    const run = await fn();
    await db.from("ai_runs").insert(usageRow(caseId, step, run, null));
    return run;
  } catch (e) {
    if (e instanceof StepError && e.partial) await db.from("ai_runs").insert(usageRow(caseId, step, e.partial, e.message));
    else await db.from("ai_runs").insert({ case_id: caseId, step, model: "-", error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

function usageRow(caseId: string, step: string, r: StepRun<unknown>, error: string | null) {
  return {
    case_id: caseId, step, model: r.model,
    input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens,
    cache_read_tokens: r.usage.cache_read_input_tokens, cache_write_tokens: r.usage.cache_creation_input_tokens,
    cost_usd: Number(r.costUsd.toFixed(5)), duration_ms: r.durationMs, stop_reason: r.stopReason, fell_back: r.fellBack, error,
  };
}

async function saveOutput(db: SupabaseClient, caseId: string, step: OutputStep, part: number, json: unknown, model: string) {
  const { data: prev } = await db.from("case_outputs").select("version").eq("case_id", caseId).eq("step", step).eq("part", part)
    .order("version", { ascending: false }).limit(1);
  const version = (prev?.[0]?.version ?? 0) + 1;
  await db.from("case_outputs").update({ superseded: true }).eq("case_id", caseId).eq("step", step).eq("part", part);
  const { error } = await db.from("case_outputs").insert({ case_id: caseId, step, part, version, json, model });
  if (error) throw new Error(`Saving ${step}: ${error.message}`);
}

/** Marks outputs as out of date (e.g. after a new paper is added) so the pipeline redoes them. */
export async function supersede(db: SupabaseClient, caseId: string, steps: OutputStep[]) {
  await db.from("case_outputs").update({ superseded: true }).eq("case_id", caseId).in("step", steps);
}

export const DOWNSTREAM: OutputStep[] = ["analysis", "tracing", "confirmation", "workbook", "plan"];

async function saveResponses(db: SupabaseClient, attemptId: string, paper: S.PaperOut, read: S.ReadOut) {
  const clamp = (v: number | null, max: number) => (v === null ? null : Math.min(max, Math.max(0, v)));
  const rows = paper.questions.map((q) => {
    const r = read.responses.find((x) => x.q === q.q);
    return {
      attempt_id: attemptId, q: q.q, max_marks: q.max_marks,
      teacher_marks: clamp(r?.teacher_marks ?? null, q.max_marks),
      suggested_marks: clamp(r?.suggested_marks ?? 0, q.max_marks),
      attempted: r?.attempted ?? false, illegible: r?.illegible ?? false,
      student_answer: r?.student_answer ?? "", working: r?.working ?? "", marking_note: r?.marking_note ?? "",
    };
  });
  const { error } = await db.from("responses").upsert(rows, { onConflict: "attempt_id,q" });
  if (error) throw new Error(`Saving responses: ${error.message}`);
}

async function libraryLevels(db: SupabaseClient, steps: S.ConfirmationOut["sections"][number]["steps"]) {
  const found = new Map<string, S.WorkbookStep>();
  const ids = steps.map((s) => s.concept_ids[0]).filter(Boolean);
  if (!ids.length) return found;
  const { data } = await db.from("workbook_steps").select("id, concept_id, content, times_used")
    .eq("status", "approved").in("concept_id", ids);
  for (const st of steps) {
    const hit = (data ?? []).find((d) => d.concept_id === st.concept_ids[0]);
    if (hit) {
      found.set(st.step, hit.content as S.WorkbookStep);
      await db.from("workbook_steps").update({ times_used: (hit.times_used ?? 0) + 1 }).eq("id", hit.id);
    }
  }
  return found;
}

async function fileBlocks(db: SupabaseClient, files: FileRef[]): Promise<Anthropic.Beta.BetaContentBlockParam[]> {
  const out: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const f of files) {
    const { data, error } = await db.storage.from(BUCKET).download(f.path);
    if (error || !data) throw new Error(`Could not read uploaded file ${f.name}`);
    out.push(fileBlock(f.mime, Buffer.from(await data.arrayBuffer()).toString("base64")));
  }
  return out;
}

function subjectLine(c: LoadedCase) {
  return `Class ${c.student.class} ${c.student.board} Mathematics`;
}

/** Identity-free description of the student. */
function studentContext(c: LoadedCase): string {
  const st = c.student;
  const books = [5, 6, 7, 8, 9, 10].filter((k) => k <= st.class)
    .map((k) => `Class ${k}: ${st.academic_year - (st.class - k)}-${String(st.academic_year - (st.class - k) + 1).slice(2)} · ${EDITION_LABEL[editionFor(k, st.class, st.academic_year)]}`);
  return [
    `STUDENT: code ${st.pseudonym} · Class ${st.class} · ${st.board} · pronoun "${st.pronoun}" · academic year ${st.academic_year}-${String(st.academic_year + 1).slice(2)}`,
    `Books the student studied (cite chapters from these editions):`,
    ...books.map((x) => `  ${x}`),
  ].join("\n");
}

/** Everything about the papers and answers, as compact JSON. */
function caseContext(c: LoadedCase): string {
  const papers = c.bundle.papers.map((p) => {
    const s = paperScore(p);
    const attempt = c.attempts.find((a) => `P${a.seq}` === p.key);
    return {
      key: p.key, title: p.title, kind: p.kind, date: p.date,
      answers_from: attempt?.source === "marksheet" ? "marks sheet only (no written working available)" : "scanned answer sheet",
      reading_notes: attempt?.read_json?.notes ?? "",
      score: `${fmtMarks(s.scored)}/${fmtMarks(s.max)} (${s.pct}%)`,
      questions: p.paper.questions.map((q) => {
        const r = p.responses.find((x) => x.q === q.q);
        return {
          q: q.q, section: q.section, text: q.text, max: q.max_marks, concepts: q.concept_ids, model_answer: q.answer,
          marks: r?.marks ?? null, attempted: r?.attempted ?? false, illegible: r?.illegible ?? false,
          student_answer: r?.studentAnswer ?? "", working: r?.working ?? "",
        };
      }),
    };
  });
  return `${studentContext(c)}\n\nPAPERS, in the order they were written (JSON):\n${JSON.stringify(papers)}`;
}

function slimAnalysis(c: LoadedCase) {
  const a = c.bundle.analysis!;
  return { ...a, questions: a.questions.filter((q) => q.outcome !== "right") };
}

/** Exposed for unit tests only. */
export const __test = { nextStep, caseContext, studentContext };
