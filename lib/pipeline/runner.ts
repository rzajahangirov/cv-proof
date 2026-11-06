import { ApiClientError, postForm, postJson } from "@/lib/api-client";
import { config } from "@/lib/config";
import { redactCvText, toBlindProfile } from "@/lib/cv/blind";
import { finalize } from "@/lib/scoring";
import { getFile, useStore } from "@/lib/store";
import type {
  Candidate,
  CvParseResponse,
  GithubEvidence,
  GithubScoreResponse,
  InterviewKit,
  Job,
  ScreenResponse,
} from "@/lib/types";

const queue: string[] = [];
const active = new Set<string>();

function current(id: string): Candidate {
  const candidate = useStore.getState().candidates.find((c) => c.id === id);
  if (!candidate) throw new ApiClientError("unknown");
  return candidate;
}

function patch(id: string, changes: Partial<Candidate>): Candidate {
  useStore.getState().updateCandidate(id, changes);
  return current(id);
}

async function parseCv(id: string): Promise<Candidate> {
  patch(id, { step: "parsing" });
  const file = getFile(id);
  if (!file) throw new ApiClientError("file_missing");

  const { locale } = useStore.getState();
  const form = new FormData();
  form.append("file", file);
  form.append("lang", locale);

  const { cvText, profile, injection } = await postForm<CvParseResponse>("/api/cv/parse", form);
  const { flags } = current(id);
  return patch(id, {
    cvText,
    profile,
    lang: locale,
    flags: {
      ...flags,
      injectionDetected: flags.injectionDetected || injection.detected,
      injectionSnippets: injection.snippets,
    },
  });
}

async function screen(id: string, job: Job): Promise<Candidate> {
  const { profile, cvText } = patch(id, { step: "screening" });
  if (!profile) throw new ApiClientError("unknown");

  const { injectionDetected, ...stage1 } = await postJson<ScreenResponse>("/api/cv/screen", {
    blindProfile: toBlindProfile(profile),
    redactedCvText: redactCvText(cvText, profile),
    job,
  });
  const { flags } = current(id);
  return patch(id, {
    stage1,
    flags: { ...flags, injectionDetected: flags.injectionDetected || injectionDetected },
  });
}

/** Any GitHub failure means "no GitHub" for this candidate, with the reason kept. */
async function collectGithub(id: string, username: string): Promise<Candidate> {
  patch(id, { step: "collecting" });
  try {
    const github = await postJson<GithubEvidence>("/api/github/collect", { username });
    return patch(id, { github });
  } catch (error) {
    const code = error instanceof ApiClientError ? error.code : "github_error";
    return patch(id, { flags: { ...current(id).flags, githubError: code } });
  }
}

async function scoreGithub(id: string, job: Job): Promise<Candidate> {
  const { profile, stage1, github } = patch(id, { step: "scoring" });
  if (!profile || !stage1 || !github) throw new ApiClientError("unknown");

  const { injectionDetected, ...scores } = await postJson<GithubScoreResponse>("/api/github/score", {
    blindProfile: toBlindProfile(profile),
    claims: stage1.claimsToVerify,
    evidence: github,
    job,
  });
  const { flags } = current(id);
  return patch(id, {
    ...scores,
    flags: { ...flags, injectionDetected: flags.injectionDetected || injectionDetected },
  });
}

function hasRepos(candidate: Candidate): boolean {
  return (candidate.github?.repos.length ?? 0) > 0;
}

async function prepareInterview(id: string, job: Job): Promise<Candidate> {
  const candidate = patch(id, { step: "interview" });
  const { profile, stage1, mergedClaims, github } = candidate;
  if (!profile || !stage1) throw new ApiClientError("unknown");

  const interview = await postJson<InterviewKit>("/api/interview", {
    blindProfile: toBlindProfile(profile),
    job,
    stage1,
    mergedClaims,
    evidence: hasRepos(candidate) ? github : null,
  });
  return patch(id, { interview });
}

/**
 * Every step is skipped when its result already exists, which is what lets a
 * retry resume from the step that failed.
 */
async function runSteps(id: string): Promise<void> {
  const { job, locale } = useStore.getState();
  if (!job) throw new ApiClientError("no_job");
  const jobForAi: Job = { ...job, lang: locale };

  let candidate = current(id);
  if (!candidate.profile) candidate = await parseCv(id);
  if (!candidate.stage1) candidate = await screen(id, jobForAi);

  if (candidate.stage1?.passed) {
    const username = candidate.profile?.githubUsername;
    if (username && !candidate.github && !candidate.flags.githubError) {
      candidate = await collectGithub(id, username);
    }
    // With no analyzable repo there is nothing to score, so it stays "no GitHub".
    if (hasRepos(candidate) && !candidate.consensus) candidate = await scoreGithub(id, jobForAi);
    if (!candidate.interview) candidate = await prepareInterview(id, jobForAi);
  }

  patch(id, { step: "done", error: null, ...finalize(candidate, job) });
}

function exists(id: string): boolean {
  return useStore.getState().candidates.some((c) => c.id === id);
}

/** A candidate can disappear mid-run through remove, reset or import. */
async function processCandidate(id: string): Promise<void> {
  if (!exists(id)) return;
  try {
    await runSteps(id);
  } catch (error) {
    if (!exists(id)) return;
    const code = error instanceof ApiClientError ? error.code : "unknown";
    patch(id, { step: "error", error: code });
  }
}

function pump(): void {
  while (active.size < config.pipeline.concurrency) {
    const id = queue.shift();
    if (!id) return;
    active.add(id);
    void processCandidate(id).finally(() => {
      active.delete(id);
      pump();
    });
  }
}

function enqueue(id: string): void {
  if (!active.has(id) && !queue.includes(id)) queue.push(id);
}

/** Queues every candidate that is still waiting. */
export function startRun(): void {
  useStore
    .getState()
    .candidates.filter((c) => c.step === "queued")
    .forEach((c) => enqueue(c.id));
  pump();
}

const TEMPORARY_GITHUB_ERRORS = ["rate_limited", "github_error", "github_auth"];

/** Temporary GitHub failures must not cost a candidate their verification. */
function hasTemporaryGithubError(candidate: Candidate): boolean {
  return TEMPORARY_GITHUB_ERRORS.includes(candidate.flags.githubError ?? "");
}

export function canRetry(candidate: Candidate): boolean {
  return (
    candidate.step === "error" || (candidate.step === "done" && hasTemporaryGithubError(candidate))
  );
}

export function retryCandidate(id: string): void {
  const candidate = current(id);
  const githubReset: Partial<Candidate> = hasTemporaryGithubError(candidate)
    ? // The interview kit was written without GitHub, so it is redone with it.
      { flags: { ...candidate.flags, githubError: null }, interview: null }
    : {};

  patch(id, { step: "queued", error: null, ...githubReset });
  enqueue(id);
  pump();
}

/** A quota error usually hits many candidates at once. */
export function retryAllFailed(): void {
  useStore.getState().candidates.filter(canRetry).forEach((c) => retryCandidate(c.id));
}

/** HR's correction wins over the CV; everything GitHub-based is redone from it. */
export function changeGithubUsername(id: string, username: string): void {
  const { profile, flags } = current(id);
  if (!profile) return;

  patch(id, {
    step: "queued",
    error: null,
    profile: { ...profile, githubUsername: username },
    flags: { ...flags, githubError: null },
    github: null,
    modelScores: [],
    consensus: null,
    mergedClaims: [],
    interview: null,
  });
  enqueue(id);
  pump();
}
