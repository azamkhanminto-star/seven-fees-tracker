import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loadCase } from "@/lib/bundle";
import { decrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import { fmtMarks, interpretConfirmation, paperScore } from "@/lib/scoring";
import { userClient } from "@/lib/supabase/server";
import { STATUS_LABEL } from "@/lib/ui";
import { DOC_LABELS as DOC_TYPES, DocType } from "@/docs/types";
import { approveCase, makeDiagnosticTest, resume, saveConfirmationResults } from "./actions";
import { AddPaper } from "./add-paper";
import { AutoRefresh } from "./auto-refresh";
import { ShareBox } from "./share-box";

const STEPS = ["Question paper read", "Answers read", "Analysis", "Root-cause tracing", "Confirmation paper", "Workbook", "Plan, final test & parent summary"];

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  const db = await userClient();
  const { data: visible } = await db.from("cases").select("id").eq("id", id).maybeSingle();
  if (!visible) notFound();
  await audit(me.id, "view", "case", id);
  const c = await loadCase(db, id);
  const b = c.bundle;
  const { data: papers } = await db.from("papers").select("id, title, kind").eq("class", c.student.class).order("created_at", { ascending: false }).limit(30);
  const { data: runs } = await db.from("ai_runs").select("cost_usd").eq("case_id", id);
  const cost = (runs ?? []).reduce((a, r) => a + Number(r.cost_usd), 0);

  const done = [
    c.attempts.length > 0 && c.attempts.every((a) => a.paper.parsed),
    c.attempts.length > 0 && c.attempts.every((a) => a.read_json),
    !!b.analysis, !!b.tracing, !!b.confirmation, !!b.workbook, !!b.plan,
  ];
  const nowIdx = c.row.status === "processing" ? done.findIndex((d) => !d) : -1;
  const processing = c.row.status === "processing";
  const now = Date.now();
  const stalled = processing && (c.row.lease_until
    ? new Date(c.row.lease_until).getTime() < now
    : now - new Date(c.row.updated_at).getTime() > 3 * 60 * 1000);
  const ready = !!b.plan;
  const available = (Object.keys(DOC_TYPES) as DocType[]).filter((t) => {
    if (t === "diagnostic_paper") return !!b.diagnostic;
    if (t === "mistakes_report") return !!b.analysis;
    if (t === "teacher_pack") return !!b.confirmation && !!b.tracing;
    if (t === "confirmation_paper") return !!b.confirmation;
    return ready;
  });
  const verdicts = b.confirmation && b.confirmationResults ? interpretConfirmation(b.confirmation, b.confirmationResults) : null;

  return (
    <>
      <AutoRefresh active={processing && !stalled} />
      <div className="spread">
        <div>
          <div className="muted small"><Link href={`/students/${c.student.id}`}>{c.student.full_name}</Link> · Class {c.student.class} · Mathematics</div>
          <h1>Diagnosis <span className={`chip ${c.row.status}`}>{STATUS_LABEL[c.row.status]}</span></h1>
          <div className="bars"><i /><i /><i /><i /></div>
        </div>
        <div className="muted small" style={{ textAlign: "right" }}>
          AI cost so far: ${cost.toFixed(2)} (≈ ₹{Math.round(cost * 88)})<br />
          {c.row.difficult ? "Most capable model" : "Routine model"}
        </div>
      </div>

      {c.row.status === "failed" || stalled ? (
        <form action={resume} className="notice err">
          <input type="hidden" name="case_id" value={id} />
          <strong>{stalled ? "This step is taking too long." : "Something went wrong."}</strong> {c.row.pipeline_error ?? ""}
          <div style={{ marginTop: 8 }}><button className="btn small">Try again</button></div>
        </form>
      ) : null}

      <div className="grid2">
        <div className="card">
          <h2>Papers</h2>
          {c.attempts.length ? (
            <table>
              <thead><tr><th>Paper</th><th>Answers</th><th>Score</th><th /></tr></thead>
              <tbody>
                {c.attempts.map((a) => {
                  const pb = b.papers.find((p) => p.key === `P${a.seq}`);
                  const s = pb && a.read_json ? paperScore(pb) : null;
                  return (
                    <tr key={a.id}>
                      <td><strong>P{a.seq}</strong> · {a.paper.title}</td>
                      <td>{a.source === "scan" ? `${a.files.length} scan file(s)` : "marks sheet"}</td>
                      <td>{s ? `${fmtMarks(s.scored)}/${fmtMarks(s.max)}` : "—"}</td>
                      <td>{a.read_json && a.source === "scan" ? <Link className="btn small ghost" href={`/cases/${id}/transcript/${a.id}`}>{a.transcript_confirmed ? "Transcript" : "Check reading"}</Link> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <p className="muted">No paper yet.</p>}
          {c.row.status === "transcript_review" ? <div className="notice" style={{ marginTop: 10 }}>Check Claude’s reading of the answer sheet, fix any marks, then confirm to continue.</div> : null}
        </div>

        <div className="card">
          <h2>Progress</h2>
          <ul className="steps">
            {STEPS.map((s, i) => <li key={s} className={done[i] ? "done" : i === nowIdx ? "now" : ""}>{s}{i === nowIdx && c.row.pipeline_step ? <span className="muted small"> · {c.row.pipeline_step}…</span> : null}</li>)}
          </ul>
          {processing ? <p className="muted small" style={{ marginTop: 8 }}>This takes a few minutes. You can close this page; it carries on.</p> : null}
        </div>
      </div>

      {!processing ? <AddPaper caseId={id} papers={papers ?? []} first={c.attempts.length === 0} /> : null}

      {available.length ? (
        <div className="card">
          <div className="spread">
            <h2>Documents</h2>
            <div className="row">
              {b.analysis ? <Link className="btn small ghost" href={`/cases/${id}/review`}>Review &amp; edit</Link> : null}
              {ready && c.row.status !== "approved" ? (
                <form action={approveCase}><input type="hidden" name="case_id" value={id} /><button className="btn small">Approve for sharing</button></form>
              ) : null}
            </div>
          </div>
          <table>
            <tbody>
              {available.map((t) => (
                <tr key={t}>
                  <td><strong>{DOC_TYPES[t].label}</strong><div className="muted small">{DOC_TYPES[t].audience}</div></td>
                  <td style={{ textAlign: "right" }}><a className="btn small ghost" href={`/api/cases/${id}/pdf/${t}`} target="_blank">PDF</a></td>
                </tr>
              ))}
            </tbody>
          </table>
          {b.analysis && !b.diagnostic && !processing ? (
            <form action={makeDiagnosticTest} style={{ marginTop: 10 }}>
              <input type="hidden" name="case_id" value={id} />
              <button className="btn small ghost">Also make a diagnostic re-test from these findings</button>
            </form>
          ) : null}
          {c.row.status !== "approved" && ready ? <p className="muted small" style={{ marginTop: 8 }}>Drafts until you approve. Parents only ever see approved documents.</p> : null}
        </div>
      ) : null}

      {b.confirmation ? (
        <form action={saveConfirmationResults} className="card">
          <input type="hidden" name="case_id" value={id} />
          <div className="spread"><h2>Confirmation paper results</h2><button className="btn small">Save results</button></div>
          <p className="muted small">After the student writes the Concept Check, mark each question. The break points and the workbook levels to skip are worked out for you, and the teacher pack and workbook update.</p>
          {b.confirmation.sections.map((s) => {
            const v = verdicts?.find((x) => x.letter === s.letter);
            return (
              <div key={s.letter} style={{ marginTop: 12 }}>
                <h3>Section {s.letter} · {s.weak_area}</h3>
                {v && v.status !== "not_marked" ? (
                  <div className={`notice ${v.status === "secure" ? "ok" : ""}`}>
                    {v.status === "secure" ? "Secure. " : `${v.note} `}{v.startStep ? `Start at Step ${v.startStep}. ` : ""}{v.skipSteps.length ? `Skip ${v.skipSteps.join(", ")}. ` : ""}{v.possibleSlips.length ? `Re-ask orally (possible slips): ${v.possibleSlips.join(", ")}.` : ""}
                  </div>
                ) : null}
                <div className="mark-grid">
                  {s.items.map((it) => {
                    const cur = b.confirmationResults?.[it.q];
                    return (
                      <div key={it.q} className="cell">
                        <b>{it.q} <span className="muted">· Class {it.class_level}</span></b>
                        <span className="seg">
                          {(["right", "half", "wrong"] as const).map((m) => (
                            <label key={m}><input type="radio" name={`r:${it.q}`} value={m} defaultChecked={cur === m} /><span>{m === "right" ? "✔" : m === "half" ? "½" : "✘"}</span></label>
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </form>
      ) : null}

      {c.row.status === "approved" ? (
        <div className="card">
          <h2>Share with parents</h2>
          <ShareBox caseId={id} studentName={c.student.full_name} phone={decrypt(c.student.guardian_phone_enc)} email={decrypt(c.student.guardian_email_enc)} appUrl={env.appUrl()} />
        </div>
      ) : null}
    </>
  );
}
