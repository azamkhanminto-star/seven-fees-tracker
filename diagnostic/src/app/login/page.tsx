import { redirect } from "next/navigation";
import { userClient } from "@/lib/supabase/server";

async function signIn(form: FormData) {
  "use server";
  const db = await userClient();
  const { error } = await db.auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
  if (error) redirect("/login?e=1");
  redirect("/dashboard");
}

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <div className="login">
      <form className="card" action={signIn}>
        <img src="/brand/seven-logo.svg" alt="SEVEN Career Institute" style={{ width: 170 }} />
        <h1 style={{ marginTop: 14 }}>Root Diagnostic</h1>
        <p className="muted small">Sign in with the email your admin invited.</p>
        {e ? <div className="notice err">{e === "inactive" ? "Your account is switched off. Ask the admin." : "Wrong email or password."}</div> : null}
        <label>Email</label><input type="email" name="email" required autoComplete="email" />
        <label>Password</label><input type="password" name="password" required autoComplete="current-password" />
        <button className="btn" style={{ marginTop: 16, width: "100%", justifyContent: "center" }}>Sign in</button>
      </form>
    </div>
  );
}
