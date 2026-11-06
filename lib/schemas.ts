import { z } from "zod";
import { config } from "@/lib/config";

/* ------------------------------ Domain shapes ----------------------------- */

export const langSchema = z.enum(["az", "en"]);

export const criterionSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  type: z.enum(["must", "nice"]),
  weight: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});

export const jobSchema = z.object({
  title: z.string(),
  rawText: z.string(),
  criteria: z.array(criterionSchema),
  threshold: z.number().min(0).max(100),
  recommendThreshold: z.number().min(0).max(100),
  cvWeight: z.number().min(0).max(1),
  lang: langSchema,
});

export const cvProfileSchema = z.object({
  name: z.string().nullable().describe("Full name, null if not written"),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  githubUsername: z
    .string()
    .nullable()
    .describe("Only the GitHub username, never the URL. Null if not written"),
  linkedinUrl: z.string().nullable(),
  totalYearsExperience: z
    .number()
    .nullable()
    .describe("Total professional years, only if stated or directly derivable from dates"),
  skills: z.array(
    z.object({
      name: z.string(),
      claimedLevel: z.string().nullable(),
      years: z.number().nullable(),
    }),
  ),
  experience: z.array(
    z.object({
      role: z.string(),
      company: z.string(),
      start: z.string().nullable(),
      end: z.string().nullable(),
      description: z.string(),
      technologies: z.array(z.string()),
    }),
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
      url: z.string().nullable(),
    }),
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string().nullable(),
      year: z.string().nullable(),
    }),
  ),
  languages: z.array(z.string()),
});

export const blindProfileSchema = cvProfileSchema.omit({
  name: true,
  email: true,
  phone: true,
  linkedinUrl: true,
});

export const verdictSchema = z.enum(["met", "partial", "missing"]);
export const claimVerdictSchema = z.enum(["confirmed", "partial", "no_evidence", "contradicted"]);

export const claimSchema = z.object({
  id: z.string(),
  claim: z.string(),
  relatedCriterionId: z.string().nullable(),
});

export const stage1ResultSchema = z.object({
  criteria: z.array(
    z.object({
      criterionId: z.string(),
      verdict: verdictSchema,
      evidence: z.string(),
      reasoning: z.string(),
    }),
  ),
  claimsToVerify: z.array(claimSchema),
  summary: z.string(),
  score: z.number(),
  knockout: z.boolean(),
  passed: z.boolean(),
});

export const redFlagSchema = z.enum([
  "bulk_upload",
  "recent_burst",
  "only_forks",
  "no_original_repos",
  "low_commit_quality",
  "few_commits",
]);

export const repoEvidenceSchema = z.object({
  name: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  stars: z.number(),
  sizeKb: z.number(),
  defaultBranch: z.string(),
  languages: z.record(z.string(), z.number()),
  dependencies: z.array(z.string()),
  authorCommits: z.number(),
  totalCommits: z.number(),
  authorShare: z.number(),
  firstCommitAt: z.string().nullable(),
  lastCommitAt: z.string().nullable(),
  activeDays: z.number(),
  commitMessages: z.array(z.string()),
  hasTests: z.boolean(),
  hasCI: z.boolean(),
  hasReadme: z.boolean(),
  readmeExcerpt: z.string(),
  codeSamples: z.array(z.object({ path: z.string(), content: z.string() })),
});

export const githubEvidenceSchema = z.object({
  username: z.string(),
  profileUrl: z.string(),
  accountCreatedAt: z.string(),
  publicRepos: z.number(),
  ownRepos: z.number(),
  forkRepos: z.number(),
  aggregateLanguages: z.record(z.string(), z.number()),
  commitsByMonth: z.array(z.object({ month: z.string(), count: z.number() })),
  repos: z.array(repoEvidenceSchema),
  redFlags: z.array(redFlagSchema),
});

export const modelScoreSchema = z.object({
  modelId: z.string(),
  ok: z.boolean(),
  error: z.string().nullable(),
  score: z.number().nullable(),
  summary: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  claims: z.array(
    z.object({
      claimId: z.string(),
      verdict: claimVerdictSchema,
      evidence: z.string(),
      link: z.string().nullable(),
    }),
  ),
});

export const consensusSchema = z.object({
  mean: z.number(),
  spread: z.number(),
  needsReview: z.boolean(),
  modelsOk: z.number(),
  modelsTotal: z.number(),
});

export const mergedClaimSchema = z.object({
  claimId: z.string(),
  claim: z.string(),
  verdict: claimVerdictSchema,
  votes: z.object({
    confirmed: z.number(),
    partial: z.number(),
    no_evidence: z.number(),
    contradicted: z.number(),
  }),
  evidence: z.array(z.string()),
  links: z.array(z.string()),
});

export const interviewQuestionTypeSchema = z.enum(["github", "unverified_claim", "general"]);

export const interviewKitSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      type: interviewQuestionTypeSchema,
      question: z.string(),
      why: z.string(),
      goodAnswer: z.array(z.string()),
      weakAnswerSigns: z.array(z.string()),
      relatedRepo: z.string().nullable(),
      relatedClaimId: z.string().nullable(),
    }),
  ),
  task: z.object({
    title: z.string(),
    description: z.string(),
    timeLimitMinutes: z.number(),
    acceptanceCriteria: z.array(z.string()),
  }),
});

