import { classifyAiError } from "@/lib/ai/errors";
import { generateStructured } from "@/lib/ai/generate";
import { MOCK_MODEL_IDS, mockGithubScore } from "@/lib/ai/mock";
import { getEnsembleModels, getPrimaryModel, isGroqModel, isMockMode } from "@/lib/ai/models";
import type { ResolvedModel } from "@/lib/ai/models";
import { githubScorePrompt, githubScoreSystem } from "@/lib/ai/prompts/github-score";
import { config } from "@/lib/config";
import { packEvidence } from "@/lib/github/metrics";
import { githubScoreOutputSchema } from "@/lib/schemas";
import type { BlindProfile, Claim, GithubEvidence, Job, ModelScore } from "@/lib/types";

type EnsembleTarget = { id: string; model: ResolvedModel["model"] | null };

function ensembleTargets(): EnsembleTarget[] {
  if (isMockMode()) return MOCK_MODEL_IDS.map((id) => ({ id, model: null }));

  const models = getEnsembleModels();
  if (models.length > 0) return models;
  // Only AI_PRIMARY_MODEL is set: one opinion still beats no GitHub check.
  const primary = getPrimaryModel();
  return primary ? [primary] : [];
}

function failedScore(modelId: string, reason: unknown): ModelScore {
  const code = classifyAiError(reason);
  console.error("[ensemble]", modelId, code, reason instanceof Error ? reason.message : "");
  return {
    modelId,
    ok: false,
    error: code,
    score: null,
    summary: "",
    strengths: [],
    concerns: [],
    claims: [],
  };
}

/** Same system prompt and same input for every model (plan §8). */
export async function runEnsemble(input: {
  job: Job;
  blindProfile: BlindProfile;
  claims: Claim[];
  evidence: GithubEvidence;
}): Promise<{ modelScores: ModelScore[]; injectionDetected: boolean }> {
  const { job, claims, evidence } = input;
  const targets = ensembleTargets();
  const knownClaims = new Set(claims.map((claim) => claim.id));
  const system = githubScoreSystem(job.lang);
  // Every model gets the same input, or their scores could not be compared.
  // So the model with the tightest limit sets the evidence size for all of them.
  const evidenceLimit = targets.some((target) => isGroqModel(target.id))
    ? config.ai.groqMaxEvidenceChars
    : config.github.maxEvidenceChars;
  const prompt = githubScorePrompt({ ...input, evidence: packEvidence(evidence, evidenceLimit) });

  const settled = await Promise.allSettled(
    targets.map((target) =>
      generateStructured({
        model: target.model,
        system,
        prompt,
        schema: githubScoreOutputSchema,
        mock: () => mockGithubScore(target.id, { claims, evidence }),
        maxOutputTokens: isGroqModel(target.id) ? config.ai.groqScoreMaxOutputTokens : undefined,
      }),
    ),
  );

  let injectionDetected = false;
  const modelScores = settled.map((result, index): ModelScore => {
    const { id } = targets[index];
    if (result.status === "rejected") return failedScore(id, result.reason);

    const { value } = result;
    injectionDetected ||= value.injectionDetected;
    return {
      modelId: id,
      ok: true,
      error: null,
      score: Math.round(Math.min(100, Math.max(0, value.score))),
      summary: value.summary,
      strengths: value.strengths.slice(0, config.ai.maxStrengths),
      concerns: value.concerns.slice(0, config.ai.maxConcerns),
      claims: value.claims.filter((claim) => knownClaims.has(claim.claimId)),
    };
  });

  return { modelScores, injectionDetected };
}
