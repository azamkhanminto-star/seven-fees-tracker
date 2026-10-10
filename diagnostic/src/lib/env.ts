import "server-only";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See diagnostic/README.md → Setup.`);
  return v;
}

export const env = {
  supabaseUrl: () => need("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => need("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: () => need("SUPABASE_SERVICE_ROLE_KEY"),
  encryptionKey: () => need("DATA_ENCRYPTION_KEY"),
  jobSecret: () => need("JOB_SECRET"),
  appUrl: () => process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
};