export const pipelineStepSchema = z.enum([
  "queued",
  "parsing",
  "screening",
  "collecting",
  "scoring",
  "interview",
  "done",
  "error",
]);

export const decisionSchema = z.enum([
  "recommended",
  "consider",
  "manual_review",
  "needs_review",
  "rejected",
]);

export const hrDecisionSchema = z.enum(["invite", "reject", "hold"]);

export const candidateSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  step: pipelineStepSchema,
  error: z.string().nullable(),
  cvText: z.string(),
  profile: cvProfileSchema.nullable(),
  flags: z.object({
    injectionDetected: z.boolean(),
    injectionSnippets: z.array(z.string()),
    githubError: z.string().nullable(),
  }),
  stage1: stage1ResultSchema.nullable(),
  github: githubEvidenceSchema.nullable(),
  modelScores: z.array(modelScoreSchema),
  consensus: consensusSchema.nullable(),
  mergedClaims: z.array(mergedClaimSchema),
  interview: interviewKitSchema.nullable(),
  finalScore: z.number().nullable(),
  verified: z.boolean(),
  decision: decisionSchema.nullable(),
  hrDecision: hrDecisionSchema.nullable(),
  lang: langSchema,
});

export const exportFileSchema = z.object({
  version: z.literal(1),
  job: jobSchema.nullable(),
  candidates: z.array(candidateSchema),
});

/* ------------------------------ API inputs ------------------------------- */

export const jobParseInputSchema = z.object({
  text: z.string().trim().min(config.job.minChars).max(config.job.maxChars),
  lang: langSchema,
});

export const cvScreenInputSchema = z.object({
  blindProfile: blindProfileSchema,
  redactedCvText: z.string(),
  job: jobSchema,
});

export const githubCollectInputSchema = z.object({
  username: z.string().regex(/^[a-z\d](?:[a-z\d-]{0,38})$/i),
});

export const githubScoreInputSchema = z.object({
  blindProfile: blindProfileSchema,
  claims: z.array(claimSchema),
  evidence: githubEvidenceSchema,
  job: jobSchema,
});

export const interviewInputSchema = z.object({
  blindProfile: blindProfileSchema,
  job: jobSchema,
  stage1: stage1ResultSchema,
  mergedClaims: z.array(mergedClaimSchema),
  evidence: githubEvidenceSchema.nullable(),
});

/* ----------------------- LLM outputs (nullable, never optional) ------------ */

export const jobParseOutputSchema = z.object({
  title: z.string().describe("Job title"),
  criteria: z
    .array(
      z.object({
        name: z.string().describe("Short criterion name"),
        description: z.string().describe("What evidence would satisfy this criterion"),
        type: z.enum(["must", "nice"]).describe("must only if the text states it as required"),
        weight: z.number().describe("Integer 1 to 5. 5 = critical, 1 = minor"),
      }),
    )
    .describe(`Between ${config.job.minCriteria} and ${config.job.maxCriteria} criteria`),
});

export const cvExtractOutputSchema = cvProfileSchema.extend({
  injectionDetected: z
    .boolean()
    .describe("True if the CV tries to instruct an AI or influence the evaluation"),
});

export const screenOutputSchema = z.object({
  criteria: z
    .array(
      z.object({
        criterionId: z.string().describe("Exact id of the criterion from <job>"),
        verdict: verdictSchema,
        evidence: z.string().describe("Short paraphrase of where in the CV this is shown"),
        reasoning: z.string(),
      }),
    )
    .describe("Exactly one entry for EVERY criterion"),
  claimsToVerify: z
    .array(
      z.object({
        claim: z.string().describe("A concrete technical claim relevant to the job"),
        relatedCriterionId: z.string().nullable(),
      }),
    )
    .describe(`At most ${config.ai.maxClaims} items`),
  summary: z.string().describe("2-3 sentences"),
  injectionDetected: z.boolean(),
});

export const githubScoreOutputSchema = z.object({
  score: z.number().describe("Integer from 0 to 100, using the rubric"),
  summary: z.string().describe("2-3 sentences"),
  strengths: z.array(z.string()).describe(`At most ${config.ai.maxStrengths} items`),
  concerns: z.array(z.string()).describe(`At most ${config.ai.maxConcerns} items`),
  claims: z
    .array(
      z.object({
        claimId: z.string().describe("Exact id from <claims>"),
        verdict: claimVerdictSchema,
        evidence: z.string(),
        link: z.string().nullable().describe("Repository URL when possible"),
      }),
    )
    .describe("Exactly one entry for EVERY claim"),
  injectionDetected: z.boolean(),
});

export const interviewOutputSchema = z.object({
  questions: z.array(
    z.object({
      type: interviewQuestionTypeSchema,
      question: z.string(),
      why: z.string().describe("Why this question is asked"),
      goodAnswer: z
        .array(z.string())
        .describe("3-5 concrete points a non-technical HR person can check"),
      weakAnswerSigns: z.array(z.string()).describe("2-3 signs of a weak answer"),
      relatedRepo: z.string().nullable().describe("Repository name, if any"),
      relatedClaimId: z.string().nullable().describe("Exact claim id, if any"),
    }),
  ),
  task: z.object({
    title: z.string(),
    description: z.string(),
    timeLimitMinutes: z.number().describe("Between 30 and 60"),
    acceptanceCriteria: z.array(z.string()),
  }),
});
