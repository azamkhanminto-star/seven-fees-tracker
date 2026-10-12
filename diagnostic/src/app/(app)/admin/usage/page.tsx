import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { userClient } from "@/lib/supabase/server";

export default async function Usage() {
  await requireAdmin();
  const db = await userClient();
  const since = new Date(); since.setMonth(since.getMonth() - 3);
  const { data: runs } = await db.from("ai_runs").select("*").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(2000);
  const rows = runs ?? [];
  const byMonth = new Map<string, { cost: number; calls: number; cases: Set<string> }>();
  for (const r of rows) {
    const m = r.created_at.slice(0, 7);
    const x = byMonth.get(m) ?? { cost: 0, calls: 0, cases: new Set<string>() };
    x.cost += Number(r.cost_usd); x.calls += 1; if (r.case_id) x.cases.add(r.case_id);
    byMonth.set(m, x);
  }
  const cacheRead = rows.reduce((a, r) => a + r.cache_read_tokens, 0);
  const input = rows.reduce((a, r) => a + r.input_tokens + r.cache_read_tokens + r.cache_write_tokens, 0);
  return (
    <>
      <h1>AI usage &amp; cost</h1>
      <div className="bars"><i /><i /><i /><i /></div>
      <div className="grid3">
        {[...byMonth.entries()].map(([m, x]) => (
          <div key={m} className="card">
            <div className="muted small">{m}</div>
            <div className="stat">${x.cost.toFixed(2)}</div>
            <div className="muted small">≈ ₹{Math.round(x.cost * 88).toLocaleString("en-IN")} · {x.cases.size} cases · ${x.cases.size ? (x.cost / x.cases.size).toFixed(2) : "0"} per case</div>
          </div>
        ))}
      </div>
      <p className="muted small">Prompt cache: {input ? Math.round((cacheRead / input) * 100) : 0}% of input tokens were served from cache (cheaper).</p>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>When</th><th>Case</th><th>Step</th><th>Model</th><th>In / cached / out</th><th>Cost</th><th>Time</th><th>Result</th></tr></thead>
          <tbody>
            {rows.slice(0, 300).map((r) => (
              <tr key={r.id}>
                <td className="small">{new Date(r.created_at).toLocaleString("en-IN")}</td>
                <td>{r.case_id ? <Link href={`/cases/${r.case_id}`}>open</Link> : "—"}</td>
                <td>{r.step}</td><td className="small">{r.model}{r.fell_back ? " (fallback)" : ""}</td>
                <td className="small">{r.input_tokens.toLocaleString()} / {r.cache_read_tokens.toLocaleString()} / {r.output_tokens.toLocaleString()}</td>
                <td>${Number(r.cost_usd).toFixed(3)}</td>
                <td className="small">{r.duration_ms ? `${Math.round(r.duration_ms / 1000)}s` : "—"}</td>
                <td className="small">{r.error ? <span style={{ color: "var(--red)" }}>{r.error}</span> : r.stop_reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
