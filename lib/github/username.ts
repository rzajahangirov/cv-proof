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

const GITHUB_URL = /github\.com\/([a-z\d](?:[a-z\d-]{0,38}))(?![a-z\d-])/gi;
const VALID_USERNAME = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

/** First non-reserved `github.com/<username>` in the raw CV text. */
export function extractGithubUsername(text: string): string | null {
  for (const match of text.matchAll(GITHUB_URL)) {
    const username = match[1];
    if (!RESERVED_PATHS.has(username.toLowerCase())) return username;
  }
  return null;
}

/** Cleans an LLM value that may still be a URL or start with "@". */
export function normalizeGithubUsername(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/^@/, "");
  const fromUrl = extractGithubUsername(trimmed);
  if (fromUrl) return fromUrl;
  if (!VALID_USERNAME.test(trimmed) || RESERVED_PATHS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

/** The regex over the raw text wins over the LLM value (plan §10). */
export function resolveGithubUsername(text: string, llmValue: string | null): string | null {
  return extractGithubUsername(text) ?? normalizeGithubUsername(llmValue);
}
