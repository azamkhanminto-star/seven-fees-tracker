import "server-only";
import { adminClient } from "./supabase/server";

/** Append-only record of who viewed, changed, exported, shared or deleted what (DPDP). */
export async function audit(actorId: string | null, action: string, entity: string, entityId: string | null, detail?: Record<string, unknown>) {
  await adminClient().from("audit_log").insert({ actor_id: actorId, action, entity, entity_id: entityId, detail: detail ?? null });
}
