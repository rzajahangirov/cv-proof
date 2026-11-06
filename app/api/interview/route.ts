import { generateStructured } from "@/lib/ai/generate";
import { mockInterview } from "@/lib/ai/mock";
import { getPrimaryModel } from "@/lib/ai/models";
import { interviewPrompt, interviewSystem } from "@/lib/ai/prompts/interview";
import { readJson, route } from "@/lib/api";
import { config } from "@/lib/config";
import { packEvidence } from "@/lib/github/metrics";
import { interviewInputSchema, interviewOutputSchema } from "@/lib/schemas";
import type { InterviewKit } from "@/lib/types";

export const maxDuration = 60;

const { interview } = config;

export const POST = route(async (request): Promise<InterviewKit> => {
  const input = await readJson(request, interviewInputSchema);
  const { job, mergedClaims, stage1, evidence } = input;

  const output = await generateStructured({
    model: getPrimaryModel()?.model ?? null,
    system: interviewSystem(job.lang),
    prompt: interviewPrompt({ ...input, evidence: evidence && packEvidence(evidence) }),
    schema: interviewOutputSchema,
    mock: () => mockInterview(input),
  });

  const knownClaims = new Set([
    ...mergedClaims.map((claim) => claim.claimId),
    ...stage1.claimsToVerify.map((claim) => claim.id),
  ]);
  const maxQuestions = evidence
    ? interview.maxGithubQuestions + interview.maxUnverifiedQuestions
    : interview.maxNoGithubQuestions;

  return {
    questions: output.questions.slice(0, maxQuestions).map((question, index) => ({
      ...question,
      id: `q${index + 1}`,
      relatedClaimId:
        question.relatedClaimId && knownClaims.has(question.relatedClaimId)
          ? question.relatedClaimId
          : null,
    })),
    task: {
      ...output.task,
      timeLimitMinutes: Math.min(
        interview.maxTaskMinutes,
        Math.max(interview.minTaskMinutes, Math.round(output.task.timeLimitMinutes)),
      ),
    },
  };
});
