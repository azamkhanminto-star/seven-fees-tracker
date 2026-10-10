import { describe, expect, it } from "vitest";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { STUDENT_A } from "../samples/student-a";
import * as S from "../src/lib/ai/schemas";
import { conceptMapPrompt, resolveConcept, conceptCitation } from "../src/lib/concepts";
import { editionFor, MATHS_CHAPTERS } from "../src/lib/concepts/editions";
import { MATHS_CONCEPTS, MATHS_CONCEPT_INDEX } from "../src/lib/concepts/maths";
import { costUsd } from "../src/lib/ai/pricing";
import { baseline, fmtMarks, interpretConfirmation, paperScore } from "../src/lib/scoring";

describe("concept map", () => {
  it("has unique ids, valid chapters, and prerequisites from the same or earlier classes", () => {
    expect(new Set(MATHS_CONCEPTS.map((c) => c.id)).size).toBe(MATHS_CONCEPTS.length);
    for (const c of MATHS_CONCEPTS) {
      expect(MATHS_CHAPTERS[c.cls].some((r) => r.key === c.chapter), c.id).toBe(true);
      for (const p of c.prereq) {
        const pre = MATHS_CONCEPT_INDEX[p];
        expect(pre, `${c.id} → ${p}`).toBeDefined();
        expect(pre.cls).toBeLessThanOrEqual(c.cls);
      }
    }
  });

  it("is acyclic", () => {
    const state = new Map<string, number>();
    const visit = (id: string) => {
      if (state.get(id) === 2) return;
      expect(state.get(id), `cycle at ${id}`).not.toBe(1);
      state.set(id, 1);
      MATHS_CONCEPT_INDEX[id].prereq.forEach(visit);
      state.set(id, 2);
    };
    MATHS_CONCEPTS.forEach((c) => visit(c.id));
  });

  it("produces a stable prompt (cache-safe)", () => {
    expect(conceptMapPrompt("maths")).toBe(conceptMapPrompt("maths"));
  });

  it("cites the edition the student actually used", () => {
    // Class 10 in 2026: Class 8 was 2024 (rationalised), Class 7 was 2023 (rationalised), Class 6 2022 (old)
    expect(editionFor(8, 10, 2026)).toBe("r2023");
    expect(editionFor(6, 10, 2026)).toBe("pre2023");
    // Class 8 in 2026: Class 6 was 2024 → Ganita Prakash
    expect(editionFor(6, 8, 2026)).toBe("gp");
    const t = { currentClass: 10, currentYear: 2026 };
    expect(conceptCitation(resolveConcept("M8.IDENTITIES", t))).toBe("Class 8 · Ch 8 Algebraic Expressions and Identities");
    expect(conceptCitation(resolveConcept("M8.IDENTITIES", { currentClass: 10, currentYear: 2024 }))).toBe("Class 8 · Ch 9 Algebraic Expressions and Identities");
    expect(resolveConcept("NEW:thing", t, "Something new").known).toBe(false);
  });

  it("sample case uses only known concept ids", () => {
    const ids = new Set<string>();
    STUDENT_A.papers.forEach((p) => p.paper.questions.forEach((q) => q.concept_ids.forEach((i) => ids.add(i))));
    STUDENT_A.tracing!.weak_areas.forEach((w) => w.sub_skills.forEach((s) => s.chain.forEach((l) => ids.add(l.concept_id))));
    STUDENT_A.confirmation!.sections.forEach((s) => s.items.forEach((i) => ids.add(i.concept_id)));
    for (const id of ids) expect(MATHS_CONCEPT_INDEX[id], id).toBeDefined();
  });
});

describe("scoring (no AI arithmetic)", () => {
  it("matches the reference pack totals", () => {
    const [p1, p2] = STUDENT_A.papers;
    expect(paperScore(p1)).toMatchObject({ scored: 49, max: 80 });
    expect(paperScore(p2)).toMatchObject({ scored: 54.5, max: 64 });
    expect(fmtMarks(54.5)).toBe("54½");
    expect(fmtMarks(0.5)).toBe("½");
  });

  it("computes the improvement baseline (7½ of 27 ≈ 28%)", () => {
    const b = baseline(STUDENT_A.plan!, STUDENT_A.papers);
    expect(b.scored).toBe(7.5);
    expect(b.max).toBe(27);
    expect(Math.round(b.pct)).toBe(28);
    expect(b.finalMax).toBe(27);
  });

  it("finds the break point at the lowest level with half or more wrong", () => {
    const conf = STUDENT_A.confirmation!;
    const results: Record<string, "right" | "wrong" | "half"> = {};
    conf.sections.forEach((s) => s.items.forEach((i) => (results[i.q] = "right")));
    // Section A: Class 8 identities fail; one slip at Class 6
    Object.assign(results, { A1: "wrong", A4: "wrong", A5: "half", A6: "wrong" });
    // Section D: only recognition fails
    Object.assign(results, { D10: "wrong", D11: "wrong" });
    const v = interpretConfirmation(conf, results);
    const A = v.find((x) => x.letter === "A")!;
    expect(A.status).toBe("break");
    expect(A.breakLevel).toBe(8);
    expect(A.startStep).toBe("1.2");
    expect(A.skipSteps).toEqual(["1.1"]);
    expect(A.possibleSlips).toEqual(["A1"]);
    const B = v.find((x) => x.letter === "B")!;
    expect(B.status).toBe("secure");
    expect(B.startStep).toBe("2.4");
    expect(B.skipSteps).toEqual(["2.1", "2.2", "2.3"]);
    const D = v.find((x) => x.letter === "D")!;
    expect(D.breakLevel).toBe(10);
    expect(D.startStep).toBe("4.4");
  });

  it("reports unmarked sections as not marked", () => {
    const v = interpretConfirmation(STUDENT_A.confirmation!, {});
    expect(v.every((x) => x.status === "not_marked")).toBe(true);
  });
});

describe("structured-output schemas", () => {
  it("convert to JSON schemas the API accepts", () => {
    for (const s of [S.PaperOut, S.ReadOut, S.AnalysisOut, S.TracingOut, S.ConfirmationOut, S.WorkbookPartOut, S.PlanOut, S.DiagnosticTestOut]) {
      const f = betaZodOutputFormat(s);
      expect(f.type).toBe("json_schema");
      expect(JSON.stringify(f.schema)).not.toContain('"$ref":"#"'); // no recursion
    }
  });

  it("validate the sample case outputs", () => {
    expect(S.AnalysisOut.safeParse(STUDENT_A.analysis).success).toBe(true);
    expect(S.TracingOut.safeParse(STUDENT_A.tracing).success).toBe(true);
    expect(S.ConfirmationOut.safeParse(STUDENT_A.confirmation).success).toBe(true);
    expect(S.PlanOut.safeParse(STUDENT_A.plan).success).toBe(true);
  });
});

describe("pricing", () => {
  it("costs a call including cache reads and 1-hour cache writes", () => {
    const c = costUsd("claude-sonnet-5-5", { input_tokens: 1_000_000, output_tokens: 100_000, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 100_000 });
    // 2 + 1 + 0.2 + 0.4
    expect(c).toBeCloseTo(3.6, 5);
  });
});
