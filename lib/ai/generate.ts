import { generateText, Output } from "ai";
import type { LanguageModel } from "ai";
import type { z } from "zod";
import { classifyAiError } from "@/lib/ai/errors";
import { isMockMode } from "@/lib/ai/models";
import { ApiError } from "@/lib/api";
import { config } from "@/lib/config";

/**
 * One structured LLM call. The timeout covers every attempt together so that
 * a retry cannot push the route past its 60 s limit.
 */
export async function generateStructured<T>(options: {
  model: LanguageModel | null;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  mock: () => T;
  maxOutputTokens?: number;
}): Promise<T> {
  const { model, system, prompt, schema, mock, maxOutputTokens } = options;
  if (isMockMode()) return mock();
  if (!model) throw new ApiError("ai_not_configured", "No AI model is configured", 503);

  const abortSignal = AbortSignal.timeout(config.ai.timeoutMs);

  for (let attempt = 0; ; attempt += 1) {
    try {
      const result = await generateText({
        model,
        system,
        prompt,
        output: Output.object({ schema }),
        temperature: config.ai.temperature,
        maxOutputTokens: maxOutputTokens ?? config.ai.maxOutputTokens,
        abortSignal,
      });
      return result.output;
    } catch (error) {
      const canRetry = classifyAiError(error) === "ai_invalid_output";
      if (attempt >= config.ai.schemaRetries || !canRetry) throw error;
    }
  }
}
