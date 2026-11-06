import { generateText, Output } from "ai";
import { z } from "zod";
import { classifyAiError } from "@/lib/ai/errors";
import { getEnsembleModels, getPrimaryModel, isMockMode } from "@/lib/ai/models";
import type { ResolvedModel } from "@/lib/ai/models";
import { config } from "@/lib/config";
import type { ModelProbe } from "@/lib/types";

const probeSchema = z.object({ ok: z.boolean() });

/** Uses structured output on purpose: that is the path the pipeline depends on. */
async function probe({ id, model }: ResolvedModel): Promise<ModelProbe> {
  try {
    await generateText({
      model,
      prompt: "Set ok to true.",
      output: Output.object({ schema: probeSchema }),
      maxOutputTokens: config.ai.probeMaxOutputTokens,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(config.ai.probeTimeoutMs),
    });
    return { id, ok: true, error: null };
  } catch (error) {
    const code = classifyAiError(error);
    // The provider message can echo part of a key, so it stays in the server log.
    console.error("[probe]", id, code, error instanceof Error ? error.message : "");
    return { id, ok: false, error: code };
  }
}

export async function probeModels(): Promise<ModelProbe[]> {
  if (isMockMode()) return [];

  const primary = getPrimaryModel();
  const models = [...(primary ? [primary] : []), ...getEnsembleModels()];
  const unique = new Map(models.map((model) => [model.id, model]));
  return Promise.all([...unique.values()].map(probe));
}
