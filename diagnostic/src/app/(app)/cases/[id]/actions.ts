"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FileRef } from "@/lib/db-types";
import { kick } from "@/lib/jobs";
import { DOWNSTREAM, generateDiagnosticTest, supersede } from "@/lib/pipeline";
import { adminClient, BUCKET, userClient } from "@/lib/supabase/server";
import type { ConfirmationMark } from "@/lib/case-model";

const ALLOWED = /^(application\/pdf|image\/(jpeg|png|webp)|text\/csv|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel)$/;

/** Confirms the signed-in teacher may see this case (RLS does the real check). */
async function visibleCase(caseId: string) {
  const db = await userClient();
  const { data } = await db.from("cases").select("id, student_id, status").eq("id", caseId).maybeSingle();
  if (!data) throw new Error("Case not found");
  return { db, c: data };
}

export async function signUploads(caseId: string, files: { name: string; mime: string }[]) {
  await requireUser();
  await visibleCase(caseId);
  const store = adminClient().storage.from(BUCKET);
  return Promise.all(files.map(async (f, i) => {
    if (!ALLOWED.test(f.mime)) throw new Error(`${f.name}: only PDF, JPG, PNG, WEBP, Excel or CSV files`);
    const path = `cases/${caseId}/${Date.now()}-${i}-${f.name.replace(/[^\w.-]/g, "_")}`;
    const { data, error } = await store.createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message ?? "Could not prepare the upload");
    return { path, token: data.token, name: f.name, mime: f.mime };
  }));
}

export type AddPaperInput = {
  caseId: string;
  existingPaperId: string | null;
  paper: { title: string; short_name: string; kind: string; test_date: string | null; typed_text: string | null; files: FileRef[]; key_files: FileRef[] } | null;
  source: "scan" | "marksheet";
  answerFiles: FileRef[];
};

export async function addPaper(input: AddPaperInput) {
  const me = await requireUser();
  const { db, c } = await visibleCase(input.caseId);
  if (!input.answerFiles.length) throw new Error("Upload the student's answer sheet or marks sheet");
  const { data: student } = await db.from("students").select("class, board").eq("id", c.student_id).single();

  let paperId = input.existingPaperId;
  if (!paperId) {
    if (!input.paper) throw new Error("Add the question paper");
    if (!input.paper.files.length && !input.paper.typed_text) throw new Error("Upload the question paper or type it in");
    const { data, error } = await db.from("papers").insert({
      ...input.paper, subject: "maths", class: student!.class, board: student!.board, created_by: me.id,
    }).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Could not save the paper");
    paperId = data.id;
  }
  const { data: prev } = await db.from("attempts").select("seq").eq("case_id", input.caseId).order("seq", { ascending: false }).limit(1);
  const { error } = await db.from("attempts").insert({
    case_id: input.caseId, paper_id: paperId, seq: (prev?.[0]?.seq ?? 0) + 1, source: input.source, files: input.answerFiles,
  });
  if (error) throw new Error(error.message);

  // A new paper changes the analysis: redo everything downstream with all papers together.
  await supersede(adminClient(), input.caseId, DOWNSTREAM);
  await adminClient().from("cases").update({ status: "processing", pipeline_step: "Queued", pipeline_error: null, approved_at: null, approved_by: null, updated_at: new Date().toISOString() }).eq("id", input.caseId);
  await audit(me.id, "upload", "case", input.caseId, { source: input.source, files: input.answerFiles.length });
  after(() => kick(input.caseId));
  revalidatePath(`/cases/${input.caseId}`);
}

export async function resume(form: FormData) {
  await requireUser();
  const caseId = String(form.get("case_id"));
  await visibleCase(caseId);
  await adminClient().from("cases").update({ status: "processing", pipeline_error: null, lease_until: null, updated_at: new Date().toISOString() }).eq("id", caseId);
  after(() => kick(caseId));
  revalidatePath(`/cases/${caseId}`);
}

