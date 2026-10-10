/**
 * The "case bundle": everything the four documents are rendered from. Built from the database
 * (student, papers, responses) plus the JSON returned at each pipeline step.
 */
import type {
  AnalysisOut, ConfirmationOut, DiagnosticTestOut, PaperOut, PlanOut, TracingOut, WorkbookStep,
} from "./ai/schemas";

export type Pronoun = "he" | "she" | "they";

export type StudentInfo = {
  name: string;
  cls: number;
  section: string | null;
  rollNo: string | null;
  board: "CBSE" | "UP";
  pronoun: Pronoun;
  /** Academic start year of the current class, e.g. 2026 for 2026-27. */
  year: number;
};

export type ResponseRow = {
  q: string;
  maxMarks: number;
  marks: number | null; // null = not yet marked
  attempted: boolean;
  illegible: boolean;
  studentAnswer: string;
  working: string;
};

export type PaperBundle = {
  key: string; // "P1", "P2" …
  title: string; // "DPS GBN Half-Yearly, Set C"
  shortName: string; // "Half-Yearly Exam"
  kind: "school_exam" | "diagnostic" | "confirmation" | "final_test" | "other";
  date: string | null;
  paper: PaperOut;
  responses: ResponseRow[];
};

export type ConfirmationMark = "right" | "wrong" | "half";

export type CaseBundle = {
  caseId: string;
  subject: "maths";
  monthLabel: string; // "October 2026"
  student: StudentInfo;
  papers: PaperBundle[];
  analysis: AnalysisOut | null;
  tracing: TracingOut | null;
  confirmation: ConfirmationOut | null;
  workbook: { weakArea: string; fixing: string; steps: WorkbookStep[] }[] | null;
  plan: PlanOut | null;
  diagnostic: DiagnosticTestOut | null;
  confirmationResults: Record<string, ConfirmationMark> | null;
};
