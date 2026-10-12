import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "../env";

/** Acts as the signed-in teacher: every query passes through row-level security. */
export async function userClient() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const c of list) store.set(c.name, c.value, c.options);
        } catch {
          // called from a Server Component: the middleware refreshes the session instead
        }
      },
    },
  });
}

/** Service role: bypasses RLS. Only for the AI pipeline, file storage and share links. */
export function adminClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceKey(), { auth: { persistSession: false } });
}

export const BUCKET = "private";
