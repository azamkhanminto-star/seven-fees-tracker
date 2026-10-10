/**
 * Renders the de-identified sample case to PDFs in samples/output/ (no API calls).
 *   CHROME_PATH=/path/to/chrome npm run render:sample [docType …]
 */
import fs from "node:fs";
import path from "node:path";
import { STUDENT_A } from "../samples/student-a";
import { DOC_TYPES, DocType, renderDocumentHtml } from "../src/docs/render";
import { closeBrowser, htmlToPdf } from "../src/lib/pdf";

async function main() {
  const out = path.join(process.cwd(), "samples", "output");
  fs.mkdirSync(out, { recursive: true });
  const wanted = (process.argv.slice(2) as DocType[]).filter((t) => t in DOC_TYPES);
  const types = wanted.length ? wanted : (Object.keys(DOC_TYPES) as DocType[]);
  for (const t of types) {
    try {
      const { html } = renderDocumentHtml(t, STUDENT_A);
      fs.writeFileSync(path.join(out, `${t}.html`), html);
      fs.writeFileSync(path.join(out, `${t}.pdf`), await htmlToPdf(html));
      console.log(`✓ ${t}`);
    } catch (e) {
      console.log(`✗ ${t}: ${(e as Error).message}`);
    }
  }
  await closeBrowser();
}
main();
