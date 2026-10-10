/**
 * Question-wise marks from Excel/CSV, for teachers who mark on paper instead of scanning.
 * Accepts either layout:
 *   vertical:   Question | Marks   (one row per question)
 *   horizontal: A1 | A2 | B1 …     (header row of question numbers, then one row of marks)
 * A blank cell, "-", "NA" or "AB" means not attempted.
 */
import ExcelJS from "exceljs";

export type MarkRow = { q: string; marks: number | null };

const BLANK = new Set(["", "-", "na", "n/a", "ab", "absent", "x"]);

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v !== null && "result" in v) return String((v as { result: unknown }).result ?? "");
  if (typeof v === "object" && v !== null && "richText" in v) return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
  return String(v).trim();
}

function toMarks(s: string): number | null {
  const t = s.trim().toLowerCase().replace("½", ".5");
  if (BLANK.has(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`"${s}" is not a number of marks`);
  return n;
}

export async function readGrid(buf: Buffer, filename: string): Promise<string[][]> {
  if (filename.toLowerCase().endsWith(".csv")) {
    return buf.toString("utf8").split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "").trim()));
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("The spreadsheet has no sheets");
  const grid: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const vals = (row.values as unknown[]).slice(1).map(cellText);
    grid.push(vals);
  });
  return grid;
}

export function parseMarkGrid(grid: string[][]): MarkRow[] {
  const rows = grid.filter((r) => r.some((c) => c !== ""));
  if (rows.length < 2) throw new Error("The sheet needs a header row and at least one row of marks");
  const head = rows[0].map((h) => h.toLowerCase());
  const vertical = /^(q|q\.? ?no\.?|question|question no\.?)$/.test(head[0] ?? "") && /mark/.test(head[1] ?? "");
  if (vertical) {
    return rows.slice(1).filter((r) => r[0]).map((r) => ({ q: normQ(r[0]), marks: toMarks(r[1] ?? "") }));
  }
  const data = rows[1];
  return rows[0].map((q, i) => ({ q: normQ(q), marks: toMarks(data[i] ?? "") })).filter((r) => r.q);
}

/** "q 7", "Q7", "7" → "Q7"; "A9" stays "A9". */
export function normQ(q: string): string {
  const t = q.trim().replace(/\s+/g, "");
  if (/^\d+/.test(t)) return `Q${t}`;
  return t.replace(/^q/i, "Q");
}
