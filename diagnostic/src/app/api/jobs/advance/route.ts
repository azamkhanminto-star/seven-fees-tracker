import { after, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { kick } from "@/lib/jobs";
import { advanceCase } from "@/lib/pipeline";
import { adminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 800; // one Claude step; needs Vercel Pro (Fluid compute)

export async function POST(req: Request) {
  if (req.headers.get("x-job-secret") !== env.jobSecret()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { caseId } = (await req.json()) as { caseId: string };
  // Respond at once; do the work after the response so the caller never waits.
  after(async () => {
    const result = await advanceCase(adminClient(), caseId);
    if (result === "continue") await kick(caseId);
  });
  return NextResponse.json({ ok: true });
}
