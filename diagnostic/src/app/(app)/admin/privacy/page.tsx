import { requireAdmin } from "@/lib/auth";
import { userClient } from "@/lib/supabase/server";
import { eraseStudent, rejectDeletion } from "../actions";

export default async function Privacy() {
  await requireAdmin();
  const db = await userClient();
  const [{ data: reqs }, { data: log }] = await Promise.all([
    db.from("deletion_requests").select("*").order("created_at", { ascending: false }).limit(100),
    db.from("audit_log").select("*").order("at", { ascending: false }).limit(200),
  ]);
  return (
    <>
      <h1>Privacy &amp; audit</h1>
      <div className="bars"><i /><i /><i /><i /></div>
      <div className="card">
        <h2>Deletion requests</h2>
        <p className="muted small">Erasing removes the student, every scan, paper answer, report, share link and consent record. Only the anonymous code stays in this list.</p>
        <table>
          <thead><tr><th>Student code</th><th>Requested by</th><th>Reason</th><th>When</th><th>Status</th><th /></tr></thead>
          <tbody>
            {(reqs ?? []).map((r) => (
              <tr key={r.id}>
                <td>{r.student_label}</td><td>{r.requested_by}</td><td>{r.reason ?? "—"}</td>
                <td>{new Date(r.created_at).toLocaleDateString("en-IN")}</td><td>{r.status}</td>
                <td>{r.status === "pending" ? (
                  <div className="row">
                    <form action={eraseStudent}><input type="hidden" name="request_id" value={r.id} /><button className="btn small warn">Erase permanently</button></form>
                    <form action={rejectDeletion}><input type="hidden" name="request_id" value={r.id} /><button className="btn small ghost">Reject</button></form>
                  </div>
                ) : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>What</th></tr></thead>
          <tbody>
            {(log ?? []).map((l) => (
              <tr key={l.id}><td className="small">{new Date(l.at).toLocaleString("en-IN")}</td><td className="small">{l.actor_id ? l.actor_id.slice(0, 8) : "parent link"}</td><td>{l.action}</td><td className="small">{l.entity} {l.entity_id ?? ""}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
