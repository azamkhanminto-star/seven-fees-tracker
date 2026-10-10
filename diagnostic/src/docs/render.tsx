import type { ReactElement } from "react";
import type { CaseBundle } from "../lib/case-model";
import { fontCss, INSTITUTE } from "./assets";
import { studentLine } from "./common";
import { mistakesReport } from "./MistakesReport";
import { teacherPack } from "./TeacherPack";
import { workbook } from "./Workbook";
import { confirmationPaper, diagnosticPaper, finalTestPaper } from "./StudentPapers";
import { parentSummary } from "./ParentSummary";
import { THEME_CSS } from "./theme";
import { DOC_LABELS, DocType } from "./types";

const BUILDERS = {
  mistakes_report: mistakesReport,
  teacher_pack: teacherPack,
  workbook,
  confirmation_paper: confirmationPaper,
  final_test: finalTestPaper,
  diagnostic_paper: diagnosticPaper,
  parent_summary: parentSummary,
} satisfies Record<DocType, (b: CaseBundle) => BuiltDoc>;
export { DOC_LABELS as DOC_TYPES };
export type { DocType };

export type BuiltDoc = { title: string; cover: ReactElement | null; body: ReactElement; footerLeft?: string };

/** CSS strings are quoted for use in `content:`. */
const cssString = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function pageCss(title: string, right: string, address: string): string {
  return `
@page {
  size: A4;
  margin: 17mm 15mm 18mm 15mm;
  @top-left { content: "SEVEN"; font-family: Poppins, sans-serif; font-weight: 700; font-size: 8pt; color: #0F766E; vertical-align: bottom; padding-bottom: 3mm; }
  @top-right { content: ${cssString(`${INSTITUTE.name} · ${address}`)}; font-family: Poppins, sans-serif; font-size: 7pt; color: #5F6F6D; vertical-align: bottom; padding-bottom: 3mm; }
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

export async function renderDocumentHtml(type: DocType, b: CaseBundle, opts: { draft?: boolean; address?: string } = {}): Promise<{ html: string; title: string }> {
  const doc: BuiltDoc = BUILDERS[type](b);
  // Loaded lazily: Next.js forbids a static react-dom/server import in app code.
  const { renderToStaticMarkup } = await import("react-dom/server");
  const markup = renderToStaticMarkup(
    <>
      {doc.cover}
      <main className="flow">{doc.body}</main>
    </>,
  );
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title>
<style>${fontCss()}</style><style>${THEME_CSS}${pageCss(doc.footerLeft ?? doc.title, studentLine(b), opts.address ?? INSTITUTE.address)}</style></head>
<body>${opts.draft ? DRAFT_MARK : ""}${markup}</body></html>`;
  return { html, title: doc.title };
}

/** Shown on every page until a teacher approves the report. */
const DRAFT_MARK = `<style>.draft-mark{position:fixed;top:45%;left:0;right:0;text-align:center;font:700 64pt Poppins,sans-serif;color:rgba(217,58,47,.10);transform:rotate(-30deg);z-index:9;pointer-events:none}</style><div class="draft-mark">DRAFT · NOT APPROVED</div>`;

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
