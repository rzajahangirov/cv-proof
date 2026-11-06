import type { z } from "zod";
import type {
  blindProfileSchema,
  candidateSchema,
  claimSchema,
  claimVerdictSchema,
  consensusSchema,
  criterionSchema,
  cvProfileSchema,
  decisionSchema,
  exportFileSchema,
  githubEvidenceSchema,
  hrDecisionSchema,
  interviewKitSchema,
  jobSchema,
  langSchema,
  mergedClaimSchema,
  modelScoreSchema,
  pipelineStepSchema,
  redFlagSchema,
  repoEvidenceSchema,
  stage1ResultSchema,
  verdictSchema,
} from "@/lib/schemas";

export type Lang = z.infer<typeof langSchema>;
export type Criterion = z.infer<typeof criterionSchema>;
export type Job = z.infer<typeof jobSchema>;
export type CvProfile = z.infer<typeof cvProfileSchema>;
export type BlindProfile = z.infer<typeof blindProfileSchema>;
export type Verdict = z.infer<typeof verdictSchema>;
export type ClaimVerdict = z.infer<typeof claimVerdictSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type Stage1Result = z.infer<typeof stage1ResultSchema>;
export type RedFlag = z.infer<typeof redFlagSchema>;
export type RepoEvidence = z.infer<typeof repoEvidenceSchema>;
export type GithubEvidence = z.infer<typeof githubEvidenceSchema>;
export type ModelScore = z.infer<typeof modelScoreSchema>;
export type Consensus = z.infer<typeof consensusSchema>;
export type MergedClaim = z.infer<typeof mergedClaimSchema>;
export type InterviewKit = z.infer<typeof interviewKitSchema>;
export type PipelineStep = z.infer<typeof pipelineStepSchema>;
export type Decision = z.infer<typeof decisionSchema>;
export type HrDecision = z.infer<typeof hrDecisionSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type ExportFile = z.infer<typeof exportFileSchema>;

/** Response envelope of every API route (plan §7). */
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export type ModelProbe = { id: string; ok: boolean; error: string | null };

export type GithubProbe = {
  ok: boolean;
  error: string | null;
  remaining: number | null;
  limit: number | null;
};

export type HealthInfo = {
  mock: boolean;
  primaryModel: string | null;
  ensemble: { id: string; available: boolean }[];
  ignoredModels: string[];
  github: boolean;
  models?: ModelProbe[];
  githubCheck?: GithubProbe;
};

/** Screening adds the LLM's injection signal next to the Stage1Result. */
export type ScreenResponse = Stage1Result & { injectionDetected: boolean };

export type GithubScoreResponse = {
  modelScores: ModelScore[];
  consensus: Consensus;
  mergedClaims: MergedClaim[];
  injectionDetected: boolean;
};

export type CvParseResponse = {
  cvText: string;
  profile: CvProfile;
  injection: { detected: boolean; snippets: string[] };
};

export type JobParseResponse = Pick<Job, "title" | "criteria">;
