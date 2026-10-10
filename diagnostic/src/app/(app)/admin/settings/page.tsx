import { requireAdmin } from "@/lib/auth";
import { DEFAULT_PRICES } from "@/lib/ai/pricing";
import { loadSettings } from "@/lib/settings";
import { userClient } from "@/lib/supabase/server";
import { saveSettings } from "../actions";

const MODELS = ["claude-sonnet-5-5", "claude-opus-5-5", "claude-fable-5-1", "claude-haiku-5-5"];

export default async function Settings() {
  await requireAdmin();
  const s = await loadSettings(await userClient());
  const models = [...new Set([...MODELS, s.routine_model, s.difficult_model])];
  return (
    <>
      <h1>Settings</h1>
      <div className="bars"><i /><i /><i /><i /></div>
      <form action={saveSettings}>
        <div className="grid2">
          <div className="card">
            <h2>AI models</h2>
            <label>Routine reports</label>
            <select name="routine_model" defaultValue={s.routine_model}>{models.map((m) => <option key={m}>{m}</option>)}</select>
            <label>Difficult or borderline cases</label>
            <select name="difficult_model" defaultValue={s.difficult_model}>{models.map((m) => <option key={m}>{m}</option>)}</select>
            <label className="check" style={{ marginTop: 12 }}><input type="checkbox" name="auto_escalate" defaultChecked={s.auto_escalate} /> Automatically switch to the difficult-case model when Claude says the evidence is unclear</label>
            <label>Switch when more than this % of answers are hard to read</label>
            <input type="number" name="illegible_escalate_fraction" defaultValue={Math.round(s.illegible_escalate_fraction * 100)} min={0} max={100} />
            <label>Prices per million tokens (JSON, leave {"{}"} for the built-in list)</label>
            <textarea name="prices" defaultValue={JSON.stringify(s.prices)} />
            <p className="muted small">Built in: {Object.entries(DEFAULT_PRICES).map(([m, p]) => `${m} $${p.input}/$${p.output}`).join(" · ")}</p>
          </div>
          <div className="card">
            <h2>Institute &amp; data</h2>
            <label>Address shown on every document</label>
            <input type="text" name="institute_address" defaultValue={s.institute_address} />
            <label>Delete scans this many months after a report is approved</label>
            <input type="number" name="scan_retention_months" defaultValue={s.scan_retention_months} min={1} />
            <label>Year the new Ganita Prakash book started, per class (JSON)</label>
            <input type="text" name="gp_start_years" defaultValue={JSON.stringify(s.gp_start_years)} />
            <p className="muted small">Used so each report cites the chapter numbers from the book the student actually studied.</p>
          </div>
        </div>
        <button className="btn">Save settings</button>
      </form>
    </>
  );
}
