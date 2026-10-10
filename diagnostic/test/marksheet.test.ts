import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parseMarkGrid, readGrid } from "../src/lib/marksheet";

describe("marks sheet", () => {
  it("reads the vertical layout", () => {
    expect(parseMarkGrid([["Question", "Marks"], ["A1", "1"], ["A9", "0"], ["B11", "AB"], ["C3", "1½"]]))
      .toEqual([{ q: "A1", marks: 1 }, { q: "A9", marks: 0 }, { q: "B11", marks: null }, { q: "C3", marks: 1.5 }]);
  });
  it("reads the horizontal layout and numbers-only questions", () => {
    expect(parseMarkGrid([["1", "2", "3"], ["1", "-", "2.5"]])).toEqual([{ q: "Q1", marks: 1 }, { q: "Q2", marks: null }, { q: "Q3", marks: 2.5 }]);
  });
  it("rejects nonsense marks", () => {
    expect(() => parseMarkGrid([["Question", "Marks"], ["A1", "good"]])).toThrow();
  });
  it("reads a real .xlsx file", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Marks");
    ws.addRow(["Question", "Marks"]); ws.addRow(["A1", 1]); ws.addRow(["A2", 0.5]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    expect(parseMarkGrid(await readGrid(buf, "marks.xlsx"))).toEqual([{ q: "A1", marks: 1 }, { q: "A2", marks: 0.5 }]);
  });
});
