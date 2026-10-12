import { requireAdmin } from "@/lib/auth";
import { lookupConcept } from "@/lib/concepts";
import { userClient } from "@/lib/supabase/server";
import type { WorkbookStep } from "@/lib/ai/schemas";
import { setLibraryStatus } from "../actions";

export default async function Library({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status = "draft" } = await searchParams;
  const db = await userClient();
  const { data } = await db.from("workbook_steps").select("*").eq("status", status).order("concept_id");
  return (
    <>
      <h1>Workbook library</h1>
      <div className="bars"><i /><i /><i /><i /></div>
      <p className="muted">Workbook levels written for one student are saved here as drafts when a report is approved. Approve a level once, and every later student with the same gap gets it without paying for it again.</p>
      <div className="row" style={{ marginBottom: 12 }}>
        {["draft", "approved", "retired"].map((s) => <a key={s} className={`btn small ${s === status ? "" : "ghost"}`} href={`?status=${s}`}>{s}</a>)}
      </div>
      {(data ?? []).map((row) => {
        const st = row.content as WorkbookStep;
        const c = lookupConcept(row.concept_id);
        return (
          <div key={row.id} className="card">
            <div className="spread">
              <div><h3>{row.title}</h3><div className="muted small">{row.concept_id}{c ? ` · Class ${c.cls}: ${c.name}` : ""} · used {row.times_used}×</div></div>
              <div className="row">
                {(["approved", "retired", "draft"] as const).filter((s) => s !== row.status).map((s) => (
                  <form key={s} action={setLibraryStatus}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value={s} />
                    <button className={`btn small ${s === "approved" ? "" : "ghost"}`}>{s === "approved" ? "Approve" : s === "retired" ? "Retire" : "Back to draft"}</button></form>
                ))}
              </div>
            </div>
            <details><summary className="small">Show content</summary>
              <p><strong>Understand it:</strong> {st.understand}</p>
              <p><strong>Examples:</strong> {st.examples.map((e) => `${e.q} → ${e.a}`).join(" · ")}</p>
              <p><strong>Practice:</strong> {st.practice.map((e) => `${e.q} (${e.a})`).join(" · ")}</p>
              <p><strong>Checkpoint:</strong> {st.checkpoint.map((e) => `${e.q} (${e.a})`).join(" · ")}</p>
            </details>
          </div>
        );
      })}
      {!data?.length ? <p className="muted">Nothing here.</p> : null}
    </>
  );
}
