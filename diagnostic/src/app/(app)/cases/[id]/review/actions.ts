"use server";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { applyEdits, Path } from "@/lib/edit-fields";
import { kick } from "@/lib/jobs";
import { DOWNSTREAM, supersede } from "@/lib/pipeline";
import { adminClient, userClient } from "@/lib/supabase/server";
import type { OutputRow, OutputStep } from "@/lib/db-types";

export async function saveEdits(form: FormData) {
  const me = await requireUser();
  const outputId = String(form.get("output_id"));
  const caseId = String(form.get("case_id"));
  const db = await userClient();
  const { data: out } = await db.from("case_outputs").select("*").eq("id", outputId).eq("case_id", caseId).single<OutputRow>();
  if (!out) throw new Error("Not found");

  const edits: { path: Path; value: string }[] = [];
  for (const [k, v] of form.entries()) if (k.startsWith("f:")) edits.push({ path: JSON.parse(k.slice(2)) as Path, value: String(v) });
  const json = applyEdits(out.json, edits);

  const { data: top } = await db.from("case_outputs").select("version").eq("case_id", caseId).eq("step", out.step).eq("part", out.part)
    .order("version", { ascending: false }).limit(1);
  const { error } = await db.from("case_outputs").insert({
    case_id: caseId, step: out.step, part: out.part, version: (top?.[0]?.version ?? out.version) + 1, json, edited: true, model: out.model, created_by: me.id,
  });
  if (error) throw new Error(error.message);
  await adminClient().from("case_outputs").update({ superseded: true }).eq("id", out.id);
  await adminClient().from("cases").update({ status: "needs_review", approved_at: null, approved_by: null }).eq("id", caseId).eq("status", "approved");
  await audit(me.id, "edit", "case_output", outputId, { step: out.step, fields: edits.length });
  redirect(`/cases/${caseId}/review?tab=${out.step}&saved=1`);
}

export async function regenerateStep(form: FormData) {
  const me = await requireUser();
  const caseId = String(form.get("case_id"));
  const step = String(form.get("step")) as OutputStep;
  const db = await userClient();
  const { data: c } = await db.from("cases").select("id").eq("id", caseId).maybeSingle();
  if (!c) throw new Error("Not found");
  const from = DOWNSTREAM.indexOf(step);
  if (from < 0) throw new Error("This part cannot be rewritten here");
  await supersede(adminClient(), caseId, DOWNSTREAM.slice(from));
  await adminClient().from("cases").update({
    status: "processing", pipeline_step: "Queued", approved_at: null, approved_by: null, updated_at: new Date().toISOString(),
    ...(form.get("deep") === "on" ? { difficult: true } : {}),
  }).eq("id", caseId);
  await audit(me.id, "regenerate", "case", caseId, { step });
  after(() => kick(caseId));
  redirect(`/cases/${caseId}`);
}
