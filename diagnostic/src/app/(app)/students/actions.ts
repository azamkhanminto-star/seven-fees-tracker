"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";
import { adminClient, BUCKET, userClient } from "@/lib/supabase/server";
import { CONSENT_NOTICE_VERSION, CONSENT_PURPOSES } from "@/lib/ui";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createStudent(form: FormData) {
  const me = await requireUser();
  const db = await userClient();
  const { data, error } = await db.from("students").insert({
    full_name: str(form, "full_name"),
    class: Number(str(form, "class")),
    section: str(form, "section") || null,
    board: str(form, "board") || "CBSE",
    school: str(form, "school") || null,
    roll_no: str(form, "roll_no") || null,
    batch_id: str(form, "batch_id") || null,
    pronoun: str(form, "pronoun") || "they",
    academic_year: Number(str(form, "academic_year")),
    guardian_name: str(form, "guardian_name") || null,
    guardian_phone_enc: encrypt(str(form, "guardian_phone")),
    guardian_email_enc: encrypt(str(form, "guardian_email")),
    created_by: me.id,
  }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Could not save the student");
  await audit(me.id, "create", "student", data.id);
  if (form.get("consent_given") === "on") await saveConsent(me.id, data.id, form);
  redirect(`/students/${data.id}`);
}

export async function recordConsent(form: FormData) {
  const me = await requireUser();
  const studentId = str(form, "student_id");
  if (form.get("consent_given") !== "on") throw new Error("Tick the box to confirm consent was given");
  await saveConsent(me.id, studentId, form);
  revalidatePath(`/students/${studentId}`);
}

async function saveConsent(actorId: string, studentId: string, form: FormData) {
  const db = await userClient();
  let evidence_path: string | null = null;
  const file = form.get("evidence");
  if (file instanceof File && file.size > 0) {
    evidence_path = `consents/${studentId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const up = await adminClient().storage.from(BUCKET).upload(evidence_path, file, { contentType: file.type });
    if (up.error) throw new Error(`Could not store the consent form: ${up.error.message}`);
  }
  const { error } = await db.from("consents").insert({
    student_id: studentId,
    guardian_name: str(form, "consent_guardian") || str(form, "guardian_name"),
    relation: str(form, "relation") || "parent",
    method: str(form, "method") || "signed_form",
    notice_version: CONSENT_NOTICE_VERSION,
    purposes: [...CONSENT_PURPOSES],
    evidence_path,
    recorded_by: actorId,
  });
  if (error) throw new Error(error.message);
  await audit(actorId, "consent", "student", studentId, { method: str(form, "method") });
}

export async function withdrawConsent(form: FormData) {
  const me = await requireUser();
  const studentId = str(form, "student_id");
  const db = await userClient();
  await db.from("consents").update({ withdrawn_at: new Date().toISOString() }).eq("student_id", studentId).is("withdrawn_at", null);
  await audit(me.id, "consent_withdrawn", "student", studentId);
  revalidatePath(`/students/${studentId}`);
}

export async function startCase(form: FormData) {
  const me = await requireUser();
  const studentId = str(form, "student_id");
  const db = await userClient();
  const { data, error } = await db.from("cases").insert({
    student_id: studentId, subject: "maths", created_by: me.id,
    check_transcripts: form.get("check_transcripts") === "on",
    difficult: form.get("difficult") === "on",
  }).select("id").single();
  if (error || !data) throw new Error(error?.message.includes("row-level security") ? "Record the parent's consent before starting a diagnosis." : error?.message ?? "Could not start");
  await audit(me.id, "create", "case", data.id);
  redirect(`/cases/${data.id}`);
}

export async function requestDeletion(form: FormData) {
  const me = await requireUser();
  const studentId = str(form, "student_id");
  const db = await userClient();
  const { data: s } = await db.from("students").select("pseudonym").eq("id", studentId).single();
  await db.from("deletion_requests").insert({
    student_id: studentId, student_label: s?.pseudonym ?? studentId,
    requested_by: str(form, "requested_by") || me.name, reason: str(form, "reason") || null,
  });
  await audit(me.id, "deletion_requested", "student", studentId);
  revalidatePath(`/students/${studentId}`);
}
