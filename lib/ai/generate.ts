import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import type { LanguageModel } from "ai";
import type { z } from "zod";
import { isMockMode } from "@/lib/ai/models";
import { config } from "@/lib/config";

function isSchemaFailure(error: unknown): boolean {
  return NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error);
}

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
}): Promise<T> {
  const { model, system, prompt, schema, mock } = options;
  if (isMockMode() || !model) return mock();

  const abortSignal = AbortSignal.timeout(config.ai.timeoutMs);

  for (let attempt = 0; ; attempt += 1) {
    try {
      const result = await generateText({
        model,
        system,
        prompt,
        output: Output.object({ schema }),
        temperature: config.ai.temperature,
        abortSignal,
      });
      return result.output;
    } catch (error) {
      if (attempt >= config.ai.schemaRetries || !isSchemaFailure(error)) throw error;
    }
  }
}
