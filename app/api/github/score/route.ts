import { runEnsemble } from "@/lib/ai/consensus";
import { ApiError, readJson, route } from "@/lib/api";
import { githubScoreInputSchema } from "@/lib/schemas";
import { computeConsensus, mergeClaims } from "@/lib/scoring";
import type { GithubScoreResponse } from "@/lib/types";

export const maxDuration = 60;

export const POST = route(async (request): Promise<GithubScoreResponse> => {
  const input = await readJson(request, githubScoreInputSchema);
  const { modelScores, injectionDetected } = await runEnsemble(input);

  const consensus = computeConsensus(modelScores);
  if (!consensus) {
    // The first failing model's reason tells HR what to do; "all failed" would not.
    const code = modelScores.find((model) => model.error)?.error ?? "ai_not_configured";
    throw new ApiError(code, "No model returned a score", 502);
  }

  return {
    modelScores,
    consensus,
    mergedClaims: mergeClaims(input.claims, modelScores),
    injectionDetected,
  };
});
