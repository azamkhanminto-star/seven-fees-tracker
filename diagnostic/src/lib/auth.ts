import "server-only";
import { redirect } from "next/navigation";
import { userClient } from "./supabase/server";

export type Me = { id: string; email: string; role: "admin" | "teacher"; name: string };

export async function requireUser(): Promise<Me> {
  const db = await userClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await db.from("profiles").select("role, full_name, active").eq("user_id", user.id).single();
  if (!p || !p.active) redirect("/login?e=inactive");
  return { id: user.id, email: user.email ?? "", role: p.role, name: p.full_name || user.email || "" };
}

export async function requireAdmin(): Promise<Me> {
  const me = await requireUser();
  if (me.role !== "admin") redirect("/dashboard");
  return me;
}
