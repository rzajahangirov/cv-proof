import type { Octokit } from "@octokit/rest";
import { config } from "@/lib/config";
import { createGithubClient, optional, toGithubError } from "@/lib/github/client";
import { parseDependencies, pickCodeFiles, pickManifests } from "@/lib/github/files";
import type { TreeFile } from "@/lib/github/files";
import {
  analyzableRepos,
  commitsByMonth,
  computeRedFlags,
  hasCI,
  hasTests,
  pickRepos,
} from "@/lib/github/metrics";
import type { RepoSummary } from "@/lib/github/metrics";
import type { GithubEvidence, RepoEvidence } from "@/lib/types";

type RepoRef = RepoSummary & {
  url: string;
  description: string | null;
  defaultBranch: string;
};

function decodeBase64(content: string): string {
  return Buffer.from(content, "base64").toString("utf8");
}

async function readFile(
  github: Octokit,
  target: { owner: string; repo: string; ref: string },
  path: string,
): Promise<string | null> {
  const response = await optional(github.repos.getContent({ ...target, path }));
  const data = response?.data;
  if (!data || Array.isArray(data) || data.type !== "file" || !("content" in data)) return null;
  return decodeBase64(data.content);
}

async function deepDive(
  github: Octokit,
  target: { owner: string; repo: string; ref: string },
  files: TreeFile[],
): Promise<Pick<RepoEvidence, "dependencies" | "codeSamples">> {
  const manifestPaths = pickManifests(files);
  const codePaths = pickCodeFiles(files);

  const [manifests, code] = await Promise.all([
    Promise.all(manifestPaths.map((path) => readFile(github, target, path))),
    Promise.all(codePaths.map((path) => readFile(github, target, path))),
  ]);

  const dependencies = manifests.flatMap((content, index) =>
    content ? parseDependencies(manifestPaths[index], content) : [],
  );
  const codeSamples = code.flatMap((content, index) =>
    content
      ? [{ path: codePaths[index], content: content.slice(0, config.github.maxCodeChars) }]
      : [],
  );
  return { dependencies: [...new Set(dependencies)], codeSamples };
}

async function collectRepo(
  github: Octokit,
  login: string,
  repo: RepoRef,
  withDeepDive: boolean,
): Promise<{ evidence: RepoEvidence; commitDates: string[] }> {
  const target = { owner: login, repo: repo.name };

  const [languages, contributors, commits, readme, tree] = await Promise.all([
    optional(github.repos.listLanguages(target)),
    optional(github.repos.listContributors({ ...target, per_page: 100 })),
    optional(
      github.repos.listCommits({ ...target, author: login, per_page: config.github.commitsPerPage }),
    ),
    optional(github.repos.getReadme(target)),
    optional(
      github.git.getTree({ ...target, tree_sha: repo.defaultBranch, recursive: "true" }),
    ),
  ]);

  const commitList = commits?.data ?? [];
  const commitDates = commitList.flatMap((c) => c.commit.author?.date ?? []);
  const sortedDates = [...commitDates].sort();

  const contributorList = Array.isArray(contributors?.data) ? contributors.data : [];
  const totalFromContributors = contributorList.reduce((sum, c) => sum + c.contributions, 0);
  const ownEntry = contributorList.find((c) => c.login?.toLowerCase() === login.toLowerCase());
  // The commit list is capped per page, the contributor count is not.
  const authorCommits = Math.max(ownEntry?.contributions ?? 0, commitList.length);
  const totalCommits = Math.max(totalFromContributors, authorCommits);

  const files: TreeFile[] = (tree?.data.tree ?? []).flatMap((item) =>
    item.type === "blob" && item.path ? [{ path: item.path, size: item.size ?? 0 }] : [],
  );
  const paths = files.map((file) => file.path);

  const details = withDeepDive
    ? await deepDive(github, { ...target, ref: repo.defaultBranch }, files)
    : { dependencies: [], codeSamples: [] };

  return {
    commitDates,
    evidence: {
      name: repo.name,
      url: repo.url,
      description: repo.description,
      stars: repo.stargazersCount,
      sizeKb: repo.size,
      defaultBranch: repo.defaultBranch,
      languages: languages?.data ?? {},
      authorCommits,
      totalCommits,
      authorShare: totalCommits === 0 ? 0 : authorCommits / totalCommits,
      firstCommitAt: sortedDates[0] ?? null,
      lastCommitAt: sortedDates.at(-1) ?? null,
      activeDays: new Set(commitDates.map((date) => date.slice(0, 10))).size,
      commitMessages: commitList
        .slice(0, config.github.maxCommitMessages)
        .map((c) => c.commit.message.split("\n")[0].trim()),
      hasTests: hasTests(paths),
      hasCI: hasCI(paths),
      hasReadme: readme !== null,
      readmeExcerpt: readme
        ? decodeBase64(readme.data.content).slice(0, config.github.maxReadmeChars)
        : "",
      ...details,
    },
  };
}

function sumLanguages(repos: RepoEvidence[]): Record<string, number> {
  const totals = new Map<string, number>();
  for (const repo of repos) {
    for (const [language, bytes] of Object.entries(repo.languages)) {
      totals.set(language, (totals.get(language) ?? 0) + bytes);
    }
  }
  return Object.fromEntries([...totals].sort((a, b) => b[1] - a[1]));
}

export async function collectGithubEvidence(username: string): Promise<GithubEvidence> {
  const now = new Date();
  const github = createGithubClient(AbortSignal.timeout(config.github.collectTimeoutMs));

  try {
    const { data: user } = await github.users.getByUsername({ username });
    const { login } = user;

    const { data: listed } = await github.repos.listForUser({
      username: login,
      type: "owner",
      sort: "pushed",
      per_page: config.github.reposPerPage,
    });

    const repoRefs: RepoRef[] = listed.map((repo) => ({
      name: repo.name,
      fork: repo.fork,
      size: repo.size ?? 0,
      stargazersCount: repo.stargazers_count ?? 0,
      pushedAt: repo.pushed_at ?? null,
      url: repo.html_url,
      description: repo.description ?? null,
      defaultBranch: repo.default_branch ?? "main",
    }));

    const forkRepos = repoRefs.filter((repo) => repo.fork).length;
    const ownRepos = repoRefs.length - forkRepos;
    const picked = pickRepos(analyzableRepos(repoRefs, login), now);

    const collected = await Promise.all(
      picked.map((repo, index) =>
        collectRepo(github, login, repo, index < config.github.maxReposDeepDive),
      ),
    );
    const repos = collected.map((entry) => entry.evidence);
    const commitDates = collected.flatMap((entry) => entry.commitDates);

    return {
      username: login,
      profileUrl: user.html_url,
      accountCreatedAt: user.created_at,
      publicRepos: user.public_repos,
      ownRepos,
      forkRepos,
      aggregateLanguages: sumLanguages(repos),
      commitsByMonth: commitsByMonth(commitDates, now),
      repos,
      redFlags: computeRedFlags({
        publicRepos: user.public_repos,
        ownRepos,
        forkRepos,
        repos,
        commitDates,
        commitMessages: repos.flatMap((repo) => repo.commitMessages),
        now,
      }),
    };
  } catch (error) {
    throw toGithubError(error);
  }
}
