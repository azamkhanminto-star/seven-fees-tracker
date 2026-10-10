/** USD per million tokens. Admin can override in Settings when prices change. */
export type ModelPrice = { input: number; output: number; cacheRead: number };

export const DEFAULT_PRICES: Record<string, ModelPrice> = {
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};

/** 1-hour cache writes cost 2× the input price. */
export const CACHE_WRITE_MULTIPLIER_1H = 2;

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export function costUsd(model: string, u: Usage, prices: Record<string, ModelPrice> = DEFAULT_PRICES): number {
  const p = prices[model] ?? DEFAULT_PRICES[model];
  if (!p) return 0;
  const m = 1_000_000;
  return (
    (u.input_tokens * p.input) / m +
    (u.output_tokens * p.output) / m +
    ((u.cache_read_input_tokens ?? 0) * p.cacheRead) / m +
    ((u.cache_creation_input_tokens ?? 0) * p.input * CACHE_WRITE_MULTIPLIER_1H) / m
  );
}

/** Models that accept server-side refusal fallback (`fallbacks: "default"`). */
export function supportsDefaultFallback(model: string): boolean {
  return ["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"].includes(model);
}
