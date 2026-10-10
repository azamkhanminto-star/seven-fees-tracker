import { describe, expect, it } from "vitest";
import { STUDENT_A } from "../samples/student-a";
import { __test } from "../src/lib/pipeline";
import type { LoadedCase } from "../src/lib/bundle";

function fakeCase(over: Partial<LoadedCase["bundle"]> = {}, opts: { readDone?: boolean; check?: boolean; confirmed?: boolean } = {}): LoadedCase {
  const bundle = { ...STUDENT_A, ...over };
  const student = {
    id: "s1", full_name: "Mohammad Testname", class: 10, section: "B", board: "CBSE" as const, school: "Secret School",
    roll_no: "17", batch_id: null, pronoun: "he" as const, academic_year: 2026, pseudonym: "S-1042",
    guardian_name: "Guardian Person", guardian_phone_enc: null, guardian_email_enc: null, status: "active" as const, created_by: null, created_at: "",
  };
  bundle.student = { ...bundle.student, name: student.full_name };
  const attempts = bundle.papers.map((p, i) => ({
    id: `a${i}`, case_id: "c1", paper_id: `p${i}`, seq: i + 1, source: "scan" as const, files: [],
    read_json: opts.readDone === false ? null : { legibility: "good" as const, name_visible: false, notes: "", responses: [] },
    transcript_confirmed: opts.confirmed ?? true, created_at: "2026-10-05T00:00:00Z",
    paper: { id: `p${i}`, subject: "maths", class: 10, board: "CBSE", title: p.title, short_name: p.shortName, kind: p.kind,
             test_date: p.date, typed_text: null, files: [], key_files: [], parsed: p.paper, created_at: "" },
    responses: [],
  }));
  const outputs = (bundle.workbook ?? []).map((_, i) => ({ id: `w${i}`, case_id: "c1", step: "workbook" as const, part: i, version: 1, json: {}, edited: false, superseded: false, model: null, created_at: "" }));
  return {
    row: { id: "c1", student_id: "s1", subject: "maths", status: "processing", difficult: false, check_transcripts: opts.check ?? false,
           pipeline_step: null, pipeline_error: null, lease_until: null, approved_by: null, approved_at: null, created_by: null, created_at: "", updated_at: "" },
    student, attempts, outputs, bundle,
  };
}

describe("pipeline order", () => {
  it("reads answers, waits for a requested transcript check, then analyses in order", () => {
    expect(__test.nextStep(fakeCase({}, { readDone: false }))).toMatchObject({ kind: "read", attemptId: "a0" });
    expect(__test.nextStep(fakeCase({ analysis: null }, { check: true, confirmed: false }))).toEqual({ kind: "wait_transcript" });
    expect(__test.nextStep(fakeCase({ analysis: null }))).toEqual({ kind: "analysis" });
    expect(__test.nextStep(fakeCase({ tracing: null }))).toEqual({ kind: "tracing" });
    expect(__test.nextStep(fakeCase({ plan: null }))).toEqual({ kind: "plan" });
    expect(__test.nextStep(fakeCase())).toBeNull();
  });
});

describe("privacy: what is sent to Claude", () => {
  it("never contains the name, school, roll number or guardian", () => {
    const c = fakeCase();
    const text = __test.caseContext(c) + __test.studentContext(c);
    for (const secret of ["Mohammad", "Testname", "Secret School", "Guardian Person"]) expect(text).not.toContain(secret);
    expect(text).toContain("S-1042");
    expect(text).toContain("NCERT (rationalised, 2023–)");
  });
});
