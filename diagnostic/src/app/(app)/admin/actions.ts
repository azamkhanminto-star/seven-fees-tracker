"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { adminClient, BUCKET, userClient } from "@/lib/supabase/server";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function inviteTeacher(form: FormData) {
  const me = await requireAdmin();
  const email = str(form, "email");
  const { data, error } = await adminClient().auth.admin.inviteUserByEmail(email, {
    data: { full_name: str(form, "full_name") }, redirectTo: `${env.appUrl()}/login`,
  });
  if (error) throw new Error(error.message);
  await audit(me.id, "invite", "user", data.user?.id ?? email);
  revalidatePath("/admin/team");
}

export async function setTeacher(form: FormData) {
  const me = await requireAdmin();
  const userId = str(form, "user_id");
  if (userId === me.id && form.get("active") !== "on") throw new Error("You cannot switch off your own account");
  const db = await userClient();
  await db.from("profiles").update({ role: str(form, "role"), active: form.get("active") === "on" }).eq("user_id", userId);
  await db.from("teacher_batches").delete().eq("teacher_id", userId);
  const batches = form.getAll("batch").map(String);
  if (batches.length) await db.from("teacher_batches").insert(batches.map((b) => ({ teacher_id: userId, batch_id: b })));
  await audit(me.id, "edit", "user", userId);
  revalidatePath("/admin/team");
}

export async function addBatch(form: FormData) {
  const me = await requireAdmin();
  const db = await userClient();
  const { error } = await db.from("batches").insert({
    name: str(form, "name"), class: Number(str(form, "class")), board: str(form, "board") || "CBSE", academic_year: Number(str(form, "academic_year")),
  });
  if (error) throw new Error(error.message);
  await audit(me.id, "create", "batch", str(form, "name"));
  revalidatePath("/admin/team");
}

export async function saveSettings(form: FormData) {
  const me = await requireAdmin();
  const db = await userClient();
  const rows = [
    { key: "routine_model", value: str(form, "routine_model") },
    { key: "difficult_model", value: str(form, "difficult_model") },
    { key: "auto_escalate", value: form.get("auto_escalate") === "on" },
    { key: "illegible_escalate_fraction", value: Number(str(form, "illegible_escalate_fraction")) / 100 },
    { key: "scan_retention_months", value: Number(str(form, "scan_retention_months")) },
    { key: "institute_address", value: str(form, "institute_address") },
    { key: "prices", value: JSON.parse(str(form, "prices") || "{}") },
    { key: "gp_start_years", value: JSON.parse(str(form, "gp_start_years") || "{}") },
  ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  const { error } = await db.from("settings").upsert(rows);
  if (error) throw new Error(error.message);
  await audit(me.id, "edit", "settings", null);
  revalidatePath("/admin/settings");
}

export async function setLibraryStatus(form: FormData) {
  const me = await requireAdmin();
  const db = await userClient();
  const id = str(form, "id");
  const status = str(form, "status");
  await db.from("workbook_steps").update({ status, approved_by: status === "approved" ? me.id : null }).eq("id", id);
  await audit(me.id, `library_${status}`, "workbook_step", id);
  revalidatePath("/admin/library");
}

/**
 * Right to erasure: deletes the student's scans, papers' answer files, reports and personal
 * data. Keeps only the anonymous code in the request record and anonymous cost rows.
 */
export async function eraseStudent(form: FormData) {
  const me = await requireAdmin();
  const requestId = str(form, "request_id");
  const db = adminClient();
  const { data: req } = await db.from("deletion_requests").select("*").eq("id", requestId).single();
  if (!req?.student_id) throw new Error("Request not found");
  const sid = req.student_id as string;

  const { data: cases } = await db.from("cases").select("id").eq("student_id", sid);
  const caseIds = (cases ?? []).map((c) => c.id as string);
  const paths: string[] = [];
  for (const cid of caseIds) {
    const { data: files } = await db.storage.from(BUCKET).list(`cases/${cid}`, { limit: 1000 });
    paths.push(...(files ?? []).map((f) => `cases/${cid}/${f.name}`));
  }
  const { data: consentFiles } = await db.storage.from(BUCKET).list(`consents/${sid}`, { limit: 1000 });
  paths.push(...(consentFiles ?? []).map((f) => `consents/${sid}/${f.name}`));
  if (paths.length) await db.storage.from(BUCKET).remove(paths);

  // Cascades remove cases, attempts, responses, outputs, results, shares and consents.
  await db.from("students").delete().eq("id", sid);
  await db.from("deletion_requests").update({ status: "done", completed_at: new Date().toISOString(), completed_by: me.id }).eq("id", requestId);
  await audit(me.id, "erase", "student", req.student_label, { files: paths.length, cases: caseIds.length });
  revalidatePath("/admin/privacy");
}

export async function rejectDeletion(form: FormData) {
  const me = await requireAdmin();
  const db = await userClient();
  await db.from("deletion_requests").update({ status: "rejected", completed_at: new Date().toISOString(), completed_by: me.id }).eq("id", str(form, "request_id"));
  revalidatePath("/admin/privacy");
}
