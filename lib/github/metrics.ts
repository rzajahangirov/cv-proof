import { config } from "@/lib/config";
import type { GithubEvidence, RedFlag, RepoEvidence } from "@/lib/types";

const { redFlags: flagConfig } = config.github;
const DAY_MS = 24 * 60 * 60 * 1000;

const GENERIC_MESSAGES = new Set([
  "update",
  "updates",
  "updated",
  "fix",
  "fixes",
  "fixed",
  "wip",
  "test",
  "tests",
  "testing",
  "upload",
  "uploaded",
  "init",
  "initial",
  "initial commit",
  "first commit",
  "commit",
  "changes",
  "add files via upload",
]);

/** GitHub's web UI default messages say nothing about the change. */
const WEB_UI_DEFAULT = /^(?:update|create|delete|add)\s+[\w./-]+$/;

export function isGenericCommitMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase().replace(/[.!]+$/, "");
  if (normalized.length <= flagConfig.shortMessageChars) return true;
  return GENERIC_MESSAGES.has(normalized) || WEB_UI_DEFAULT.test(normalized);
}

export type RepoSummary = {
  name: string;
  fork: boolean;
  size: number;
  stargazersCount: number;
  pushedAt: string | null;
};

/** Forks and the `{u}/{u}` profile repo are never analyzed. */
export function analyzableRepos<T extends RepoSummary>(repos: T[], username: string): T[] {
  const login = username.toLowerCase();
  return repos.filter((repo) => !repo.fork && repo.name.toLowerCase() !== login);
}

/** Recently pushed repos first; size, then stars, decide within each group. */
export function pickRepos<T extends RepoSummary>(repos: T[], now: Date): T[] {
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - config.github.recentYears);
  const isRecent = (repo: T) => repo.pushedAt !== null && new Date(repo.pushedAt) >= cutoff;

  return repos
    .filter((repo) => repo.size > 0)
    .sort(
      (a, b) =>
        Number(isRecent(b)) - Number(isRecent(a)) ||
        b.size - a.size ||
        b.stargazersCount - a.stargazersCount,
    )
    .slice(0, config.github.maxReposPicked);
}

export function hasTests(paths: string[]): boolean {
  return paths.some((path) =>
    /(?:^|\/)(?:tests?|__tests__|specs?)\/|(?:^|\/)test_[^/]+$|[._-](?:test|spec)\.[^/]+$/i.test(path),
  );
}

export function hasCI(paths: string[]): boolean {
  return paths.some((path) => path.startsWith(".github/workflows/"));
}

export function commitsByMonth(dates: string[], now: Date): GithubEvidence["commitsByMonth"] {
  const counts = new Map<string, number>();
  for (let offset = config.github.monthsOfActivity - 1; offset >= 0; offset -= 1) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    counts.set(month.toISOString().slice(0, 7), 0);
  }
  for (const date of dates) {
    const key = date.slice(0, 7);
    const count = counts.get(key);
    if (count !== undefined) counts.set(key, count + 1);
  }
  return [...counts].map(([month, count]) => ({ month, count }));
}

export function computeRedFlags(input: {
  publicRepos: number;
  ownRepos: number;
  forkRepos: number;
  repos: Pick<RepoEvidence, "sizeKb" | "authorCommits">[];
  commitDates: string[];
  commitMessages: string[];
  now: Date;
}): RedFlag[] {
  const { publicRepos, ownRepos, forkRepos, repos, commitDates, commitMessages, now } = input;
  const flags: RedFlag[] = [];

  const isBulkUpload = repos.some(
    (repo) =>
      repo.sizeKb > flagConfig.bulkUploadMinSizeKb &&
      repo.authorCommits <= flagConfig.bulkUploadMaxCommits,
  );
  if (isBulkUpload) flags.push("bulk_upload");

  const burstStart = now.getTime() - flagConfig.recentBurstDays * DAY_MS;
  const recent = commitDates.filter((date) => new Date(date).getTime() >= burstStart).length;
  if (
    commitDates.length >= flagConfig.recentBurstMinCommits &&
    recent / commitDates.length >= flagConfig.recentBurstShare
  ) {
    flags.push("recent_burst");
  }

  if (ownRepos === 0 && forkRepos > 0) flags.push("only_forks");
  if (publicRepos === 0) flags.push("no_original_repos");

  const generic = commitMessages.filter(isGenericCommitMessage).length;
  if (commitMessages.length > 0 && generic / commitMessages.length >= flagConfig.lowQualityShare) {
    flags.push("low_commit_quality");
  }

  const authorCommits = repos.reduce((sum, repo) => sum + repo.authorCommits, 0);
  if (authorCommits < flagConfig.fewCommits) flags.push("few_commits");

  return flags;
}

/** Shrinks the pack for LLM prompts until it fits the character budget (plan §10). */
export function packEvidence(
  evidence: GithubEvidence,
  limit: number = config.github.maxEvidenceChars,
): GithubEvidence {
  let packed = evidence;
  for (const step of config.github.evidenceTrimSteps) {
    packed = {
      ...evidence,
      repos: evidence.repos.map((repo) => ({
        ...repo,
        readmeExcerpt: repo.readmeExcerpt.slice(0, step.readme),
        commitMessages: repo.commitMessages.slice(0, step.messages),
        codeSamples: step.code
          ? repo.codeSamples.map((s) => ({ ...s, content: s.content.slice(0, step.code) }))
          : [],
      })),
    };
    if (JSON.stringify(packed).length <= limit) break;
  }
  return packed;
}
