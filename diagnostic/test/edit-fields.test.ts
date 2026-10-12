import { describe, expect, it } from "vitest";
import { STUDENT_A } from "../samples/student-a";
import { applyEdits, editableFields } from "../src/lib/edit-fields";
import { AnalysisOut } from "../src/lib/ai/schemas";

describe("teacher edits", () => {
  it("exposes wording but not linking fields, and round-trips", () => {
    const a = STUDENT_A.analysis!;
    const fields = editableFields(a);
    expect(fields.some((f) => f.path.join(".") === "mistakes.0.teach_this")).toBe(true);
    expect(fields.some((f) => f.path.includes("concept_ids") || f.path.at(-1) === "q" || f.path.at(-1) === "paper")).toBe(false);
    const edited = applyEdits(a, [{ path: ["mistakes", 0, "teach_this"], value: "New wording" }]);
    expect(edited.mistakes[0].teach_this).toBe("New wording");
    expect(a.mistakes[0].teach_this).not.toBe("New wording"); // original untouched
    expect(AnalysisOut.safeParse(edited).success).toBe(true);
  });
  it("refuses to overwrite non-text values", () => {
    expect(() => applyEdits(STUDENT_A.analysis!, [{ path: ["priorities", 0, "rank"], value: "x" }])).toThrow();
  });
});
