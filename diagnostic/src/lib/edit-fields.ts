/**
 * Turns an AI output into a flat list of editable text fields and back, so teachers can edit
 * any wording without touching the structure (ids, marks, links between steps stay intact).
 */
export type Path = (string | number)[];
export type Field = { key: string; path: Path; value: string };

/** Keys that link steps together or identify things; editing them would break the report. */
const LOCKED = new Set(["concept_id", "concept_ids", "paper", "q", "step", "letter", "if_fails", "start_step", "key_source", "outcome", "error_types", "fix_type", "confidence", "primary", "class_band", "mistake_titles", "weak_areas"]);

export function editableFields(json: unknown, path: Path = []): Field[] {
  if (typeof json === "string") return [{ key: `f:${JSON.stringify(path)}`, path, value: json }];
  if (Array.isArray(json)) return json.flatMap((v, i) => editableFields(v, [...path, i]));
  if (json && typeof json === "object") {
    return Object.entries(json as Record<string, unknown>).flatMap(([k, v]) => (LOCKED.has(k) ? [] : editableFields(v, [...path, k])));
  }
  return [];
}

export function applyEdits<T>(json: T, edits: { path: Path; value: string }[]): T {
  const copy = structuredClone(json) as unknown as Record<string | number, unknown>;
  for (const e of edits) {
    let node: Record<string | number, unknown> = copy;
    for (const p of e.path.slice(0, -1)) {
      const next = node[p];
      if (next === null || typeof next !== "object") throw new Error(`Bad path ${JSON.stringify(e.path)}`);
      node = next as Record<string | number, unknown>;
    }
    const last = e.path.at(-1)!;
    if (typeof node[last] !== "string") throw new Error(`Not a text field: ${JSON.stringify(e.path)}`);
    node[last] = e.value;
  }
  return copy as unknown as T;
}

/** "mistakes › 2 › teach this" */
export function labelFor(path: Path): string {
  return path.map((p) => (typeof p === "number" ? `#${p + 1}` : p.replaceAll("_", " "))).join(" › ");
}
