import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { userClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function signOut() {
  "use server";
  const db = await userClient();
  await db.auth.signOut();
  redirect("/login");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  return (
    <div className="shell">
      <nav className="side">
        <img src="/brand/seven-logo-light.svg" alt="SEVEN Career Institute" />
        <Link href="/dashboard">Students &amp; reports</Link>
        <Link href="/students/new">Add a student</Link>
        {me.role === "admin" ? (
          <>
            <div className="sec">Admin</div>
            <Link href="/admin/team">Teachers &amp; batches</Link>
            <Link href="/admin/settings">Settings</Link>
            <Link href="/admin/usage">AI usage &amp; cost</Link>
            <Link href="/admin/library">Workbook library</Link>
            <Link href="/admin/privacy">Privacy &amp; audit</Link>
          </>
        ) : null}
        <div className="me">
          {me.name}<br /><span style={{ opacity: .7 }}>{me.role}</span>
          <form action={signOut}><button className="btn small ghost" style={{ marginTop: 8 }}>Sign out</button></form>
        </div>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