export async function confirmTranscript(form: FormData) {
  const me = await requireUser();
  const caseId = String(form.get("case_id"));
  const attemptId = String(form.get("attempt_id"));
  const { db } = await visibleCase(caseId);
  for (const [k, v] of form.entries()) {
    if (!k.startsWith("m:")) continue;
    const q = k.slice(2);
    const val = String(v).trim();
    await db.from("responses").update({ teacher_marks: val === "" ? null : Number(val) }).eq("attempt_id", attemptId).eq("q", q);
  }
  await db.from("attempts").update({ transcript_confirmed: true }).eq("id", attemptId);
  await supersede(adminClient(), caseId, DOWNSTREAM);
  await adminClient().from("cases").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", caseId);
  await audit(me.id, "edit", "transcript", attemptId);
  after(() => kick(caseId));
  revalidatePath(`/cases/${caseId}`);
}

export async function saveConfirmationResults(form: FormData) {
  const me = await requireUser();
  const caseId = String(form.get("case_id"));
  const { db } = await visibleCase(caseId);
  const results: Record<string, ConfirmationMark> = {};
  for (const [k, v] of form.entries()) if (k.startsWith("r:") && v) results[k.slice(2)] = v as ConfirmationMark;
  await db.from("confirmation_results").upsert({ case_id: caseId, results, entered_by: me.id, updated_at: new Date().toISOString() });
  await audit(me.id, "edit", "confirmation_results", caseId);
  revalidatePath(`/cases/${caseId}`);
}

export async function approveCase(form: FormData) {
  const me = await requireUser();
  const caseId = String(form.get("case_id"));
  const { db } = await visibleCase(caseId);
  await db.from("cases").update({ status: "approved", approved_by: me.id, approved_at: new Date().toISOString() }).eq("id", caseId);
  // Newly written workbook levels go to the library as drafts for the admin to approve once.
  const admin = adminClient();
  const { data: conf } = await admin.from("case_outputs").select("json").eq("case_id", caseId).eq("step", "confirmation").eq("superseded", false).maybeSingle();
  const { data: parts } = await admin.from("case_outputs").select("part, json").eq("case_id", caseId).eq("step", "workbook").eq("superseded", false);
  const sections = (conf?.json as { sections?: { steps: { step: string; concept_ids: string[] }[] }[] } | undefined)?.sections ?? [];
  for (const p of parts ?? []) {
    const steps = (p.json as { steps: { step: string; title: string }[] }).steps;
    for (const st of steps) {
      const conceptId = sections[p.part]?.steps.find((x) => x.step === st.step)?.concept_ids[0];
      if (!conceptId) continue;
      const { data: exists } = await admin.from("workbook_steps").select("id").eq("concept_id", conceptId).neq("status", "retired").limit(1);
      if (!exists?.length) await admin.from("workbook_steps").insert({ concept_id: conceptId, title: st.title, content: st, source_case_id: caseId });
    }
  }
  await audit(me.id, "approve", "case", caseId);
  revalidatePath(`/cases/${caseId}`);
}

export async function createShare(caseId: string, channel: "whatsapp" | "email" | "link", documents: string[]) {
  const me = await requireUser();
  const { db, c } = await visibleCase(caseId);
  if (c.status !== "approved") throw new Error("Approve the report before sharing it");
  const { data, error } = await db.from("shares").insert({ case_id: caseId, channel, documents, created_by: me.id }).select("token, expires_at").single();
  if (error || !data) throw new Error(error?.message ?? "Could not create the link");
  await audit(me.id, "share", "case", caseId, { channel, documents });
  return data;
}

export async function makeDiagnosticTest(form: FormData) {
  const me = await requireUser();
  const caseId = String(form.get("case_id"));
  await visibleCase(caseId);
  await audit(me.id, "generate", "diagnostic_test", caseId);
  after(() => generateDiagnosticTest(adminClient(), caseId).catch((e) =>
    adminClient().from("cases").update({ pipeline_error: `Diagnostic test: ${e instanceof Error ? e.message : e}` }).eq("id", caseId)));
  revalidatePath(`/cases/${caseId}`);
}
