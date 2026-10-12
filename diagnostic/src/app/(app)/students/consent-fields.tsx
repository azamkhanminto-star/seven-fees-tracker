import { CONSENT_NOTICE_VERSION, CONSENT_PURPOSES } from "@/lib/ui";

/** Parental consent (DPDP): required before any paper is uploaded for a minor. */
export function ConsentFields({ guardian }: { guardian?: string | null }) {
  return (
    <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
      <h3>Parental consent</h3>
      <p className="small muted">The parent or guardian agrees to these purposes (notice {CONSENT_NOTICE_VERSION}):</p>
      <ul className="small" style={{ paddingLeft: 18, margin: "4px 0 8px" }}>{CONSENT_PURPOSES.map((p) => <li key={p}>{p}</li>)}</ul>
      <div className="grid2">
        <div><label>Consent given by</label><input type="text" name="consent_guardian" defaultValue={guardian ?? ""} placeholder="Guardian's name" /></div>
        <div><label>Relation</label><select name="relation"><option>father</option><option>mother</option><option>guardian</option></select></div>
      </div>
      <label>How</label>
      <select name="method"><option value="signed_form">Signed consent form</option><option value="in_person">In person at the institute</option><option value="email_otp">Email confirmation</option></select>
      <label>Signed form (photo or PDF, optional)</label><input type="file" name="evidence" accept="image/*,application/pdf" />
      <label className="check"><input type="checkbox" name="consent_given" /> The parent or guardian has given consent for the purposes above.</label>
    </div>
  );
}
