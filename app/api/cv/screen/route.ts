import { generateStructured } from "@/lib/ai/generate";
import { mockScreen } from "@/lib/ai/mock";
import { getPrimaryModel, isGroqModel } from "@/lib/ai/models";
import { screenPrompt, screenSystem } from "@/lib/ai/prompts/screen";
import { readJson, route } from "@/lib/api";
import { config } from "@/lib/config";
import { cvScreenInputSchema, screenOutputSchema } from "@/lib/schemas";
import { computeStage1 } from "@/lib/scoring";
import type { ScreenResponse } from "@/lib/types";

export const maxDuration = 60;

export const POST = route(async (request): Promise<ScreenResponse> => {
  const input = await readJson(request, cvScreenInputSchema);
  const { job, redactedCvText } = input;
  const primary = getPrimaryModel();

  // A skipped "must" criterion would silently knock the candidate out, so an
  // incomplete answer counts as a schema failure and gets retried.
  const schema = screenOutputSchema.refine(
    (output) =>
      job.criteria.every((c) => output.criteria.some((v) => v.criterionId === c.id)),
    "Every criterion needs a verdict",
  );

  const output = await generateStructured({
    model: primary?.model ?? null,
    system: screenSystem(job.lang),
    prompt: screenPrompt({
      ...input,
      redactedCvText: isGroqModel(primary?.id)
        ? redactedCvText.slice(0, config.ai.groqMaxCvChars)
        : redactedCvText,
    }),
    schema,
    mock: () => mockScreen(input),
  });

  const knownCriteria = new Set(job.criteria.map((criterion) => criterion.id));
  const criteria = output.criteria.filter((verdict) => knownCriteria.has(verdict.criterionId));

  return {
    criteria,
    claimsToVerify: output.claimsToVerify.slice(0, config.ai.maxClaims).map((claim, index) => ({
      id: `c${index + 1}`,
      claim: claim.claim,
      relatedCriterionId:
        claim.relatedCriterionId && knownCriteria.has(claim.relatedCriterionId)
          ? claim.relatedCriterionId
          : null,
    })),
    summary: output.summary,
    injectionDetected: output.injectionDetected,
    ...computeStage1(job.criteria, criteria, job.threshold),
  };
});
