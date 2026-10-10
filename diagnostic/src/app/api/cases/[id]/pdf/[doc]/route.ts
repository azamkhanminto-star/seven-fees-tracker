import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loadCase } from "@/lib/bundle";
import { isDocType, pdfResponse } from "@/lib/pdf-response";
import { loadSettings } from "@/lib/settings";
import { userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; doc: string }> }) {
  const { id, doc } = await params;
  const me = await requireUser();
  if (!isDocType(doc)) return NextResponse.json({ error: "unknown document" }, { status: 404 });
  const db = await userClient();
  const { data: visible } = await db.from("cases").select("id, status").eq("id", id).maybeSingle();
  if (!visible) return NextResponse.json({ error: "not found" }, { status: 404 });
  const c = await loadCase(db, id);
  await audit(me.id, "export", "case", id, { doc });
  try {
    return await pdfResponse(doc, c.bundle, visible.status !== "approved", (await loadSettings(db)).institute_address);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 409 });
  }
}
