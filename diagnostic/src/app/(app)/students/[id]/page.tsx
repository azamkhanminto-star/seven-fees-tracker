import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/crypto";
import { userClient } from "@/lib/supabase/server";
import { STATUS_LABEL } from "@/lib/ui";
import { ConsentFields } from "../consent-fields";
import { recordConsent, requestDeletion, startCase, withdrawConsent } from "../actions";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  const db = await userClient();
  const { data: s } = await db.from("students").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  await audit(me.id, "view", "student", id);
  const [{ data: consents }, { data: cases }, { data: batch }, { data: delReq }] = await Promise.all([
    db.from("consents").select("*").eq("student_id", id).order("given_at", { ascending: false }),
    db.from("cases").select("id, status, subject, created_at, updated_at, attempts(id)").eq("student_id", id).order("created_at", { ascending: false }),
    s.batch_id ? db.from("batches").select("name").eq("id", s.batch_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from("deletion_requests").select("status, created_at").eq("student_id", id).eq("status", "pending"),
  ]);
  const active = (consents ?? []).find((c) => !c.withdrawn_at);

  return (
    <>
      <div className="spread">
        <div>
          <h1>{s.full_name}</h1>
          <div className="muted">Class {s.class}{s.section ? `-${s.section}` : ""} · {s.board} · {batch?.name ?? "no batch"} · code {s.pseudonym}</div>
          <div className="bars"><i /><i /><i /><i /></div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Diagnoses</h2>
          {(cases ?? []).length ? (
            <table>
              <thead><tr><th>Started</th><th>Subject</th><th>Papers</th><th>Status</th><th /></tr></thead>
              <tbody>
                {cases!.map((c) => (
                  <tr key={c.id}>
                    <td>{new Date(c.created_at).toLocaleDateString("en-IN")}</td><td>Mathematics</td><td>{c.attempts?.length ?? 0}</td>
                    <td><span className={`chip ${c.status}`}>{STATUS_LABEL[c.status as keyof typeof STATUS_LABEL]}</span></td>
                    <td><Link className="btn small ghost" href={`/cases/${c.id}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted">No diagnosis yet.</p>}
          {active ? (
            <form action={startCase} style={{ marginTop: 12 }}>
              <input type="hidden" name="student_id" value={id} />
              <label className="check"><input type="checkbox" name="check_transcripts" /> I want to check Claude’s reading of the answer sheet before the analysis</label>
              <label className="check"><input type="checkbox" name="difficult" /> Difficult or borderline case (use the most capable model)</label>
              <button className="btn" style={{ marginTop: 8 }}>Start a new Maths diagnosis</button>
            </form>
          ) : <div className="notice" style={{ marginTop: 12 }}>Record the parent’s consent (right) before uploading any paper.</div>}
        </div>

        <div className="card">
          <h2>Details</h2>
          <table><tbody>
            <tr><td className="muted">School</td><td>{s.school ?? "—"}</td></tr>
            <tr><td className="muted">Roll no.</td><td>{s.roll_no ?? "—"}</td></tr>
            <tr><td className="muted">Academic year</td><td>{s.academic_year}-{String(s.academic_year + 1).slice(2)}</td></tr>
            <tr><td className="muted">Pronoun in reports</td><td>{s.pronoun}</td></tr>
            <tr><td className="muted">Guardian</td><td>{s.guardian_name ?? "—"}</td></tr>
            <tr><td className="muted">Phone</td><td>{decrypt(s.guardian_phone_enc) ?? "—"}</td></tr>
            <tr><td className="muted">Email</td><td>{decrypt(s.guardian_email_enc) ?? "—"}</td></tr>
          </tbody></table>

          <h3 style={{ marginTop: 16 }}>Consent</h3>
          {active ? (
            <>
              <div className="notice ok">Given by {active.guardian_name} ({active.relation}) on {new Date(active.given_at).toLocaleDateString("en-IN")} · {active.method.replace("_", " ")}</div>
              <form action={withdrawConsent}><input type="hidden" name="student_id" value={id} /><button className="btn small ghost">Record withdrawal of consent</button></form>
            </>
          ) : (
            <form action={recordConsent}>
              <input type="hidden" name="student_id" value={id} />
              <ConsentFields guardian={s.guardian_name} />
              <button className="btn" style={{ marginTop: 10 }}>Save consent</button>
            </form>
          )}

          <h3 style={{ marginTop: 16 }}>Delete this student’s data</h3>
          {delReq?.length ? <div className="notice">A deletion request is waiting for the admin.</div> : (
            <form action={requestDeletion}>
              <input type="hidden" name="student_id" value={id} />
              <label>Requested by</label><input type="text" name="requested_by" placeholder="e.g. father, by phone" />
              <label>Reason (optional)</label><input type="text" name="reason" />
              <button className="btn small warn" style={{ marginTop: 8 }}>Send deletion request to admin</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
