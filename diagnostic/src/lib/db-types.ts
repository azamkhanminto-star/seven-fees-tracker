/** Row shapes for the tables the app reads (see supabase/migrations/0001_init.sql). */
import type { PaperOut, ReadOut } from "./ai/schemas";

export type FileRef = { path: string; mime: string; name: string };

export type StudentRow = {
  id: string; full_name: string; class: number; section: string | null; board: "CBSE" | "UP";
  school: string | null; roll_no: string | null; batch_id: string | null; pronoun: "he" | "she" | "they";
  academic_year: number; pseudonym: string; guardian_name: string | null;
  guardian_phone_enc: string | null; guardian_email_enc: string | null; status: "active" | "deleted";
  created_by: string | null; created_at: string;
};

export type CaseStatus = "collecting" | "processing" | "transcript_review" | "needs_review" | "approved" | "failed";
export type CaseRow = {
  id: string; student_id: string; subject: "maths"; status: CaseStatus; difficult: boolean;
  check_transcripts: boolean; pipeline_step: string | null; pipeline_error: string | null;
  lease_until: string | null; approved_by: string | null; approved_at: string | null;
  created_by: string | null; created_at: string; updated_at: string;
};

export type PaperRow = {
  id: string; subject: string; class: number; board: string; title: string; short_name: string;
  kind: "school_exam" | "diagnostic" | "confirmation" | "final_test" | "other";
  test_date: string | null; typed_text: string | null; files: FileRef[]; key_files: FileRef[];
  parsed: PaperOut | null; created_at: string;
};

export type AttemptRow = {
  id: string; case_id: string; paper_id: string; seq: number; source: "scan" | "marksheet";
  files: FileRef[]; read_json: ReadOut | null; transcript_confirmed: boolean; created_at: string;
};

export type ResponseRowDb = {
  id: string; attempt_id: string; q: string; max_marks: number; teacher_marks: number | null;
  suggested_marks: number | null; marks: number | null; attempted: boolean; illegible: boolean;
  student_answer: string; working: string; marking_note: string;
};

export type OutputStep = "analysis" | "tracing" | "confirmation" | "workbook" | "plan" | "diagnostic";
export type OutputRow = {
  id: string; case_id: string; step: OutputStep; part: number; version: number; json: unknown;
  edited: boolean; superseded: boolean; model: string | null; created_at: string;
};
