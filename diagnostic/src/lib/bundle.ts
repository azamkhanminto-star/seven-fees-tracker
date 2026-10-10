import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisOut, ConfirmationOut, DiagnosticTestOut, PlanOut, TracingOut } from "./ai/schemas";
import type { CaseBundle, ConfirmationMark, PaperBundle, WorkbookPart } from "./case-model";
import type { AttemptRow, CaseRow, OutputRow, PaperRow, ResponseRowDb, StudentRow } from "./db-types";

export type LoadedCase = {
  row: CaseRow;
  student: StudentRow;
  attempts: (AttemptRow & { paper: PaperRow; responses: ResponseRowDb[] })[];
  outputs: OutputRow[];
  bundle: CaseBundle;
};

export async function loadCase(db: SupabaseClient, caseId: string): Promise<LoadedCase> {
  const { data: row, error } = await db.from("cases").select("*").eq("id", caseId).single<CaseRow>();
  if (error || !row) throw new Error(`Case not found: ${error?.message ?? caseId}`);
  const { data: student } = await db.from("students").select("*").eq("id", row.student_id).single<StudentRow>();
  if (!student) throw new Error("Student not found");

  const { data: attempts } = await db.from("attempts").select("*, paper:papers(*)").eq("case_id", caseId).order("seq");
  const ids = (attempts ?? []).map((a) => a.id as string);
  const { data: responses } = ids.length
    ? await db.from("responses").select("*").in("attempt_id", ids)
    : { data: [] as ResponseRowDb[] };
  const full = (attempts ?? []).map((a) => ({
    ...(a as AttemptRow),
    paper: a.paper as PaperRow,
    responses: (responses ?? []).filter((r) => r.attempt_id === a.id) as ResponseRowDb[],
  }));

  const { data: outRows } = await db.from("case_outputs").select("*").eq("case_id", caseId).eq("superseded", false)
    .order("version", { ascending: false });
  const outputs = (outRows ?? []) as OutputRow[];
  const { data: conf } = await db.from("confirmation_results").select("results").eq("case_id", caseId).maybeSingle();

  const latest = (step: OutputRow["step"], part = 0) => outputs.find((o) => o.step === step && o.part === part)?.json ?? null;
  const confirmation = latest("confirmation") as ConfirmationOut | null;
  const workbookParts = confirmation
    ? confirmation.sections.map((_, i) => latest("workbook", i) as WorkbookPart | null)
    : [];

  const papers: PaperBundle[] = full.filter((a) => a.paper.parsed).map((a) => ({
    key: `P${a.seq}`,
    title: a.paper.title,
    shortName: a.paper.short_name,
    kind: a.paper.kind,
    date: a.paper.test_date,
    paper: a.paper.parsed!,
    responses: a.paper.parsed!.questions.map((q) => {
      const r = a.responses.find((x) => x.q === q.q);
      return {
        q: q.q, maxMarks: q.max_marks, marks: r?.marks ?? null, attempted: r?.attempted ?? false,
        illegible: r?.illegible ?? false, studentAnswer: r?.student_answer ?? "", working: r?.working ?? "",
      };
    }),
  }));

  const when = new Date(full.at(-1)?.created_at ?? row.created_at);
  const bundle: CaseBundle = {
    caseId,
    subject: "maths",
    monthLabel: when.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }),
    student: {
      name: student.full_name, cls: student.class, section: student.section, rollNo: student.roll_no,
      board: student.board, pronoun: student.pronoun, year: student.academic_year,
    },
    papers,
    analysis: latest("analysis") as AnalysisOut | null,
    tracing: latest("tracing") as TracingOut | null,
    confirmation,
    workbook: workbookParts.length && workbookParts.every(Boolean) ? (workbookParts as WorkbookPart[]) : null,
    plan: latest("plan") as PlanOut | null,
    diagnostic: latest("diagnostic") as DiagnosticTestOut | null,
    confirmationResults: (conf?.results as Record<string, ConfirmationMark> | undefined) ?? null,
  };
  return { row, student, attempts: full, outputs, bundle };
}
