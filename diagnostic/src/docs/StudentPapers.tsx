/** Printable student papers: confirmation paper, final test, diagnostic re-test. No class levels, no answers. */
import type { ReactNode } from "react";
import type { CaseBundle } from "../lib/case-model";
import { logoDataUri } from "./assets";
import { classLabel } from "./common";

function PaperHeader({ b, title, meta }: { b: CaseBundle; title: string; meta: string }) {
  return (
    <>
      <div className="paper-head">
        <div className="paper-title">
          <div className="muted">{classLabel(b).replace(/-.*/, "")} · Mathematics</div>
          <h1>{title}</h1>
          <div className="muted">{meta}</div>
        </div>
        <img src={logoDataUri("dark")} alt="SEVEN Career Institute" />
      </div>
      <div className="fields">
        <div className="field">Name</div><div className="field">Class / Section</div><div className="field">Date</div>
      </div>
    </>
  );
}

function Instructions({ items }: { items: { title: string; text: string }[] }) {
  return (
    <div className="boxes">
      {items.map((i) => <div key={i.title} className="card"><h4>{i.title}</h4><p className="small" style={{ margin: 0 }}>{i.text}</p></div>)}
    </div>
  );
}

function Q({ n, marks, children, space = true }: { n: string; marks?: number; children: ReactNode; space?: boolean }) {
  return (
    <div className="qrow">
      <div className="qn">{n}</div>
      <div>{children}{space ? <div className="space" /> : null}</div>
      <div className="mk">{marks ? `[${marks}]` : ""}</div>
    </div>
  );
}

export function confirmationPaper(b: CaseBundle) {
  const c = b.confirmation;
  if (!c) throw new Error("Confirmation paper not ready");
  const n = c.sections.reduce((a, s) => a + s.items.length, 0);
  const body = (
    <section>
      <PaperHeader b={b} title="Concept Check" meta={`Time: ${c.minutes} minutes · ${n} short questions · Not for marks`} />
      <Instructions items={[
        { title: "Attempt everything", text: "If you are not sure, write whatever you can. There is no penalty." },
        { title: "Show all working", text: "Your working matters more than the final answer." },
        { title: "No calculator", text: "Strike wrong work with one line; don’t erase it." },
      ]} />
      {c.sections.map((s, i) => (
        <div key={s.letter}>
          <div className="sec-head"><h3>Section {s.letter}</h3><span className="muted small">Part {i + 1} of {c.sections.length}</span></div>
          {s.items.map((it) => <Q key={it.q} n={it.q}>{it.question}</Q>)}
        </div>
      ))}
      <p className="muted small" style={{ textAlign: "center", marginTop: "6mm" }}>End of paper · Check you have attempted every question</p>
    </section>
  );
  return { title: "Concept Check", cover: null, body };
}

export function finalTestPaper(b: CaseBundle) {
  const p = b.plan;
  if (!p) throw new Error("Final test not ready");
  const total = p.final_test.items.reduce((a, i) => a + i.marks, 0);
  const body = (
    <section>
      <PaperHeader b={b} title="Final Test" meta={`Time: ${p.final_test.minutes} minutes · Maximum marks: ${total}`} />
      <Instructions items={[
        { title: "Attempt everything", text: "Partial working earns marks." },
        { title: "Show all working", text: "Even for short questions." },
        { title: "No calculator", text: "Strike wrong work with one line; don’t erase it." },
      ]} />
      {p.final_test.items.map((i) => <Q key={i.q} n={i.q} marks={i.marks}>{i.question}</Q>)}
      <p className="muted small" style={{ textAlign: "center", marginTop: "6mm" }}>End of paper</p>
    </section>
  );
  return { title: "Final Test", cover: null, body };
}

export function diagnosticPaper(b: CaseBundle) {
  const d = b.diagnostic;
  if (!d) throw new Error("Diagnostic test not generated");
  const total = d.sections.reduce((a, s) => a + s.items.length * s.marks_each, 0);
  const body = (
    <section>
      <PaperHeader b={b} title={d.title || "Diagnostic Test"} meta={`Time: ${d.minutes} minutes · Maximum marks: ${total}`} />
      <Instructions items={d.instructions.length ? d.instructions : [
        { title: "Sections", text: d.sections.map((s) => `${s.name}: ${s.items.length} × ${s.marks_each} mark${s.marks_each > 1 ? "s" : ""}`).join(" · ") },
        { title: "Attempt everything", text: "Partial working earns marks." },
        { title: "Show all working", text: "Strike wrong work with one line. No calculator." },
      ]} />
      {d.sections.map((s) => (
        <div key={s.name}>
          <div className="sec-head"><h3>{s.name}</h3><span className="muted small">{s.marks_each} mark{s.marks_each > 1 ? "s" : ""} each · ~{s.minutes} min</span></div>
          {s.items.map((i) => <Q key={i.q} n={i.q} space={s.marks_each > 1}>{i.question}</Q>)}
        </div>
      ))}
      <p className="muted small" style={{ textAlign: "center", marginTop: "6mm" }}>End of paper · Check you have attempted every question</p>
    </section>
  );
  return { title: d.title || "Diagnostic Test", cover: null, body };
}
