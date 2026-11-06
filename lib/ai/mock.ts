import type { z } from "zod";
import { config } from "@/lib/config";
import { extractGithubUsername } from "@/lib/github/username";
import type {
  cvExtractOutputSchema,
  githubScoreOutputSchema,
  interviewOutputSchema,
  jobParseOutputSchema,
  screenOutputSchema,
} from "@/lib/schemas";
import type {
  BlindProfile,
  Claim,
  GithubEvidence,
  Job,
  MergedClaim,
  Stage1Result,
} from "@/lib/types";

/** Deterministic fake AI output: the same input always gives the same result. */

export const MOCK_MODEL_IDS = ["mock:alpha", "mock:beta", "mock:gamma"];

const KNOWN_TECH = [
  "React", "Next.js", "Vue", "Angular", "TypeScript", "JavaScript", "Node.js", "Express",
  "NestJS", "Python", "Django", "Flask", "FastAPI", "Java", "Spring", "Kotlin", "C#", ".NET",
  "Go", "PHP", "Laravel", "Ruby", "Rails", "Swift", "Flutter", "SQL", "PostgreSQL", "MySQL",
  "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "Linux", "REST",
  "GraphQL", "HTML", "CSS", "Tailwind", "Redux", "Jest", "CI/CD",
];

const GENERAL_CRITERIA = [
  { name: "İş təcrübəsi", description: "CV-də müvafiq sahədə real iş təcrübəsi göstərilib" },
  { name: "Layihə portfeli", description: "CV-də namizədin üzərində işlədiyi layihələr göstərilib" },
  { name: "Komanda işi", description: "CV-də komandada işləmə təcrübəsi göstərilib" },
  { name: "Təhsil", description: "CV-də müvafiq təhsil və ya kurslar göstərilib" },
  { name: "Dil bilikləri", description: "CV-də iş üçün lazım olan dil bilikləri göstərilib" },
];

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) {
    value ^= char.codePointAt(0) ?? 0;
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function inRange(seed: string, min: number, max: number): number {
  return min + (hash(seed) % (max - min + 1));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mentions(text: string, term: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`, "iu").test(text);
}

function findTech(text: string): string[] {
  return KNOWN_TECH.filter((tech) => mentions(text, tech));
}

export function mockJobParse(text: string): z.infer<typeof jobParseOutputSchema> {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const techCriteria = findTech(text)
    .slice(0, config.job.maxCriteria - 2)
    .map((tech) => {
      const line = lines.find((l) => mentions(l, tech)) ?? "";
      const required = /tələb|mütləq|vacib|required|must/i.test(line);
      return {
        name: tech,
        description: `CV-də ${tech} ilə real iş və ya layihə təcrübəsi göstərilib`,
        type: required ? ("must" as const) : ("nice" as const),
        weight: inRange(tech + text.length, 2, 5),
      };
    });
  const general = GENERAL_CRITERIA.map((criterion) => ({
    ...criterion,
    type: "nice" as const,
    weight: inRange(criterion.name, 1, 3),
  }));

  return {
    title: (lines[0] ?? "Vakansiya").slice(0, 80),
    criteria: [...techCriteria, ...general].slice(
      0,
      Math.max(config.job.minCriteria, techCriteria.length + 2),
    ),
  };
}

export function mockCvExtract(text: string): z.infer<typeof cvExtractOutputSchema> {
  const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
  const looksLikeName = firstLine.split(/\s+/).length <= 5 && !/[\d@:/]/.test(firstLine);
  const years = text.match(/(\d{1,2})\s*\+?\s*(?:il|years?)(?![\p{L}])/iu);

  return {
    name: looksLikeName ? firstLine : null,
    email: text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null,
    phone: text.match(/\+?\d[\d\s()-]{8,}\d/)?.[0]?.trim() ?? null,
    githubUsername: extractGithubUsername(text),
    linkedinUrl: text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s),;]+/i)?.[0] ?? null,
    totalYearsExperience: years ? Number(years[1]) : null,
    skills: findTech(text).map((name) => ({ name, claimedLevel: null, years: null })),
    experience: [],
    projects: [],
    education: [],
    languages: [],
    injectionDetected: false,
  };
}

export function mockScreen(input: {
  job: Job;
  blindProfile: BlindProfile;
  redactedCvText: string;
}): z.infer<typeof screenOutputSchema> {
  const { job, blindProfile, redactedCvText } = input;
  const skills = blindProfile.skills.map((skill) => skill.name);

  const criteria = job.criteria.map((criterion) => {
    const found = mentions(redactedCvText, criterion.name);
    const verdict = found
      ? ("met" as const)
      : (["partial", "missing", "met"] as const)[
          hash(criterion.id + redactedCvText.length) % 3
        ];
    return {
      criterionId: criterion.id,
      verdict,
      evidence:
        verdict === "missing"
          ? "CV-də sübut yoxdur"
          : `CV-də "${criterion.name}" ilə bağlı məlumat var (mock)`,
      reasoning: `Mock qiymətləndirmə: "${criterion.name}" meyarı CV mətni ilə müqayisə olundu.`,
    };
  });

  return {
    criteria,
    claimsToVerify: skills.slice(0, config.ai.maxClaims).map((skill) => ({
      claim: `${skill} ilə praktik iş təcrübəsi var`,
      relatedCriterionId: job.criteria.find((c) => c.name === skill)?.id ?? null,
    })),
    summary: `Namizədin CV-si ${skills.length} texnologiyanı əhatə edir. Bu nəticə mock rejimində yaradılıb.`,
    injectionDetected: false,
  };
}

function evidenceTech(evidence: GithubEvidence): string[] {
  return [
    ...Object.keys(evidence.aggregateLanguages),
    ...evidence.repos.flatMap((repo) => repo.dependencies),
  ];
}

export function mockGithubScore(
  modelId: string,
  input: { claims: Claim[]; evidence: GithubEvidence },
): z.infer<typeof githubScoreOutputSchema> {
  const { claims, evidence } = input;
  const known = evidenceTech(evidence).join(" ");
  const base = inRange(evidence.username, 40, 85);
  // Roughly one username in four disagrees widely, which exercises needsReview.
  const width = hash(`${evidence.username}:spread`) % 4 === 0 ? 18 : 6;
  const score = Math.min(100, Math.max(0, base + inRange(modelId + evidence.username, -width, width)));
  const topRepo = evidence.repos[0];

  return {
    score,
    summary: `${evidence.repos.length} repozitoriya yoxlanıldı. Bu qiymət mock rejimində yaradılıb.`,
    strengths: topRepo ? [`${topRepo.name} repozitoriyasında aktiv iş görünür`] : [],
    concerns: evidence.redFlags.map((flag) => `Xəbərdarlıq siqnalı: ${flag}`).slice(0, 4),
    claims: claims.map(({ id, claim }) => {
      const tech = findTech(claim);
      const supported = tech.some((name) => mentions(known, name));
      return {
        claimId: id,
        verdict: supported ? ("confirmed" as const) : ("no_evidence" as const),
        evidence: supported
          ? `${tech.join(", ")} GitHub-dakı kodda görünür (mock)`
          : "İctimai kodda bu iddia üçün sübut tapılmadı (mock)",
        link: supported ? (topRepo?.url ?? null) : null,
      };
    }),
    injectionDetected: false,
  };
}

export function mockInterview(input: {
  stage1: Stage1Result;
  mergedClaims: MergedClaim[];
  evidence: GithubEvidence | null;
}): z.infer<typeof interviewOutputSchema> {
  const { stage1, mergedClaims, evidence } = input;
  const answers = {
    goodAnswer: [
      "Konkret layihə və öz rolunu adlandırır",
      "Texniki qərarın səbəbini sadə dillə izah edir",
      "Qarşılaşdığı problemi və həllini təsvir edir",
    ],
    weakAnswerSigns: ["Ümumi cümlələrlə cavab verir", "Konkret nümunə göstərə bilmir"],
  };

  const repoQuestions = (evidence?.repos ?? [])
    .slice(0, config.interview.maxGithubQuestions)
    .map((repo) => ({
      type: "github" as const,
      question: `${repo.name} layihəsinin arxitekturasını və ən çətin hissəsini izah edin.`,
      why: "Namizədin koda həqiqətən bələd olduğunu yoxlayır.",
      ...answers,
      relatedRepo: repo.name,
      relatedClaimId: null,
    }));

  const openClaims = mergedClaims.length
    ? mergedClaims.filter((claim) => claim.verdict !== "confirmed")
    : stage1.claimsToVerify.map((claim) => ({ claimId: claim.id, claim: claim.claim }));
  const claimLimit = evidence
    ? config.interview.maxUnverifiedQuestions
    : config.interview.maxNoGithubQuestions;

  const claimQuestions = openClaims.slice(0, claimLimit).map(({ claimId, claim }) => ({
    type: "unverified_claim" as const,
    question: `"${claim}" iddiası barədə real iş nümunəsi danışın.`,
    why: "Bu iddia GitHub-da təsdiqlənməyib.",
    ...answers,
    relatedRepo: null,
    relatedClaimId: claimId,
  }));

  return {
    questions: [...repoQuestions, ...claimQuestions],
    task: {
      title: "Kiçik praktiki tapşırıq (mock)",
      description: "Vakansiyanın əsas texnologiyası ilə kiçik bir funksiya hazırlayın və qərarlarınızı izah edin.",
      timeLimitMinutes: 45,
      acceptanceCriteria: ["Kod işləyir", "Əsas ssenari yoxlanılıb", "Qərarlar izah olunub"],
    },
  };
}
