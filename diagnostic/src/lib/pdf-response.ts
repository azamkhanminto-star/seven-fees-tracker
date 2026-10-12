import "server-only";
import type { CaseBundle } from "./case-model";
import { renderDocumentHtml } from "@/docs/render";
import { DOC_LABELS, DocType } from "@/docs/types";
import { htmlToPdf } from "./pdf";

export function isDocType(x: string): x is DocType {
  return x in DOC_LABELS;
}

export async function pdfResponse(type: DocType, b: CaseBundle, draft: boolean, address?: string): Promise<Response> {
  const { html, title } = await renderDocumentHtml(type, b, { draft, address });
  const pdf = await htmlToPdf(html);
  const name = `${b.student.name} - ${title}`.replace(/[^\w .·-]/g, "").slice(0, 120);
  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${name}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
