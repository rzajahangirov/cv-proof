const RESERVED_PATHS = new Set([
  "orgs",
  "features",
  "topics",
  "about",
  "pricing",
  "login",
  "settings",
  "marketplace",
  "explore",
  "sponsors",
  "collections",
  "enterprise",
]);

const GITHUB_URL = /github\.com\/([a-z\d](?:[a-z\d-]{0,38}))(?![a-z\d-])(\/[\w.-]+)?/gi;
const VALID_USERNAME = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

type GithubLink = { username: string; isProfile: boolean };

function githubLinks(text: string): GithubLink[] {
  return [...text.matchAll(GITHUB_URL)].flatMap(([, username, repoPath]) =>
    RESERVED_PATHS.has(username.toLowerCase()) ? [] : [{ username, isProfile: !repoPath }],
  );
}

/** With only repo links, the owner cited most often is the likeliest author. */
function mostFrequentOwner(links: GithubLink[]): string | null {
  const counts = new Map<string, { username: string; count: number }>();
  for (const { username } of links) {
    const key = username.toLowerCase();
    const entry = counts.get(key) ?? { username, count: 0 };
    counts.set(key, { ...entry, count: entry.count + 1 });
  }
  let best: { username: string; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best?.username ?? null;
}

/**
 * A bare profile link beats a repo link, because `github.com/facebook/react`
 * in a CV is a project someone worked on, not their account.
 */
export function extractGithubUsername(text: string): string | null {
  const links = githubLinks(text);
  return links.find((link) => link.isProfile)?.username ?? mostFrequentOwner(links);
}

/** Cleans a value from an LLM or from HR: it may be a URL or start with "@". */
export function normalizeGithubUsername(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/^@/, "");
  const fromUrl = extractGithubUsername(trimmed);
  if (fromUrl) return fromUrl;
  if (!VALID_USERNAME.test(trimmed) || RESERVED_PATHS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

/**
 * A profile link in the CV is the strongest signal. The LLM reads the context,
 * so it outranks a guess from repo links alone.
 */
export function resolveGithubUsername(text: string, llmValue: string | null): string | null {
  const links = githubLinks(text);
  return (
    links.find((link) => link.isProfile)?.username ??
    normalizeGithubUsername(llmValue) ??
    mostFrequentOwner(links)
  );
}
