import type { CaseBundle } from "../lib/case-model";
import { EDITION_LABEL, editionFor } from "../lib/concepts/editions";
import { baseline, fmtMarks, interpretConfirmation } from "../lib/scoring";
import { cite, classLabel, Cover, EvidenceText, he, him, his, paperName, PartHead, Rich } from "./common";

export function teacherPack(b: CaseBundle) {
  const t = b.tracing;
  const conf = b.confirmation;
  if (!t || !conf) throw new Error("Tracing and confirmation paper not ready");
  const wb = b.workbook;
  const plan = b.plan;
  const verdicts = b.confirmationResults ? interpretConfirmation(conf, b.confirmationResults) : null;
  const totalItems = conf.sections.reduce((n, s) => n + s.items.length, 0);
  const editionsUsed = [...new Set([6, 7, 8, 9].filter((c) => c <= b.student.cls)
    .map((c) => editionFor(c, b.student.cls, b.student.year)))].map((e) => EDITION_LABEL[e]);

  const cover = (
    <Cover
      b={b}
      kicker="Teacher’s copy · Confidential"
      lead={<>Part A: root-cause tracing<br />Part B: confirmation paper notes &amp; key<br />Part C: remedial material notes &amp; keys</>}
      titleBold="Remedial"
      titleLight="Teacher Pack"
      subBold="Teacher’s copy"
      sub="Not for the student or parents."
      whoLabel="Student :"
      whoLines={[b.student.name, `${classLabel(b)} · ${b.student.board}`, b.monthLabel]}
      badge="CONFIDENTIAL"
    />
  );

  const body = (
    <>
      {/* ───────── PART A */}
      <section>
        <PartHead kicker="Part A" title="Root-Cause Tracing" sub="Concept lineage for each weak area, back to the foundation" />
        <p>
          Each weak area is broken into the smaller skills it needs. Each skill is traced back class by class to where it is first taught.
          Chapters refer to the books {he(b)} studied ({editionsUsed.join("; ")}). In each chain, <span className="hl">yellow</span> marks the most likely break point.
        </p>
        {t.weak_areas.map((w, wi) => (
          <div key={w.title}>
            <div className="area-head avoid" style={{ breakAfter: "avoid" }}><div className="tiny">Weak Area {wi + 1}</div><h3>{w.title}</h3><p>Fixing: {w.fixing}</p></div>
            {w.sub_skills.map((s) => (
              <div key={s.name} className="avoid">
                <h3 className="sub">{s.name}</h3>
                <div className="chain">
                  {s.chain.map((link, li) => {
                    const cls = link.is_break ? "pill brk" : li === 0 ? "pill cur" : "pill";
                    return (
                      <span key={li} style={{ display: "contents" }}>
                        <span className={cls}><b>{cite(b, link.concept_id)}</b>{link.note ? `: ${link.note}` : ""}</span>
                        {li < s.chain.length - 1 ? <span className="arrow">←</span> : null}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="callout avoid">
              <h4>Most likely break point: {w.break_point.headline}</h4>
              <p>{w.break_point.explanation}</p>
              <p className="small"><strong>Weak:</strong> {w.break_point.weak_evidence.map((e, i) => <span key={i}>{i ? " · " : ""}{paperName(b, e.paper)} <EvidenceText b={b} e={e} /></span>)}</p>
              {w.break_point.secure_evidence.length ? (
                <p className="small"><strong>Secure:</strong> {w.break_point.secure_evidence.map((e, i) => <span key={i}>{i ? " · " : ""}{paperName(b, e.paper)} <EvidenceText b={b} e={e} /></span>)}</p>
              ) : null}
              <p className="small muted" style={{ margin: 0 }}>Confidence: {w.break_point.confidence}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="page-break">
        <div className="tiny" style={{ color: "var(--teal)" }}>Overlaps</div>
        <div className="h-big"><h2>Shared Roots<em>Fixing one root fixes several problems</em></h2></div>
        <table>
          <thead><tr><th>Shared root</th><th>Weak areas</th><th>Where it is taught</th><th>Evidence</th></tr></thead>
          <tbody>
            {t.shared_roots.map((r) => (
              <tr key={r.root}>
                <td><strong>{r.root}</strong></td>
                <td>{r.weak_areas.join(", ")}</td>
                <td>{r.concept_ids.map((id) => cite(b, id)).join("; ")}</td>
                <td>{r.evidence.map((e) => `${e.q}${e.observation ? ` (${e.observation})` : ""}`).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="callout" style={{ marginTop: "8mm" }}>
          <h4>Biggest payoff: {t.biggest_payoff.title || cite(b, t.biggest_payoff.concept_id)}</h4>
          <p style={{ margin: 0 }}>{t.biggest_payoff.why}</p>
        </div>
      </section>

      {/* ───────── PART B */}
      <section className="page-break">
        <PartHead kicker="Part B" title="Root-Cause Confirmation Paper" sub="Teacher’s notes · tagging sheet · answer key · interpretation guide" />
        <div className="overview-grid" style={{ marginBottom: "5mm" }}>
          <div className="card soft"><div className="label">Format</div>
            <p style={{ margin: 0 }}>{totalItems} short questions in {conf.sections.length} sections, one per weak area. Within each section the questions climb from the lowest class to {classLabel(b).replace(/-.*/, "")}. {conf.minutes} minutes. The student copy shows no class levels.</p></div>
          <div className="card soft"><div className="label">How to give it</div><p style={{ margin: 0 }}>{conf.how_to_give}</p></div>
        </div>
        <h3 className="sub">Teacher’s tagging sheet</h3>
        <table>
          <thead><tr><th>Q</th><th>Weak area</th><th>Class</th><th>Concept tested</th><th>NCERT chapter</th></tr></thead>
          <tbody>
            {conf.sections.flatMap((s) => s.items.map((i) => (
              <tr key={i.q}><td><strong>{i.q}</strong></td><td>{s.weak_area}</td><td className="cls">Class {i.class_level}</td><td>{i.concept_tested}</td><td>{cite(b, i.concept_id).replace(/^Class \d+ · /, `Cl ${i.class_level} `)}</td></tr>
            )))}
          </tbody>
        </table>
      </section>

      <section className="page-break">
        <div className="h-big"><h2>Answer Key</h2></div>
        {conf.sections.map((s) => (
          <div key={s.letter}>
            <h3 className="sub">Section {s.letter} · {s.weak_area}</h3>
            <table>
              <tbody>
                {s.items.map((i) => (
                  <tr key={i.q}>
                    <td style={{ width: "10mm" }}><strong>{i.q}</strong></td>
                    <td style={{ width: "16mm" }} className="cls muted">Class {i.class_level}</td>
                    <td>{i.question}<br /><span className="right">→ {i.answer}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section className="page-break">
        <div className="h-big"><h2>Interpretation Guide</h2></div>
        <div className="callout teal">
          <h4>The rule</h4>
          <p style={{ margin: 0 }}>Within each section, find the lowest class level where {he(b)} gets half or more of that level’s questions wrong. That is {his(b)} break point for the area. Start remediation at that class’s concept (the workbook step in the last column), then climb. A single wrong answer at a low level with everything right above it is probably a slip: ask it again orally before deciding.</p>
        </div>
        {conf.sections.map((s) => {
          const v = verdicts?.find((x) => x.letter === s.letter);
          return (
            <div key={s.letter} className="avoid">
              <h3 className="sub">Section {s.letter} · {s.weak_area}</h3>
              <table>
                <thead><tr><th>If {he(b)} fails…</th><th>Break point</th><th>Start remediation at</th></tr></thead>
                <tbody>
                  {s.rules.map((r) => <tr key={r.if_fails.join()}><td>{r.if_fails.join(", ")} ✘</td><td>{r.break_point}</td><td>Step {r.start_step}</td></tr>)}
                </tbody>
              </table>
              <p className="small muted" style={{ marginTop: "1.5mm" }}>Predicted from {his(b)} papers: {s.prediction}</p>
              {v && v.status !== "not_marked" ? (
                <p className="small"><span className="hl">Result</span> {v.status === "secure" ? "Section secure." : v.note} {v.startStep ? `Start at Step ${v.startStep}.` : ""} {v.skipSteps.length ? `Skip ${v.skipSteps.join(", ")}.` : ""} {v.possibleSlips.length ? `Possible slips to re-ask orally: ${v.possibleSlips.join(", ")}.` : ""}</p>
              ) : null}
            </div>
          );
        })}
        <div className="callout"><h4>If a whole section is correct</h4><p style={{ margin: 0 }}>{conf.whole_section_correct_rule}</p></div>
      </section>

      {/* ───────── PART C */}
      {wb ? (
        <section className="page-break">
          <PartHead kicker="Part C" title="Remedial Material: Teacher Notes" sub="Level map · checkpoint answers · final test key" />
          <p>The student workbook shows levels, not classes, so {he(b)} isn’t discouraged. This table maps each step to its class.</p>
          <table>
            <thead><tr><th>Step</th><th>Weak area</th><th>Workbook label</th><th>Class</th><th>Topic</th></tr></thead>
            <tbody>
              {conf.sections.flatMap((s) => s.steps.map((st) => (
                <tr key={st.step}><td><strong>{st.step}</strong></td><td>{s.weak_area}</td><td>Level {st.level}</td><td className="cls">{st.class_band}</td><td>{st.title}</td></tr>
              )))}
            </tbody>
          </table>
          <h3 className="sub" style={{ marginTop: "6mm" }}>Checkpoint quiz answers (pass mark 4/5)</h3>
          <table>
            <thead><tr><th style={{ width: "14mm" }}>Step</th><th>Answers</th></tr></thead>
            <tbody>
              {wb.flatMap((p) => p.steps.map((st) => (
                <tr key={st.step}><td><strong>{st.step}</strong></td><td>{st.checkpoint.map((c, i) => <span key={i}>{i + 1}. {c.a}{i < st.checkpoint.length - 1 ? " · " : ""}</span>)}</td></tr>
              )))}
            </tbody>
          </table>
          <div className="callout teal"><h4>If {he(b)} scores below 4/5</h4><p style={{ margin: 0 }}>Go back over the step’s solved examples with {him(b)}, set the practice questions {he(b)} got wrong in a new form (change the numbers), and repeat the checkpoint the next day before moving on.</p></div>
        </section>
      ) : null}

      {plan ? <FinalTestKey b={b} /> : null}

      {/* ───────── Appendix: question by question */}
      {b.analysis?.questions.length ? (
        <section className="page-break">
          <div className="tiny" style={{ color: "var(--teal)" }}>Appendix</div>
          <div className="h-big"><h2>Question by Question</h2></div>
          <table>
            <thead><tr><th>Paper</th><th>Q</th><th>Marks</th><th>Outcome</th><th>Error type</th><th>What went wrong</th></tr></thead>
            <tbody>
              {b.analysis.questions.filter((q) => q.outcome !== "right").map((q) => {
                const p = b.papers.find((x) => x.key === q.paper);
                const r = p?.responses.find((x) => x.q === q.q);
                return (
                  <tr key={`${q.paper}-${q.q}`}>
                    <td className="nowrap">{paperName(b, q.paper)}</td><td><strong>{q.q}</strong></td>
                    <td className="nowrap">{r?.marks != null ? `${fmtMarks(r.marks)}/${fmtMarks(r.maxMarks)}` : "—"}</td>
                    <td>{q.outcome}</td><td>{q.error_types.join(", ").replaceAll("_", " ")}</td><td>{q.what_went_wrong}{q.confidence !== "high" ? ` (${q.confidence} confidence)` : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="small muted" style={{ marginTop: "2mm" }}>Questions answered fully correctly are not listed.</p>
        </section>
      ) : null}
    </>
  );

  return { title: "Remedial Teacher Pack · Teacher’s copy", cover, body };
}

function FinalTestKey({ b }: { b: CaseBundle }) {
  const plan = b.plan!;
  const base = baseline(plan, b.papers);
  const total = plan.final_test.items.reduce((n, i) => n + i.marks, 0);
  return (
    <section className="page-break">
      <div className="h-big"><h2>Final Test<em>Answer Key</em></h2></div>
      <p>{plan.final_test.minutes} minutes · {total} marks · {classLabel(b).replace(/-.*/, "")} syllabus. Each question mirrors one from {his(b)} earlier papers, so the two can be compared directly.</p>
      <table>
        <thead><tr><th>Q</th><th>Marks</th><th>Solution</th><th>Mirrors</th></tr></thead>
        <tbody>
          {plan.final_test.items.map((i) => (
            <tr key={i.q}><td><strong>{i.q}</strong></td><td>{i.marks}</td><td><Rich text={i.solution} /></td><td className="nowrap">{paperName(b, i.mirrors.paper)} {i.mirrors.q}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="callout" style={{ marginTop: "6mm" }}>
        <h4>Measuring improvement</h4>
        <p style={{ margin: 0 }}>
          On the matching questions in {his(b)} original papers {he(b)} scored {fmtMarks(base.scored)} out of {fmtMarks(base.max)} (≈ {Math.round(base.pct)}%):{" "}
          {base.detail.filter((d) => d.found).map((d) => `${d.q} ${fmtMarks(d.scored)}/${fmtMarks(d.max)}`).join(", ")}.
          Compare that with {his(b)} final-test percentage. Target: {plan.target_pct}% or more ({base.targetMarks}/{total}). Any question still wrong points back to its workbook step.
        </p>
      </div>
      <p className="small muted">Concepts behind each question: {plan.final_test.items.map((i) => `${i.q} → Step ${i.step}`).join(" · ")}</p>
    </section>
  );
}
