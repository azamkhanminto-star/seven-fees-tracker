import "server-only";
import { adminClient } from "./supabase/server";

/** A share link is valid if it exists, is not revoked or expired, and the case is still approved. */
export async function validShare(token: string) {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const db = adminClient();
  const { data: s } = await db.from("shares").select("*, case:cases(id, status, student_id)").eq("token", token).maybeSingle();
  if (!s || s.revoked || new Date(s.expires_at) < new Date() || s.case?.status !== "approved") return null;
  return s as { id: string; case_id: string; documents: string[]; expires_at: string; first_viewed_at: string | null };
}
