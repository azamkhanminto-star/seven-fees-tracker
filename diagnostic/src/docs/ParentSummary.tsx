import type { CaseBundle } from "../lib/case-model";
import { paperScore, fmtMarks } from "../lib/scoring";
import { logoDataUri } from "./assets";
import { Bars, classLabel } from "./common";

export function parentSummary(b: CaseBundle) {
  const ps = b.plan?.parent_summary;
  if (!ps) throw new Error("Parent summary not ready");
  const latest = b.papers.at(-1)!;
  const s = paperScore(latest);
  const block = (lang: "en" | "hi") => {
    const t = ps[lang];
    const L = lang === "en"
      ? { strengths: "What is going well", working: "What we are working on", help: "How you can help at home" }
      : { strengths: "क्या अच्छा चल रहा है", working: "हम किस पर काम कर रहे हैं", help: "आप घर पर कैसे मदद कर सकते हैं" };
    return (
      <div lang={lang} className={lang === "hi" ? "hi" : undefined}>
        <h3 style={{ fontSize: "13pt", color: "var(--teal-dark)" }}>{t.headline}</h3>
        <h4>{L.strengths}</h4><p>{t.strengths}</p>
        <h4>{L.working}</h4><p>{t.working_on}</p>
        <h4>{L.help}</h4><p>{t.how_to_help}</p>
      </div>
    );
  };
  const body = (
    <section>
      <div className="paper-head">
        <div className="paper-title">
          <div className="muted">Progress note for parents · अभिभावकों के लिए</div>
          <h1>{b.student.name}</h1>
          <div className="muted">{classLabel(b)} · Mathematics · {b.monthLabel}</div>
        </div>
        <img src={logoDataUri("dark")} alt="SEVEN Career Institute" />
      </div>
      <div className="card soft" style={{ display: "flex", gap: "10mm", alignItems: "center", marginBottom: "6mm" }}>
        <div><div className="stat">{fmtMarks(s.scored)}/{fmtMarks(s.max)}</div><div className="stat-label">{latest.shortName}</div></div>
        <p style={{ margin: 0 }}>Our teachers checked every answer to find not just what went wrong, but why. A step-by-step plan has started; we will share the result of the final test.</p>
      </div>
      <div className="parent-cols">{block("en")}{block("hi")}</div>
      <div style={{ marginTop: "10mm" }}><Bars /></div>
      <p className="small muted" style={{ marginTop: "2mm" }}>Questions? Speak to the subject teacher at SEVEN Career Institute, Medical Road, Aligarh.</p>
    </section>
  );
  return { title: "Parent Summary", cover: null, body };
}
