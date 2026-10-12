import { requireUser } from "@/lib/auth";
import { userClient } from "@/lib/supabase/server";
import { ConsentFields } from "../consent-fields";
import { createStudent } from "../actions";

export default async function NewStudent() {
  await requireUser();
  const db = await userClient();
  const { data: batches } = await db.from("batches").select("id, name, class, board, academic_year").order("class");
  const year = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;

  return (
    <>
      <h1>Add a student</h1>
      <div className="bars"><i /><i /><i /><i /></div>
      <form action={createStudent}>
        <div className="grid2">
          <div className="card">
            <h2>Student</h2>
            <label>Full name</label><input type="text" name="full_name" required />
            <div className="grid2">
              <div><label>Class</label><select name="class" defaultValue="10">{[8, 9, 10].map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><label>Section</label><input type="text" name="section" placeholder="B" /></div>
            </div>
            <div className="grid2">
              <div><label>Board</label><select name="board"><option value="CBSE">CBSE</option><option value="UP">UP Board</option></select></div>
              <div><label>Academic year starting</label><input type="number" name="academic_year" defaultValue={year} required /></div>
            </div>
            <label>School</label><input type="text" name="school" />
            <div className="grid2">
              <div><label>Roll number</label><input type="text" name="roll_no" /></div>
              <div><label>Batch</label><select name="batch_id"><option value="">—</option>{(batches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            </div>
            <label>Reports refer to the student as</label>
            <select name="pronoun" defaultValue="they"><option value="he">he / him</option><option value="she">she / her</option><option value="they">they / them</option></select>
            <p className="muted small" style={{ marginTop: 10 }}>Only a code like “S-1042”, the class, board and pronoun are ever sent to the AI. The name, school and contact details stay here.</p>
          </div>
          <div className="card">
            <h2>Parent or guardian</h2>
            <label>Name</label><input type="text" name="guardian_name" />
            <label>Phone (WhatsApp)</label><input type="text" name="guardian_phone" placeholder="+91…" />
            <label>Email</label><input type="email" name="guardian_email" />
            <p className="muted small">Phone and email are stored encrypted.</p>
            <ConsentFields />
          </div>
        </div>
        <button className="btn">Save student</button>
      </form>
    </>
  );
}
