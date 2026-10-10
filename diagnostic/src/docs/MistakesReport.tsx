import type { CaseBundle } from "../lib/case-model";
import { chapterScores, fmtMarks, paperScore, sectionScores } from "../lib/scoring";
import { Bars, classLabel, Cover, EvidenceText, he, paperName, Rich } from "./common";

const FIX_LABEL = {
  one_lesson: "One-lesson fixes",
  weeks_practice: "Needs weeks of practice",
  pattern_recognition: "Needs pattern recognition",
} as const;

const two = (n: number) => String(n).padStart(2, "0");

export function mistakesReport(b: CaseBundle) {
  const a = b.analysis;
  if (!a) throw new Error("Analysis not ready");
  const multi = b.papers.length > 1;
  const papersLabel = b.papers.map((p) => p.shortName).join(" vs ");
  const totalMarks = b.papers.reduce((s, p) => s + p.paper.total_marks, 0);
  const mistakes = a.mistakes;
  const recurring = mistakes.filter((m) => !multi || m.recurs_in_all_papers);
  const latest = b.papers.at(-1)!;

  // page numbers: cover 1, intro 2, overview 3, scores 4, mistakes from 5
  const pages: [string, number][] = [["Overview at a Glance", 3], ["Scores & Strength Map", 4]];
  mistakes.forEach((m, i) => pages.push([`${two(i + 1)} · ${m.title}`, 5 + i]));
  let next = 5 + mistakes.length;
  if (a.fixed_mistakes.length) pages.push([multi ? `Fixed by the ${latest.shortName}` : "Fixed", next++]);
  pages.push(["What to Teach First", next]);

  const cover = (
    <Cover
      b={b}
      kicker={`${classLabel(b).replace(/-.*/, "")} · Mathematics`}
      lead={multi ? `A study of the conceptual mistakes that repeated across ${b.papers.length} maths papers.` : "A study of the conceptual mistakes in one maths paper, and where each one began."}
      titleBold="Conceptual"
      titleLight="Mistakes Report"
      subBold={papersLabel}
      sub={multi ? "Where the same idea broke twice." : "Where the understanding stopped."}
      whoLabel="Student Info :"
      whoLines={[b.student.name, `${classLabel(b)}${b.student.rollNo ? ` · Roll No. ${b.student.rollNo}` : ""}`, b.monthLabel]}
    />
  );

  const body = (
    <>
      {/* ── Introduction + contents */}
      <section>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "12mm" }}>
          <div>
            <div className="h-big"><h2>Introduction<em>to the Review</em></h2></div>
            <p>
              This report brings together {multi ? `${b.papers.length} papers` : "a paper"} written by the same student:{" "}
              {b.papers.map((p, i) => (
                <span key={p.key}>{i > 0 ? (i === b.papers.length - 1 ? " and " : ", ") : ""}the {p.title} ({p.paper.total_marks} marks)</span>
              ))}.
            </p>
            {multi ? <p>A mistake is counted as recurring only if the same idea broke in every paper. These are the mistakes to fix first.</p>
                   : <p>Each mistake is traced to the idea behind it. A follow-up paper will show which ones recur.</p>}
            <div style={{ marginTop: "18mm" }}>
              <div className="stat">{b.papers.length} {b.papers.length === 1 ? "paper" : "papers"}</div>
              <div className="stat-label">{totalMarks} marks of written work reviewed question by question</div>
            </div>
          </div>
          <div>
            <div className="h-big"><h2>Contents</h2></div>
            <table>
              <tbody>
                {pages.map(([t, n]) => <tr key={t}><td>{t}</td><td style={{ textAlign: "right" }} className="muted">{two(n)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Overview */}
      <section className="page-break">
        <div className="h-big" style={{ display: "grid", gridTemplateColumns: "1fr auto" }}>
          <h2>Overview<em>at a Glance</em></h2>
          <div className="stats" style={{ display: "grid", gridAutoFlow: "column" }}>
            {b.papers.map((p) => {
              const s = paperScore(p);
              return <div key={p.key} style={{ textAlign: "right" }}><div className="stat">{p.key === latest.key && multi ? `${Math.round(s.pct)}%` : `${fmtMarks(s.scored)}/${fmtMarks(s.max)}`}</div><div className="stat-label">{p.shortName} Score</div></div>;
            })}
          </div>
        </div>
        <h3 className="sub">What the {multi ? "papers show together" : "paper shows"}</h3>
        <p style={{ maxWidth: "110mm" }}>{a.headline}</p>
        <div className="overview-grid" style={{ marginTop: "6mm" }}>
          <div>
            <div className="stat" style={{ fontSize: "34pt" }}>{recurring.length}</div>
            <div className="stat-label" style={{ marginBottom: "5mm" }}>{multi ? "Recurring conceptual mistakes" : "Conceptual mistakes found"}</div>
            <div className="label">{multi ? "Recurring in both papers" : "Mistakes found"}</div>
            <ul className="mistake-list">
              {mistakes.map((m, i) => (
                <li key={m.title}><span className="n">{two(i + 1)}</span><span><b>{m.title}</b>{m.one_line}</span></li>
              ))}
            </ul>
          </div>
          <div>
            {a.fixed_mistakes.length ? (
              <div className="callout teal"><h4>✓ Good News</h4>
                <p>{a.fixed_mistakes.length} earlier {a.fixed_mistakes.length === 1 ? "mistake" : "mistakes"} did not come back: {a.fixed_mistakes.map((f) => f.concept).join(", ")}.</p></div>
            ) : a.genuine_strengths.length ? (
              <div className="callout teal"><h4>✓ What {he(b)} knows well</h4><p>{a.genuine_strengths.map((s) => s.statement).join(" ")}</p></div>
            ) : null}
            <div className="callout"><h4>! The Focus</h4><p>The {recurring.length} {multi ? "recurring " : ""}mistakes are where teaching time should go now.</p></div>
            <div className="card" style={{ marginTop: "4mm" }}>
              <div className="label">Mistake Type Split</div>
              <ul className="split" style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                {(Object.keys(FIX_LABEL) as (keyof typeof FIX_LABEL)[]).map((k) => {
                  const nums = mistakes.map((m, i) => (m.fix_type === k ? two(i + 1) : null)).filter(Boolean);
                  return nums.length ? <li key={k}><span className="sw" />{FIX_LABEL[k]}: {nums.join(", ")}</li> : null;
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Scores and strength map (required by the brief; not in the reference pack) */}
      <section className="page-break">
        <div className="h-big"><h2>Scores &amp;<em>Strength Map</em></h2></div>
        <div className="overview-grid">
          <div>
            {b.papers.map((p) => {
              const s = paperScore(p);
              const secs = sectionScores(p).filter((x) => x.section !== "—");
              return (
                <div key={p.key} className="card avoid" style={{ marginBottom: "4mm" }}>
                  <div className="label">{p.title}</div>
                  <div className="stat" style={{ fontSize: "18pt" }}>{fmtMarks(s.scored)}/{fmtMarks(s.max)} <span className="muted" style={{ fontSize: "10pt" }}>· {s.pct}%</span></div>
                  {secs.length > 1 ? (
                    <table style={{ marginTop: "2mm" }}>
                      <thead><tr><th>Section</th><th>Marks</th><th>%</th></tr></thead>
                      <tbody>{secs.map((x) => <tr key={x.section}><td>{x.section}</td><td>{fmtMarks(x.scored)}/{fmtMarks(x.max)}</td><td>{Math.round(x.pct)}%</td></tr>)}</tbody>
                    </table>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div>
            <div className="label">Chapter strength map · {latest.shortName}</div>
            <table>
              <thead><tr><th>Chapter</th><th>Marks</th><th>Level</th></tr></thead>
              <tbody>
                {chapterScores(latest, b.student.cls).map((c) => (
                  <tr key={c.chapter}>
                    <td>{c.chapter}</td>
                    <td className="nowrap">{fmtMarks(c.scored)}/{fmtMarks(c.max)}</td>
                    <td className={c.level === "strong" ? "ok" : c.level === "weak" ? "wrong" : ""}>{c.level === "strong" ? "Strong" : c.level === "weak" ? "Weak" : "Average"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="overview-grid" style={{ marginTop: "5mm" }}>
          <div className="card soft avoid">
            <div className="label">What {he(b)} genuinely knows well</div>
            {a.genuine_strengths.map((s) => (
              <p key={s.statement}>{s.statement}{s.evidence.length ? <span className="muted"> ({s.evidence.map((e) => `${paperName(b, e.paper)} ${e.q}`).join(", ")})</span> : null}</p>
            ))}
          </div>
          <div className="card avoid">
            <div className="label">Nature of the problem: {a.nature_of_problem.primary}</div>
            <p>{a.nature_of_problem.explanation}</p>
          </div>
        </div>
        {a.data_gaps.length ? (
          <div className="callout"><h4>Where we are not sure</h4>{a.data_gaps.map((g) => <p key={g}>{g}</p>)}</div>
        ) : null}
      </section>

      {/* ── One page per mistake */}
      {mistakes.map((m, i) => {
        const [first, ...rest] = m.title.split(" ");
        return (
          <section key={m.title} className="page-break">
            <div className="h-big">
              <h2>{first}<em>{rest.join(" ")}</em></h2>
              <div className="num">{two(i + 1)}</div>
            </div>
            <div className="label">Mistake {two(i + 1)} of {two(mistakes.length)}{multi && !m.recurs_in_all_papers ? " · seen in one paper only" : ""}</div>
            <p style={{ maxWidth: "120mm" }}>{m.summary}</p>
            <div className="mistake-grid">
              <div className="writes">
                <div className="tiny">What {he(b)} writes</div>
                <div className="bad">✗ {m.student_writes}</div>
                <div className="tiny">The correct idea</div>
                <div className="good">✓ {m.correct_idea}</div>
              </div>
              <div>
                {m.evidence.map((e, k) => (
                  <div key={k} className="ev">
                    <div className={`dot${b.papers.findIndex((p) => p.key === e.paper) % 2 ? " alt" : ""}`}>{paperName(b, e.paper).charAt(0)}</div>
                    <div><h4>{paperName(b, e.paper)}</h4><EvidenceText b={b} e={e} /></div>
                  </div>
                ))}
              </div>
            </div>
            <h3 className="sub" style={{ marginTop: "8mm" }}>Why It Happens</h3>
            <p>{m.why_it_happens}</p>
            <div className="quote-box"><h4>Teach This</h4><p><Rich text={m.teach_this} /></p></div>
            {m.confidence !== "high" ? <p className="muted small" style={{ marginTop: "3mm" }}>Confidence: {m.confidence}. Confirm with the root-cause paper before re-teaching.</p> : null}
          </section>
        );
      })}

      {/* ── Fixed */}
      {a.fixed_mistakes.length ? (
        <section className="page-break">
          <div className="h-big"><h2>Fixed by the<em>{latest.shortName}</em></h2></div>
          <p>These appeared in the earlier paper but {he(b)} got them right later. They need a quick revision, not re-teaching.</p>
          <table style={{ marginTop: "4mm" }}>
            <thead><tr><th>Concept</th><th>{paperName(b, a.fixed_mistakes[0].before.paper)}</th><th>{paperName(b, a.fixed_mistakes[0].after.paper)}</th><th>Status</th></tr></thead>
            <tbody>
              {a.fixed_mistakes.map((f) => (
                <tr key={f.concept}>
                  <td><strong>{f.concept}</strong></td>
                  <td>{f.before.q}: {f.before.observation}</td>
                  <td>{f.after.q}: {f.after.observation}</td>
                  <td className="ok">✓ Fixed</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="overview-grid" style={{ marginTop: "8mm", gridTemplateColumns: "auto auto 1fr" }}>
            <div><div className="stat">{a.fixed_mistakes.length}</div><div className="stat-label">Concepts fixed</div></div>
            <div><div className="stat">{recurring.length}</div><div className="stat-label">Still recurring</div></div>
            {a.caution ? <div className="callout" style={{ margin: 0 }}><h4>A Word of Caution</h4><p>{a.caution}</p></div> : <div />}
          </div>
        </section>
      ) : null}

      {/* ── What to teach first */}
      <section className="page-break">
        <div className="h-big"><h2>What to<em>Teach First</em></h2></div>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "8mm" }}>
          <div>
            <div className="label">Priority order</div>
            {a.priorities.map((p) => (
              <div key={p.rank} className="ev" style={{ gridTemplateColumns: "12mm 1fr" }}>
                <div className="stat" style={{ fontSize: "18pt" }}>{two(p.rank)}</div>
                <div><div className="tiny" style={{ color: "var(--teal)" }}>{p.label}</div><h4 style={{ fontSize: "11pt" }}>{p.title}</h4><p>{p.what}</p></div>
              </div>
            ))}
          </div>
          <div className="card soft">
            <div className="label">Check-in Plan</div>
            {a.check_in_plan.map((c) => <p key={c.when}><strong>{c.when}:</strong> {c.what}</p>)}
          </div>
        </div>
        <div className="quote-box" style={{ display: "flex", alignItems: "center", gap: "6mm" }}>
          <div className="stat" style={{ color: "var(--yellow)", fontSize: "28pt" }}>{a.priorities.length}</div>
          <p>priorities. {a.closing_note}</p>
        </div>
        <div style={{ marginTop: "8mm" }}><Bars /></div>
        <p className="muted small" style={{ marginTop: "2mm" }}>Prepared by SEVEN Career Institute with AI-assisted analysis, reviewed by the subject teacher.</p>
      </section>
    </>
  );

  return { title: "Conceptual Mistakes Report", cover, body };
}
