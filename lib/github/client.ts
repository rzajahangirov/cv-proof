import { Octokit } from "@octokit/rest";
import { ApiError } from "@/lib/api";
import { config } from "@/lib/config";
import type { GithubProbe } from "@/lib/types";

type HttpError = {
  status: number;
  message: string;
  response?: { headers?: Record<string, string | number | undefined> };
};

function isHttpError(error: unknown): error is HttpError {
  return typeof error === "object" && error !== null && "status" in error;
}

function isRateLimited(error: HttpError): boolean {
  if (error.status === 429) return true;
  if (error.status !== 403) return false;
  const remaining = error.response?.headers?.["x-ratelimit-remaining"];
  return String(remaining) === "0" || /rate limit/i.test(error.message);
}

/** A missing token still works, with GitHub's low unauthenticated limit (plan §3). */
export function createGithubClient(signal: AbortSignal): Octokit {
  return new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
    request: { signal },
    log: { debug() {}, info() {}, warn() {}, error() {} },
  });
}

/**
 * Per-repo data is best-effort: an empty repo (409), a contributor list that is
 * too large (403) or a missing README (404) must not lose the whole candidate.
 * Rate limits and network failures still propagate.
 */
export async function optional<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (isHttpError(error) && !isRateLimited(error)) return null;
    throw error;
  }
}

export async function probeGithub(): Promise<GithubProbe> {
  try {
    const github = createGithubClient(AbortSignal.timeout(config.github.probeTimeoutMs));
    const { remaining, limit } = (await github.rateLimit.get()).data.resources.core;
    return { ok: true, error: null, remaining, limit };
  } catch (error) {
    return { ok: false, error: toGithubError(error).code, remaining: null, limit: null };
  }
}

export function toGithubError(error: unknown): ApiError {
  if (isHttpError(error)) {
    if (error.status === 401) return new ApiError("github_auth", "GitHub token is invalid", 502);
    if (error.status === 404) return new ApiError("user_not_found", "GitHub user not found", 404);
    if (error.status === 403 || error.status === 429) {
      return new ApiError("rate_limited", "GitHub rate limit reached", 429);
    }
  }
  const message = error instanceof Error ? error.message : "GitHub request failed";
  return new ApiError("github_error", message, 502);
}
