import { config } from "@/lib/config";

export type TreeFile = { path: string; size: number };

const MANIFEST_NAMES = new Set([
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "go.mod",
  "composer.json",
  "Gemfile",
]);

const SKIPPED_DIRS = /(?:^|\/)(?:node_modules|dist|build|out|vendor|target|coverage|\.next|__pycache__|\.venv|venv)\//;
const SKIPPED_FILES = /(?:\.min\.[^/]+|\.lock|\.map|\.d\.ts|-lock\.[^/]+|\.generated\.[^/]+|\.g\.[^/]+)$/;
const SOURCE_FILE = /\.(?:ts|tsx|js|jsx|mjs|py|java|kt|go|rs|rb|php|cs|cpp|cc|c|h|swift|dart|vue|svelte|scala)$/i;
const ENTRY_POINT = /(?:^|\/)(?:main|index|app|server)\.[^/]+$/i;

function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function depth(path: string): number {
  return path.split("/").length;
}

function isScannable(path: string): boolean {
  return !SKIPPED_DIRS.test(path) && !SKIPPED_FILES.test(path);
}

function isManifest(path: string): boolean {
  const name = baseName(path);
  return MANIFEST_NAMES.has(name) || name.endsWith(".csproj");
}

/** Shallowest manifests first: those describe the project itself. */
export function pickManifests(files: TreeFile[]): string[] {
  return files
    .filter((file) => isManifest(file.path) && isScannable(file.path))
    .sort((a, b) => depth(a.path) - depth(b.path))
    .slice(0, config.github.maxManifestsPerRepo)
    .map((file) => file.path);
}

/** Entry points first, then the largest source files under the size limit. */
export function pickCodeFiles(files: TreeFile[]): string[] {
  const score = (file: TreeFile) => (ENTRY_POINT.test(file.path) ? 1 : 0);
  return files
    .filter(
      (file) =>
        SOURCE_FILE.test(file.path) &&
        isScannable(file.path) &&
        file.size > 0 &&
        file.size < config.github.maxCodeFileBytes,
    )
    .sort(
      (a, b) =>
        score(b) - score(a) ||
        (score(a) ? depth(a.path) - depth(b.path) : 0) ||
        b.size - a.size,
    )
    .slice(0, config.github.maxCodeFiles)
    .map((file) => file.path);
}

function parseJsonDependencies(content: string, sections: string[]): string[] {
  try {
    const manifest = JSON.parse(content) as Record<string, Record<string, unknown> | undefined>;
    return sections.flatMap((section) => Object.keys(manifest[section] ?? {}));
  } catch {
    return [];
  }
}

function matches(content: string, pattern: RegExp): string[] {
  return [...content.matchAll(pattern)].map((match) => match[1]);
}

export function parseDependencies(path: string, content: string): string[] {
  const name = baseName(path);

  if (name === "package.json") {
    return parseJsonDependencies(content, ["dependencies", "devDependencies"]);
  }
  if (name === "composer.json") {
    return parseJsonDependencies(content, ["require", "require-dev"]);
  }
  if (name === "requirements.txt") {
    return matches(content, /^\s*([a-z\d][\w.-]*)/gim);
  }
  if (name === "pyproject.toml") {
    return [
      ...matches(content, /^\s*["']([a-z\d][\w.-]*)[^"']*["'],?\s*$/gim),
      ...matches(content, /^([a-z\d][\w.-]*)\s*=\s*["'{]/gim).filter(
        (dep) => !["name", "version", "description", "python", "readme", "requires-python"].includes(dep),
      ),
    ];
  }
  if (name === "pom.xml") return matches(content, /<artifactId>([^<]+)<\/artifactId>/g);
  if (name.startsWith("build.gradle")) {
    return matches(content, /(?:implementation|api|compileOnly|testImplementation)[\s(]+["']([^"']+)["']/g);
  }
  if (name === "go.mod") return matches(content, /^\s*(?:require\s+)?([\w.-]+\.[\w.-]+\/\S+)\s+v/gm);
  if (name === "Gemfile") return matches(content, /^\s*gem\s+["']([^"']+)["']/gm);
  if (name.endsWith(".csproj")) return matches(content, /<PackageReference\s+Include="([^"]+)"/g);
  return [];
}
