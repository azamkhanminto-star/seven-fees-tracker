import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PRICES, ModelPrice } from "./ai/pricing";

export type AppSettings = {
  routine_model: string;
  difficult_model: string;
  auto_escalate: boolean;
  illegible_escalate_fraction: number;
  scan_retention_months: number;
  institute_address: string;
  prices: Record<string, ModelPrice>;
  gp_start_years: Record<string, number>;
};

export const DEFAULT_SETTINGS: AppSettings = {
  routine_model: "claude-sonnet-5-5",
  difficult_model: "claude-opus-5-5",
  auto_escalate: true,
  illegible_escalate_fraction: 0.25,
  scan_retention_months: 12,
  institute_address: "Medical Road, Aligarh",
  prices: {},
  gp_start_years: { "6": 2024, "7": 2025, "8": 2025 },
};

export async function loadSettings(db: SupabaseClient): Promise<AppSettings> {
  const { data } = await db.from("settings").select("key, value");
  const s: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of data ?? []) s[row.key as string] = row.value;
  return s as AppSettings;
}

export function prices(s: AppSettings): Record<string, ModelPrice> {
  return { ...DEFAULT_PRICES, ...s.prices };
}
