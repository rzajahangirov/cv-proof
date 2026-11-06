import { generateStructured } from "@/lib/ai/generate";
import { mockJobParse } from "@/lib/ai/mock";
import { getPrimaryModel } from "@/lib/ai/models";
import { jobParsePrompt, jobParseSystem } from "@/lib/ai/prompts/job-parse";
import { readJson, route } from "@/lib/api";
import { config } from "@/lib/config";
import { jobParseInputSchema, jobParseOutputSchema } from "@/lib/schemas";
import type { Criterion, JobParseResponse } from "@/lib/types";

export const maxDuration = 60;

function toWeight(value: number): Criterion["weight"] {
  return Math.min(5, Math.max(1, Math.round(value))) as Criterion["weight"];
}

export const POST = route(async (request): Promise<JobParseResponse> => {
  const { text, lang } = await readJson(request, jobParseInputSchema);

  const output = await generateStructured({
    model: getPrimaryModel()?.model ?? null,
    system: jobParseSystem(lang),
    prompt: jobParsePrompt(text),
    schema: jobParseOutputSchema,
    mock: () => mockJobParse(text),
  });

  return {
    title: output.title,
    criteria: output.criteria.slice(0, config.job.maxCriteria).map((criterion) => ({
      ...criterion,
      id: crypto.randomUUID(),
      weight: toWeight(criterion.weight),
    })),
  };
});
