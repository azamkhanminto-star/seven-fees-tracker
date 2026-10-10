import { EDITION_LABEL, Edition, GANITA_PRAKASH, MATHS_CHAPTERS, editionFor } from "./editions";
import { Concept, MATHS_CONCEPTS, MATHS_CONCEPT_INDEX } from "./maths";

export type Subject = "maths" | "physics" | "chemistry" | "biology";

export type StudentTimeline = { currentClass: number; currentYear: number };

/** A concept as it is printed in a document: "Class 8 · Ch 9 Algebraic Expressions & Identities". */
export type ResolvedConcept = {
  id: string;
  cls: number;
  name: string;
  edition: Edition;
  chapterNo: string | null;
  chapterName: string;
  known: boolean;
};

export function conceptsFor(subject: Subject): Concept[] {
  return subject === "maths" ? MATHS_CONCEPTS : [];
}

export function lookupConcept(id: string): Concept | undefined {
  return MATHS_CONCEPT_INDEX[id];
}

/** Class implied by an id such as "M8.IDENTITIES", used when an id is not in the map. */
function classFromId(id: string): number | null {
  const m = /^[A-Z](\d{1,2})\./.exec(id);
  return m ? Number(m[1]) : null;
}

export function resolveConcept(id: string, t: StudentTimeline, fallbackLabel = ""): ResolvedConcept {
  const concept = lookupConcept(id);
  if (!concept) {
    const cls = classFromId(id) ?? t.currentClass;
    return { id, cls, name: fallbackLabel || id, edition: editionFor(cls, t.currentClass, t.currentYear),
             chapterNo: null, chapterName: "", known: false };
  }
  const edition = editionFor(concept.cls, t.currentClass, t.currentYear);
  const row = MATHS_CHAPTERS[concept.cls]?.find((r) => r.key === concept.chapter);
  if (edition === "gp") {
    // Ganita Prakash reorganised chapters; cite the topic, not an old chapter number.
    return { id, cls: concept.cls, name: concept.name, edition, chapterNo: null,
             chapterName: row?.name ?? "", known: true };
  }
  const no = row ? row[edition] : null;
  return { id, cls: concept.cls, name: concept.name, edition, chapterNo: no === null ? null : String(no),
           chapterName: row?.name ?? "", known: true };
}

/** "Class 8 · Ch 9 Algebraic Expressions and Identities" */
export function conceptCitation(r: ResolvedConcept): string {
  if (!r.chapterName) return `Class ${r.cls}`;
  if (r.edition === "gp") return `Class ${r.cls} · Ganita Prakash (topic: ${r.chapterName})`;
  return r.chapterNo ? `Class ${r.cls} · Ch ${r.chapterNo} ${r.chapterName}` : `Class ${r.cls} · ${r.chapterName}`;
}

/**
 * The concept map as compact text for the cached system prompt. Must be byte-for-byte stable
 * between calls, so no dates, ids or ordering that can change.
 */
export function conceptMapPrompt(subject: Subject): string {
  if (subject !== "maths") return "(Concept map for this subject is not loaded yet.)";
  const lines: string[] = [
    "MATHEMATICS CONCEPT MAP (NCERT, Classes 5–10)",
    "Format: ID | Class | Chapter (number in 2006–2022 books / number in rationalised 2023– books) | Concept | Builds on",
    "",
  ];
  for (const cls of [5, 6, 7, 8, 9, 10]) {
    lines.push(`## Class ${cls}`);
    for (const k of MATHS_CONCEPTS.filter((x) => x.cls === cls)) {
      const row = MATHS_CHAPTERS[cls].find((r) => r.key === k.chapter)!;
      const nos = `${row.pre2023 ?? "–"}/${row.r2023 ?? "–"}`;
      lines.push(`${k.id} | ${cls} | ${row.name} (${nos}) | ${k.name} | ${k.prereq.join(", ") || "—"}`);
    }
    lines.push("");
  }
  lines.push("Ganita Prakash (new books; chapter titles to be verified by teachers):");
  for (const cls of [6, 7, 8]) {
    lines.push(`Class ${cls}: ` + GANITA_PRAKASH[cls].map((g) => `${g.no} ${g.name}`).join("; "));
  }
  lines.push("", "Editions: " + Object.values(EDITION_LABEL).join(" · "));
  return lines.join("\n");
}
