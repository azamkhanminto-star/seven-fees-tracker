import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { userClient } from "@/lib/supabase/server";
import { STATUS_LABEL } from "@/lib/ui";

type Search = { q?: string; cls?: string; batch?: string; status?: string };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const sp = await searchParams;
  const db = await userClient();
  const { data: batches } = await db.from("batches").select("id, name, class").order("class").order("name");

  let q = db.from("students")
    .select("id, full_name, class, section, roll_no, batch_id, cases(id, status, subject, pipeline_step, updated_at), consents(id, withdrawn_at)")
    .eq("status", "active").order("class").order("full_name");
  if (sp.cls) q = q.eq("class", Number(sp.cls));
  if (sp.batch) q = q.eq("batch_id", sp.batch);
  if (sp.q) q = q.ilike("full_name", `%${sp.q}%`);
  const { data: students } = await q;

  const rows = (students ?? []).map((s) => {
    const cases = [...(s.cases ?? [])].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    return { ...s, latest: cases[0] ?? null, consent: (s.consents ?? []).some((c) => !c.withdrawn_at) };
  }).filter((s) => !sp.status || (sp.status === "none" ? !s.latest : s.latest?.status === sp.status));

  const count = (st: string) => rows.filter((r) => r.latest?.status === st).length;

  return (
    <>
      <div className="spread">
        <div><h1>Students &amp; reports</h1><div className="bars"><i /><i /><i /><i /></div></div>
        <Link className="btn" href="/students/new">+ Add a student</Link>
      </div>
      <div className="grid3">
        <div className="card"><div className="stat">{rows.length}</div><div className="muted small">Students shown</div></div>
        <div className="card"><div className="stat">{count("processing") + count("transcript_review")}</div><div className="muted small">Being prepared</div></div>
        <div className="card"><div className="stat">{count("needs_review")}</div><div className="muted small">Waiting for your review</div></div>
      </div>
      <form className="card row" method="get">
        <input type="text" name="q" placeholder="Search by name" defaultValue={sp.q ?? ""} style={{ maxWidth: 220 }} />
        <select name="cls" defaultValue={sp.cls ?? ""} style={{ maxWidth: 120 }}>
          <option value="">All classes</option>{[8, 9, 10].map((c) => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select name="batch" defaultValue={sp.batch ?? ""} style={{ maxWidth: 180 }}>
          <option value="">All batches</option>{(batches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} style={{ maxWidth: 200 }}>
          <option value="">Any report status</option>
          <option value="none">No report yet</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="subject" defaultValue="maths" style={{ maxWidth: 150 }} disabled title="Physics, Chemistry and Biology arrive in Phase 2">
          <option value="maths">Mathematics</option>
        </select>
        <button className="btn ghost">Filter</button>
      </form>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Student</th><th>Class</th><th>Batch</th><th>Consent</th><th>Latest report</th><th /></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/students/${s.id}`}><strong>{s.full_name}</strong></Link>{s.roll_no ? <span className="muted small"> · Roll {s.roll_no}</span> : null}</td>
                <td>{s.class}{s.section ? `-${s.section}` : ""}</td>
                <td>{batches?.find((b) => b.id === s.batch_id)?.name ?? "—"}</td>
                <td>{s.consent ? <span className="chip approved">Given</span> : <span className="chip failed">Missing</span>}</td>
                <td>{s.latest ? <span className={`chip ${s.latest.status}`}>{STATUS_LABEL[s.latest.status as keyof typeof STATUS_LABEL]}</span> : <span className="muted">—</span>}</td>
                <td style={{ textAlign: "right" }}>
                  {s.latest ? <Link className="btn small ghost" href={`/cases/${s.latest.id}`}>Open</Link> : null}
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={6} className="muted" style={{ padding: 24, textAlign: "center" }}>No students yet. Add one to get started.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
