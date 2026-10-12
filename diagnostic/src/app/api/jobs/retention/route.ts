import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { loadSettings } from "@/lib/settings";
import { adminClient, BUCKET } from "@/lib/supabase/server";
import type { FileRef } from "@/lib/db-types";

export const runtime = "nodejs";

/** Daily (Vercel Cron): deletes answer-sheet scans N months after a report was approved. */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = adminClient();
  const s = await loadSettings(db);
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - s.scan_retention_months);
  const { data: cases } = await db.from("cases").select("id").eq("status", "approved").lt("approved_at", cutoff.toISOString());
  let removed = 0;
  for (const c of cases ?? []) {
    const { data: attempts } = await db.from("attempts").select("id, files").eq("case_id", c.id);
    const paths = (attempts ?? []).flatMap((a) => (a.files as FileRef[]).map((f) => f.path));
    if (!paths.length) continue;
    await db.storage.from(BUCKET).remove(paths);
    await db.from("attempts").update({ files: [] }).eq("case_id", c.id);
    removed += paths.length;
    await audit(null, "retention_delete", "case", c.id, { files: paths.length });
  }
  return NextResponse.json({ removed });
}
