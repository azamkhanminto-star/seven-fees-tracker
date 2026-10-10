import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { adminClient, BUCKET, userClient } from "@/lib/supabase/server";
import { confirmTranscript } from "../../actions";
import type { FileRef } from "@/lib/db-types";

export default async function Transcript({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params;
  await requireUser();
  const db = await userClient();
  const { data: a } = await db.from("attempts").select("*, paper:papers(title, parsed)").eq("id", attemptId).eq("case_id", id).maybeSingle();
  if (!a) notFound();
  const { data: rows } = await db.from("responses").select("*").eq("attempt_id", attemptId);
  const order = ((a.paper?.parsed?.questions ?? []) as { q: string; text: string }[]);
  const sorted = order.map((q) => ({ q, r: rows?.find((r) => r.q === q.q) })).filter((x) => x.r);
  const links = await Promise.all((a.files as FileRef[]).map(async (f) => {
    const { data } = await adminClient().storage.from(BUCKET).createSignedUrl(f.path, 600);
    return { name: f.name, url: data?.signedUrl ?? "#" };
  }));
  const notes = a.read_json?.notes as string | undefined;

  return (
    <>
      <div className="muted small"><Link href={`/cases/${id}`}>← Back to the diagnosis</Link></div>
      <h1>Check Claude’s reading · P{a.seq}</h1>
      <div className="bars"><i /><i /><i /><i /></div>
      <div className="card">
        <p>Compare each transcription with the scan. If a mark is wrong, type the correct one in “Your mark” (leave it blank to accept Claude’s). Confirming re-runs the analysis with your marks.</p>
        <div className="row">{links.map((l) => <a key={l.url} className="btn small ghost" href={l.url} target="_blank">Open scan: {l.name}</a>)}</div>
        {notes ? <p className="muted small" style={{ marginTop: 8 }}>Reading notes: {notes}</p> : null}
      </div>
      <form action={confirmTranscript} className="card" style={{ padding: 0 }}>
        <input type="hidden" name="case_id" value={id} />
        <input type="hidden" name="attempt_id" value={attemptId} />
        <table>
          <thead><tr><th>Q</th><th>Question</th><th>What Claude read</th><th>Claude’s mark</th><th>Your mark</th></tr></thead>
          <tbody>
            {sorted.map(({ q, r }) => (
              <tr key={q.q} style={r!.illegible ? { background: "#FFF3CC" } : undefined}>
                <td><strong>{q.q}</strong></td>
                <td className="small">{q.text}</td>
                <td className="small">
                  {!r!.attempted ? <em className="muted">not attempted</em> : <>
                    <div><strong>{r!.student_answer}</strong></div>
                    <div className="muted" style={{ whiteSpace: "pre-wrap" }}>{r!.working}</div>
                    {r!.illegible ? <div className="small" style={{ color: "var(--red)" }}>Hard to read</div> : null}
                  </>}
                  {r!.marking_note ? <div className="muted small">Note: {r!.marking_note}</div> : null}
                </td>
                <td>{r!.suggested_marks} / {r!.max_marks}</td>
                <td style={{ width: 90 }}><input type="number" step="0.5" min="0" max={r!.max_marks} name={`m:${q.q}`} defaultValue={r!.teacher_marks ?? ""} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: 16 }}><button className="btn">Confirm and continue</button></div>
      </form>
    </>
  );
}
