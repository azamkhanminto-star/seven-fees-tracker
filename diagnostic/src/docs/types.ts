/** Document catalogue (labels only: safe to import from pages). Builders live in render.tsx. */
export const DOC_LABELS = {
  mistakes_report: { label: "Conceptual Mistakes Report", audience: "Teacher / parent" },
  teacher_pack: { label: "Remedial Teacher Pack", audience: "Teacher (confidential)" },
  workbook: { label: "Student Workbook", audience: "Student" },
  confirmation_paper: { label: "Root-Cause Confirmation Paper (student copy)", audience: "Student" },
  final_test: { label: "Final Test (student copy)", audience: "Student" },
  diagnostic_paper: { label: "Diagnostic Test (student paper)", audience: "Student" },
  parent_summary: { label: "Parent Summary (English & Hindi)", audience: "Parent" },
} as const;
export type DocType = keyof typeof DOC_LABELS;
export const isDocType = (x: string): x is DocType => x in DOC_LABELS;
