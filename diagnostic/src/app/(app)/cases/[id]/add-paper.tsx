"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { FileRef } from "@/lib/db-types";
import { addPaper, signUploads } from "./actions";

type PaperOption = { id: string; title: string; kind: string };

const MIME_FALLBACK: Record<string, string> = { csv: "text/csv", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export function AddPaper({ caseId, papers, first }: { caseId: string; papers: PaperOption[]; first: boolean }) {
  const [existing, setExisting] = useState("");
  const [source, setSource] = useState<"scan" | "marksheet">("scan");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function upload(list: FileList | null): Promise<FileRef[]> {
    const files = Array.from(list ?? []).filter((f) => f.size > 0);
    if (!files.length) return [];
    const meta = files.map((f) => ({ name: f.name, mime: f.type || MIME_FALLBACK[f.name.split(".").pop()?.toLowerCase() ?? ""] || "" }));
    const signed = await signUploads(caseId, meta);
    const supa = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    for (const [i, s] of signed.entries()) {
      setBusy(`Uploading ${s.name}…`);
      const { error } = await supa.storage.from("private").uploadToSignedUrl(s.path, s.token, files[i], { contentType: s.mime });
      if (error) throw new Error(`${s.name}: ${error.message}`);
    }
    return signed.map((s) => ({ path: s.path, mime: s.mime, name: s.name }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const f = new FormData(e.currentTarget);
    const el = e.currentTarget.elements as unknown as Record<string, HTMLInputElement>;
    try {
      setBusy("Preparing upload…");
      const paperFiles = existing ? [] : await upload(el.paper_files?.files ?? null);
      const keyFiles = existing ? [] : await upload(el.key_files?.files ?? null);
      const answerFiles = await upload(el.answer_files.files);
      setBusy("Starting the analysis…");
      await addPaper({
        caseId,
        existingPaperId: existing || null,
        paper: existing ? null : {
          title: String(f.get("title") ?? ""), short_name: String(f.get("short_name") ?? "") || String(f.get("title") ?? ""),
          kind: String(f.get("kind") ?? "other"), test_date: String(f.get("test_date") ?? "") || null,
          typed_text: String(f.get("typed_text") ?? "") || null, files: paperFiles, key_files: keyFiles,
        },
        source,
        answerFiles,
      });
      setBusy(null);
      (e.target as HTMLFormElement).reset();
    } catch (x) {
      setBusy(null);
      setErr(x instanceof Error ? x.message : String(x));
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>{first ? "Upload the first paper" : "Add another paper"}</h2>
      <p className="muted small">{first ? "Usually the school exam. You get the full report pack from one paper; a second paper (for example a diagnostic re-test) lets the report show which mistakes recur." : "The analysis will be redone with all papers together."}</p>
      {err ? <div className="notice err">{err}</div> : null}
      <div className="grid2">
        <div>
          <h3>1 · Question paper</h3>
          {papers.length ? (
            <>
              <label>Use a paper already uploaded</label>
              <select value={existing} onChange={(e) => setExisting(e.target.value)}>
                <option value="">— a new paper —</option>
                {papers.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </>
          ) : null}
          {!existing ? (
            <>
              <label>Title</label><input type="text" name="title" required placeholder="DPS Half-Yearly Examination, Set C" />
              <div className="grid2">
                <div><label>Short name</label><input type="text" name="short_name" placeholder="Half-Yearly Exam" /></div>
                <div><label>Date</label><input type="date" name="test_date" /></div>
              </div>
              <label>Type of paper</label>
              <select name="kind" defaultValue="school_exam">
                <option value="school_exam">School exam</option><option value="diagnostic">SEVEN diagnostic test</option>
                <option value="final_test">Final test</option><option value="other">Other test</option>
              </select>
              <label>Question paper (PDF or photos)</label><input type="file" name="paper_files" multiple accept="application/pdf,image/*" />
              <label>…or type the questions</label><textarea name="typed_text" placeholder="Q1 (1 mark) Find the HCF of 12 and 18 …" />
              <label>Answer key (optional: Claude drafts one if missing)</label><input type="file" name="key_files" multiple accept="application/pdf,image/*" />
            </>
          ) : null}
        </div>
        <div>
          <h3>2 · Student’s answers</h3>
          <div className="row" style={{ margin: "8px 0" }}>
            <label className="check"><input type="radio" checked={source === "scan"} onChange={() => setSource("scan")} /> Scanned answer sheet</label>
            <label className="check"><input type="radio" checked={source === "marksheet"} onChange={() => setSource("marksheet")} /> Marks sheet</label>
          </div>
          {source === "scan" ? (
            <>
              <label>Answer sheet (PDF or clear photos of every page)</label>
              <input type="file" name="answer_files" multiple required accept="application/pdf,image/*" />
              <p className="muted small">Tip: cover the student’s name before scanning. Claude never needs it.</p>
            </>
          ) : (
            <>
              <label>Marks sheet (Excel or CSV)</label>
              <input type="file" name="answer_files" required accept=".xlsx,.csv" />
              <p className="muted small">Two columns, “Question” and “Marks” (A1, A2 … or 1, 2 …). Write AB or leave blank for not attempted. Without written working the report has less evidence.</p>
            </>
          )}
        </div>
      </div>
      <button className="btn" disabled={!!busy}>{busy ?? "Upload and analyse"}</button>
    </form>
  );
}
