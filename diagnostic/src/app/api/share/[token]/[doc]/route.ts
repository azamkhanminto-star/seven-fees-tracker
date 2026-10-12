import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { loadCase } from "@/lib/bundle";
import { isDocType, pdfResponse } from "@/lib/pdf-response";
import { loadSettings } from "@/lib/settings";
import { validShare } from "@/lib/share";
import { adminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ token: string; doc: string }> }) {
  const { token, doc } = await params;
  const share = await validShare(token);
  if (!share || !isDocType(doc) || !share.documents.includes(doc)) return NextResponse.json({ error: "This link has expired or is not valid." }, { status: 404 });
  const c = await loadCase(adminClient(), share.case_id);
  await audit(null, "parent_view", "case", share.case_id, { doc, share: share.id });
  return pdfResponse(doc, c.bundle, false, (await loadSettings(adminClient())).institute_address);
}
