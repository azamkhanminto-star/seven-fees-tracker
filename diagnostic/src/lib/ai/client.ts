import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import type { Subject } from "../concepts";
import { costUsd, ModelPrice, supportsDefaultFallback } from "./pricing";
import { STEP_INSTRUCTIONS, StepName, systemBlocks } from "./prompts";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  // Reads ANTHROPIC_API_KEY from the server environment. Never imported by browser code.
  client ??= new Anthropic({ maxRetries: 3, timeout: 15 * 60 * 1000 });
  return client;
}

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** How hard Claude thinks at each step. Analysis and tracing are where quality matters most. */
export const STEP_EFFORT: Record<StepName, Effort> = {
  paper: "medium",
  read: "medium",
  analysis: "high",
  tracing: "high",
  confirmation: "medium",
  workbook: "medium",
  plan: "medium",
  diagnostic: "medium",
};

export type StepRun<T> = {
  data: T;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
  costUsd: number;
  durationMs: number;
  stopReason: string | null;
  fellBack: boolean;
};

export class StepError extends Error {
  constructor(message: string, readonly kind: "refusal" | "truncated" | "unparsed", readonly partial?: StepRun<null>) {
    super(message);
  }
}

export async function runStep<S extends z.ZodType>(opts: {
  step: StepName;
  subject: Subject;
  model: string;
  schema: S;
  content: Anthropic.Beta.BetaContentBlockParam[];
  prices?: Record<string, ModelPrice>;
  maxTokens?: number;
}): Promise<StepRun<z.infer<S>>> {
  const started = Date.now();
  const fallback = supportsDefaultFallback(opts.model);
  const stream = anthropic().beta.messages.stream({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 64000,
    system: systemBlocks(opts.subject),
    messages: [{
      role: "user",
      content: [...opts.content, { type: "text", text: `TASK (${opts.step}):\n${STEP_INSTRUCTIONS[opts.step]}` }],
    }],
    output_config: { format: betaZodOutputFormat(opts.schema), effort: STEP_EFFORT[opts.step] },
    ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  });
  const msg = await stream.finalMessage();

  const usage = {
    input_tokens: msg.usage.input_tokens,
    output_tokens: msg.usage.output_tokens,
    cache_read_input_tokens: msg.usage.cache_read_input_tokens ?? 0,
    cache_creation_input_tokens: msg.usage.cache_creation_input_tokens ?? 0,
  };
  const fellBack = (msg.usage.iterations ?? []).some((it) => it.type === "fallback_message");
  const base = {
    model: msg.model,
    usage,
    costUsd: costUsd(msg.model, usage, opts.prices),
    durationMs: Date.now() - started,
    stopReason: msg.stop_reason,
    fellBack,
  };

  if (msg.stop_reason === "refusal") {
    throw new StepError(`Claude declined this step (${msg.stop_details?.category ?? "unspecified"}).`, "refusal", { ...base, data: null });
  }
  if (msg.stop_reason === "max_tokens") {
    throw new StepError("The response was cut off before it finished.", "truncated", { ...base, data: null });
  }
  if (msg.parsed_output == null) {
    throw new StepError("Claude's response did not match the expected format.", "unparsed", { ...base, data: null });
  }
  return { ...base, data: msg.parsed_output as z.infer<S> };
}

/** Builds a PDF or image block from a stored file. */
export function fileBlock(mediaType: string, base64: string, title?: string): Anthropic.Beta.BetaContentBlockParam {
  if (mediaType === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 }, ...(title ? { title } : {}) };
  }
  const img = mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  return { type: "image", source: { type: "base64", media_type: img, data: base64 } };
}

export function textBlock(text: string): Anthropic.Beta.BetaContentBlockParam {
  return { type: "text", text };
}
