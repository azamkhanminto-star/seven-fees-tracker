import type { CaseBundle } from "../lib/case-model";
import { interpretConfirmation } from "../lib/scoring";
import { classLabel, Cover, PartHead, Rich } from "./common";

/** The student never sees class numbers here: only "Level 1–4". */
export function workbook(b: CaseBundle) {
  const parts = b.workbook;
  const conf = b.confirmation;
  const plan = b.plan;
  if (!parts || !conf) throw new Error("Workbook not ready");

  const skipped = new Set<string>(
    b.confirmationResults ? interpretConfirmation(conf, b.confirmationResults).flatMap((v) => v.skipSteps) : [],
  );
  const levelOf = (step: string) => conf.sections.flatMap((s) => s.steps).find((s) => s.step === step)?.level ?? Number(step.split(".")[1] ?? 1);
  const areaTitles = parts.map((p) => p.weakArea);

  const cover = (
    <Cover
      b={b}
      kicker="Student workbook"
      lead={<>{areaTitles.join(" · ")}</>}
      titleBold="Step by Step"
      titleLight="Maths Workbook"
      subBold={`${plan?.days ?? 24}-day plan · ${plan?.minutes_per_day ?? 45} min a day`}
      sub="Small steps, every day."
      whoLabel="Belongs to :"
      whoLines={[b.student.name, classLabel(b)]}
    />
  );

  const body = (
    <>
      <section>
        <div className="h-big"><h2>How to Use<em>This Book</em></h2></div>
        <p>This book has {parts.length} parts, one for each skill you are strengthening. Each part has levels that climb from the basic idea up to your current syllabus.</p>
        <div className="overview-grid" style={{ marginTop: "4mm" }}>
          <div className="card soft">
            <div className="label">Each level has</div>
            <ul style={{ margin: 0, paddingLeft: "4mm" }}>
              <li>Understand it: the idea in simple words</li>
              <li>See it: a real-life picture</li>
              <li>2 solved examples</li>
              <li>5 practice questions (answers at the end of the level)</li>
              <li>Watch out: common mistakes</li>
              <li>A 5-question checkpoint quiz</li>
            </ul>
          </div>
          <div className="callout" style={{ margin: 0 }}>
            <h4>The golden rule</h4>
            <p style={{ margin: 0 }}>Score 4 out of 5 or more on the checkpoint before you move to the next level. If you score less, read the solved examples again, redo the practice, and retake the checkpoint the next day. Your teacher has the checkpoint answers.</p>
          </div>
        </div>
        {plan ? (
          <>
            <h3 className="sub" style={{ marginTop: "6mm" }}>Your {plan.days}-Day Study Plan</h3>
            <p className="small">{plan.minutes_per_day} minutes a day, 6 days a week. Each day: {plan.day_split}.</p>
            {plan.weeks.map((w, i) => (
              <div key={w.title} className="avoid" style={{ marginBottom: "3mm" }}>
                <div className="label">Week {i + 1} · {w.title}</div>
                <table className="plan-table">
                  <thead><tr><th style={{ width: "12mm" }}>Day</th><th>Today’s work</th><th>Done ✓</th></tr></thead>
                  <tbody>
                    {w.days.map((d) => {
                      const skip = d.step && skipped.has(d.step);
                      return (
                        <tr key={d.day} style={skip ? { color: "var(--muted)", textDecoration: "line-through" } : undefined}>
                          <td>{d.day}</td>
                          <td>{d.step ? `Step ${d.step} · ` : ""}{d.task}{skip ? " (skip: your teacher says you already know this)" : ""}</td>
                          <td><span className="tick-box" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        ) : null}
        <p className="small muted">Your teacher may tell you to skip some early levels after the Concept Check. Follow those instructions.</p>
      </section>

      {parts.map((p, pi) => (
        <div key={p.weakArea}>
          <section className="page-break">
            <PartHead kicker={`Part ${pi + 1}`} title={p.weakArea} sub={`Fixing: ${p.fixing}`} />
            <div className="label">Levels in this part:</div>
            <ol>
              {p.steps.map((s) => <li key={s.step}>Step {s.step} · {s.title}{skipped.has(s.step) ? " (skip)" : ""}</li>)}
            </ol>
          </section>
          {p.steps.filter((s) => !skipped.has(s.step)).map((s) => (
            <section key={s.step} className="page-break">
              <div className="level-head"><div className="tiny">Level {levelOf(s.step)} · Step {s.step}</div><h2>{s.title}</h2></div>
              <h3 className="sub" style={{ marginTop: 0 }}>Understand it</h3>
              <p><Rich text={s.understand} /></p>
              {s.hindi_terms.length ? (
                <p className="small">{s.hindi_terms.map((h, i) => <span key={i} className="term">{i ? " · " : ""}{h.en} <span className="hi" lang="hi">({h.hi})</span></span>)}</p>
              ) : null}
              {s.real_life ? <div className="see"><h4>See it in real life</h4><p style={{ margin: 0 }}>{s.real_life}</p></div> : null}
              {s.examples.length ? (
                <>
                  <h3 className="sub">Solved examples</h3>
                  {s.examples.map((e, i) => <div key={i} className="ex"><b>Example {i + 1}. {e.q}</b>{e.a}</div>)}
                </>
              ) : null}
              {s.practice.length ? (
                <>
                  <h3 className="sub">Practice</h3>
                  <ol className="practice">{s.practice.map((x, i) => <li key={i}>{x.q}</li>)}</ol>
                </>
              ) : null}
              {s.watch_out.length ? (
                <>
                  <h3 className="sub">Watch out: common mistakes</h3>
                  <ul className="watch">{s.watch_out.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </>
              ) : null}
              <div className="checkpoint">
                <div className="row"><h4>Checkpoint Quiz · Step {s.step}</h4><span className="need">Need 4/5 to move on</span></div>
                <ol className="practice">{s.checkpoint.map((c, i) => <li key={i}>{c.q}</li>)}</ol>
                <div className="score">My score: ____ / {s.checkpoint.length}</div>
              </div>
              {s.practice.length ? (
                <div className="answers">Practice answers: {s.practice.map((x, i) => `(${i + 1}) ${x.a}`).join(" · ")}</div>
              ) : null}
            </section>
          ))}
        </div>
      ))}
    </>
  );

  return { title: "Step-by-Step Maths Workbook", cover, body };
}
