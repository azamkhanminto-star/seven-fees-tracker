import { notFound } from "next/navigation";
import { DOC_LABELS as DOC_TYPES, DocType } from "@/docs/types";
import { validShare } from "@/lib/share";
import { adminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await validShare(token);
  if (!share) notFound();
  const db = adminClient();
  if (!share.first_viewed_at) await db.from("shares").update({ first_viewed_at: new Date().toISOString() }).eq("id", share.id);
  const { data: c } = await db.from("cases").select("student:students(full_name)").eq("id", share.case_id).single();
  const name = (c?.student as unknown as { full_name: string } | null)?.full_name ?? "";
  return (
    <div className="login">
      <div className="card" style={{ width: 440 }}>
        <img src="/brand/seven-logo.svg" alt="SEVEN Career Institute" style={{ width: 160 }} />
        <h1 style={{ marginTop: 14 }}>{name}</h1>
        <p className="muted">Maths progress report from SEVEN Career Institute, Medical Road, Aligarh.</p>
        <p className="muted small">आपके बच्चे की गणित प्रगति रिपोर्ट।</p>
        {share.documents.filter((d): d is DocType => d in DOC_TYPES).map((d) => (
          <p key={d}><a className="btn" href={`/api/share/${token}/${d}`} target="_blank">{DOC_TYPES[d].label}</a></p>
        ))}
        <p className="muted small">This private link works until {new Date(share.expires_at).toLocaleDateString("en-IN")}. Please do not forward it.</p>
      </div>
    </div>
  );
}
