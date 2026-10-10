import { requireAdmin } from "@/lib/auth";
import { adminClient, userClient } from "@/lib/supabase/server";
import { addBatch, inviteTeacher, setTeacher } from "../actions";

export default async function Team() {
  await requireAdmin();
  const db = await userClient();
  const [{ data: profiles }, { data: batches }, { data: links }, users] = await Promise.all([
    db.from("profiles").select("*").order("created_at"),
    db.from("batches").select("*").order("class").order("name"),
    db.from("teacher_batches").select("*"),
    adminClient().auth.admin.listUsers({ perPage: 200 }),
  ]);
  const emailOf = (id: string) => users.data.users.find((u) => u.id === id)?.email ?? "";
  const year = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return (
    <>
      <h1>Teachers &amp; batches</h1>
      <div className="bars"><i /><i /><i /><i /></div>
      <div className="grid2">
        <form action={inviteTeacher} className="card">
          <h2>Invite a teacher</h2>
          <label>Name</label><input type="text" name="full_name" required />
          <label>Email</label><input type="email" name="email" required />
          <button className="btn" style={{ marginTop: 10 }}>Send invitation</button>
          <p className="muted small" style={{ marginTop: 8 }}>They get an email to set a password. A teacher only sees students in the batches you tick for them.</p>
        </form>
        <form action={addBatch} className="card">
          <h2>Add a batch</h2>
          <label>Name</label><input type="text" name="name" required placeholder="Class 10 · Morning" />
          <div className="grid3">
            <div><label>Class</label><select name="class">{[8, 9, 10].map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label>Board</label><select name="board"><option>CBSE</option><option value="UP">UP Board</option></select></div>
            <div><label>Year</label><input type="number" name="academic_year" defaultValue={year} /></div>
          </div>
          <button className="btn" style={{ marginTop: 10 }}>Add batch</button>
        </form>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Person</th><th>Role</th><th>Active</th><th>Batches</th><th /></tr></thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <tr key={p.user_id}>
                <td colSpan={5} style={{ padding: 0 }}>
                  <form action={setTeacher} style={{ display: "grid", gridTemplateColumns: "1.3fr .7fr .4fr 2fr .6fr", gap: 8, padding: 8, alignItems: "center" }}>
                    <input type="hidden" name="user_id" value={p.user_id} />
                    <div><strong>{p.full_name || "—"}</strong><div className="muted small">{emailOf(p.user_id)}</div></div>
                    <select name="role" defaultValue={p.role}><option value="teacher">Teacher</option><option value="admin">Admin</option></select>
                    <input type="checkbox" name="active" defaultChecked={p.active} />
                    <div className="row">{(batches ?? []).map((b) => (
                      <label key={b.id} className="check small" style={{ margin: 0 }}>
                        <input type="checkbox" name="batch" value={b.id} defaultChecked={(links ?? []).some((l) => l.teacher_id === p.user_id && l.batch_id === b.id)} /> {b.name}
                      </label>
                    ))}</div>
                    <button className="btn small ghost">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
