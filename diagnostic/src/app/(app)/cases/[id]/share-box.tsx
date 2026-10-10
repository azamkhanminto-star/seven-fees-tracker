"use client";
import { useState } from "react";
import { createShare } from "./actions";

const DOCS = [
  { key: "parent_summary", label: "Parent summary (English & Hindi)" },
  { key: "mistakes_report", label: "Conceptual Mistakes Report" },
  { key: "workbook", label: "Student workbook" },
];

export function ShareBox({ caseId, studentName, phone, email, appUrl }: { caseId: string; studentName: string; phone: string | null; email: string | null; appUrl: string }) {
  const [docs, setDocs] = useState<string[]>(["parent_summary", "mistakes_report"]);
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function make(channel: "whatsapp" | "email" | "link") {
    setErr(null);
    try {
      const s = await createShare(caseId, channel, docs);
      const url = `${appUrl}/share/${s.token}`;
      setLink(url);
      const text = `Dear parent, ${studentName}'s maths progress report from SEVEN Career Institute is ready. It is private and opens until ${new Date(s.expires_at).toLocaleDateString("en-IN")}: ${url}`;
      if (channel === "whatsapp") window.open(`https://wa.me/${(phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
      if (channel === "email") window.location.href = `mailto:${email ?? ""}?subject=${encodeURIComponent(`${studentName}: maths progress report`)}&body=${encodeURIComponent(text)}`;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      {DOCS.map((d) => (
        <label key={d.key} className="check">
          <input type="checkbox" checked={docs.includes(d.key)} onChange={(e) => setDocs(e.target.checked ? [...docs, d.key] : docs.filter((x) => x !== d.key))} /> {d.label}
        </label>
      ))}
      <div className="row" style={{ marginTop: 8 }}>
        <button type="button" className="btn small" onClick={() => make("whatsapp")}>WhatsApp</button>
        <button type="button" className="btn small" onClick={() => make("email")}>Email</button>
        <button type="button" className="btn small ghost" onClick={() => make("link")}>Copy link</button>
      </div>
      {link ? <p className="small" style={{ marginTop: 8 }}>Private link (30 days): <a href={link} target="_blank">{link}</a></p> : null}
      {err ? <div className="notice err">{err}</div> : null}
    </div>
  );
}
