import { guard, toJson, wrap } from "@/lib/ai/prompts/shared";
import { config } from "@/lib/config";
import type { BlindProfile, GithubEvidence, Job, Lang, MergedClaim, Stage1Result } from "@/lib/types";

const { interview } = config;

export function interviewSystem(lang: Lang): string {
  return `${guard(lang)}

Task: build an interview kit for this candidate. The questions should reveal whether the candidate truly understands the code they present as their own.

- With GitHub evidence: up to ${interview.maxGithubQuestions} questions of type "github" plus up to ${interview.maxUnverifiedQuestions} of type "unverified_claim".
  - "github" questions are about specific repositories and decisions in their code. Set relatedRepo.
  - "unverified_claim" questions are about claims with verdict no_evidence, partial or contradicted. Set relatedClaimId.
- Without GitHub evidence (<github> holds null): ${interview.minNoGithubQuestions}-${interview.maxNoGithubQuestions} questions built from the claims.
- goodAnswer: 3-5 concrete points a NON-technical HR person can check in the candidate's answer.
- weakAnswerSigns: 2-3 signs of a weak answer.
- task: one practical task of ${interview.minTaskMinutes}-${interview.maxTaskMinutes} minutes, relevant to the job, with clear acceptance criteria.`;
}

export function interviewPrompt(input: {
  job: Job;
  blindProfile: BlindProfile;
  stage1: Stage1Result;
  mergedClaims: MergedClaim[];
  evidence: GithubEvidence | null;
}): string {
  const { job, blindProfile, stage1, mergedClaims, evidence } = input;
  const claims = mergedClaims.length
    ? mergedClaims.map(({ claimId, claim, verdict, evidence: notes }) => ({
        id: claimId,
        claim,
        verdict,
        notes,
      }))
    : stage1.claimsToVerify.map(({ id, claim }) => ({ id, claim, verdict: "no_evidence" }));

  return [
    wrap(
      "job",
      toJson({ title: job.title, criteria: job.criteria.map(({ name, type }) => ({ name, type })) }),
    ),
    wrap("cv", toJson({ profile: blindProfile, summary: stage1.summary })),
    wrap("claims", toJson(claims)),
    wrap("github", toJson(evidence)),
  ].join("\n\n");
}
