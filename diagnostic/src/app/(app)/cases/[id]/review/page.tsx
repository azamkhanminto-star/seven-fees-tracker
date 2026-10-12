import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { userClient } from "@/lib/supabase/server";
import type { OutputRow } from "@/lib/db-types";
import { editableFields, labelFor } from "@/lib/edit-fields";
import { regenerateStep, saveEdits } from "./actions";

const TABS: { step: OutputRow["step"]; label: string }[] = [
  { step: "analysis", label: "Mistakes report" },
  { step: "tracing", label: "Root-cause tracing" },
  { step: "confirmation", label: "Confirmation paper" },
  { step: "workbook", label: "Workbook" },
  { step: "plan", label: "Plan, final test & parents" },
  { step: "diagnostic", label: "Diagnostic re-test" },
];

export default async function Review({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; saved?: string }> }) {
  const { id } = await params;
  const { tab = "analysis", saved } = await searchParams;
  await requireUser();
  const db = await userClient();
  const { data: c } = await db.from("cases").select("id, status").eq("id", id).maybeSingle();
  if (!c) notFound();
  const { data: outs } = await db.from("case_outputs").select("*").eq("case_id", id).eq("superseded", false).order("part");
  const rows = (outs ?? []) as OutputRow[];
  const current = rows.filter((r) => r.step === tab);

  return (
    <>
      <div className="muted small"><Link href={`/cases/${id}`}>← Back to the diagnosis</Link></div>
      <h1>Review &amp; edit</h1>
      <div className="bars"><i /><i /><i /><i /></div>
      {saved ? <div className="notice ok">Saved. The PDFs now use your version.</div> : null}
      {c.status === "approved" ? <div className="notice">This report is approved. Saving a change sends it back to “Ready for your review” until you approve again.</div> : null}
      <div className="row" style={{ marginBottom: 14 }}>
        {TABS.filter((t) => rows.some((r) => r.step === t.step)).map((t) => (
          <Link key={t.step} href={`?tab=${t.step}`} className={`btn small ${t.step === tab ? "" : "ghost"}`}>{t.label}</Link>
        ))}
      </div>
      {current.map((out) => {
        const fields = editableFields(out.json);
        return (
          <form key={out.id} action={saveEdits} className="card">
            <input type="hidden" name="output_id" value={out.id} />
            <input type="hidden" name="case_id" value={id} />
            <div className="spread">
              <h2>{out.step === "workbook" ? `Workbook part ${out.part + 1}` : TABS.find((t) => t.step === out.step)?.label}</h2>
              <span className="muted small">Version {out.version}{out.edited ? " · edited by a teacher" : ` · written by ${out.model ?? "Claude"}`}</span>
            </div>
            {fields.map((f) => (
              <div key={f.key}>
                <label>{labelFor(f.path)}</label>
                {f.value.length > 90 ? <textarea name={f.key} defaultValue={f.value} /> : <input type="text" name={f.key} defaultValue={f.value} />}
              </div>
            ))}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn">Save changes</button>
            </div>
          </form>
        );
      })}
      {current.length && tab !== "diagnostic" ? (
        <form action={regenerateStep} className="card">
          <input type="hidden" name="case_id" value={id} />
          <input type="hidden" name="step" value={tab} />
          <p className="small">Not happy with this part? Claude can write it again. Later parts are rewritten too so everything stays consistent.</p>
          <label className="check"><input type="checkbox" name="deep" /> Use the most capable model</label>
          <button className="btn small ghost" style={{ marginTop: 8 }}>Write this part again</button>
        </form>
      ) : null}
    </>
  );
}
