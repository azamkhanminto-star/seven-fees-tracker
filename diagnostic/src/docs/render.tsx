import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CaseBundle } from "../lib/case-model";
import { fontCss, INSTITUTE } from "./assets";
import { studentLine } from "./common";
import { mistakesReport } from "./MistakesReport";
import { teacherPack } from "./TeacherPack";
import { workbook } from "./Workbook";
import { confirmationPaper, diagnosticPaper, finalTestPaper } from "./StudentPapers";
import { parentSummary } from "./ParentSummary";
import { THEME_CSS } from "./theme";

export const DOC_TYPES = {
  mistakes_report: { label: "Conceptual Mistakes Report", audience: "Teacher / parent", build: mistakesReport },
  teacher_pack: { label: "Remedial Teacher Pack", audience: "Teacher (confidential)", build: teacherPack },
  workbook: { label: "Student Workbook", audience: "Student", build: workbook },
  confirmation_paper: { label: "Root-Cause Confirmation Paper (student copy)", audience: "Student", build: confirmationPaper },
  final_test: { label: "Final Test (student copy)", audience: "Student", build: finalTestPaper },
  diagnostic_paper: { label: "Diagnostic Test (student paper)", audience: "Student", build: diagnosticPaper },
  parent_summary: { label: "Parent Summary (English & Hindi)", audience: "Parent", build: parentSummary },
} as const;
export type DocType = keyof typeof DOC_TYPES;

export type BuiltDoc = { title: string; cover: ReactElement | null; body: ReactElement; footerLeft?: string };

/** CSS strings are quoted for use in `content:`. */
const cssString = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function pageCss(title: string, right: string): string {
  return `
@page {
  size: A4;
  margin: 17mm 15mm 18mm 15mm;
  @top-left { content: "SEVEN"; font-family: Poppins, sans-serif; font-weight: 700; font-size: 8pt; color: #0F766E; vertical-align: bottom; padding-bottom: 3mm; }
  @top-right { content: ${cssString(`${INSTITUTE.name} · ${INSTITUTE.address}`)}; font-family: Poppins, sans-serif; font-size: 7pt; color: #5F6F6D; vertical-align: bottom; padding-bottom: 3mm; }
  @bottom-left { content: counter(page, decimal-leading-zero) "   " ${cssString(title)}; font-family: Poppins, sans-serif; font-size: 7.4pt; color: #5F6F6D; vertical-align: top; padding-top: 4mm; }
  @bottom-right { content: ${cssString(right)}; font-family: Poppins, sans-serif; font-size: 7.4pt; color: #5F6F6D; vertical-align: top; padding-top: 4mm; }
}
@page cover {
  margin: 0;
  @top-left { content: none; } @top-right { content: none; } @bottom-left { content: none; } @bottom-right { content: none; }
}
.cover { page: cover; }
`;
}

export function renderDocumentHtml(type: DocType, b: CaseBundle): { html: string; title: string } {
  const doc: BuiltDoc = DOC_TYPES[type].build(b);
  const markup = renderToStaticMarkup(
    <>
      {doc.cover}
      <main className="flow">{doc.body}</main>
    </>,
  );
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title>
<style>${fontCss()}</style><style>${THEME_CSS}${pageCss(doc.footerLeft ?? doc.title, studentLine(b))}</style></head>
<body>${markup}</body></html>`;
  return { html, title: doc.title };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
