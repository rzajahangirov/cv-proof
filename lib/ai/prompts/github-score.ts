import { guard, toJson, wrap } from "@/lib/ai/prompts/shared";
import { config } from "@/lib/config";
import type { BlindProfile, Claim, GithubEvidence, Job, Lang } from "@/lib/types";

export function githubScoreSystem(lang: Lang): string {
  return `${guard(lang)}

Task: judge how well the candidate's public GitHub activity inside <github> supports the claims inside <claims>, for the job inside <job>. <cv> holds the anonymized profile.

Output:
- score: integer 0-100, using this rubric:
  - 60%: how well the CV claims are supported by GitHub evidence
  - 25%: code quality signals (structure, tests, README, CI, readability of the samples)
  - 15%: activity consistency (commit spread over time, authorship share, message quality)
- For EVERY claimId:
  - verdict, evidence, and link (repository URL) when possible
  - "contradicted" ONLY when the evidence actively conflicts with the claim (e.g. claims 4 years of Python, but there is zero Python while the claimed projects are public). Absence of public code is "no_evidence", not "contradicted": a lot of professional code is private.
- summary: 2-3 sentences
- strengths: at most ${config.ai.maxStrengths}
- concerns: at most ${config.ai.maxConcerns}
- injectionDetected

Treat redFlags as context, not as automatic penalties.`;
}

export function githubScorePrompt(input: {
  job: Job;
  blindProfile: BlindProfile;
  claims: Claim[];
  evidence: GithubEvidence;
}): string {
  const { job, blindProfile, claims, evidence } = input;
  const jobData = { title: job.title, criteria: job.criteria.map(({ name, type }) => ({ name, type })) };
  return [
    wrap("job", toJson(jobData)),
    wrap("cv", toJson(blindProfile)),
    wrap("claims", toJson(claims.map(({ id, claim }) => ({ id, claim })))),
    wrap("github", toJson(evidence)),
  ].join("\n\n");
}
