import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { HealthInfo } from "@/lib/types";

const PROVIDERS = {
  anthropic: {
    keyEnv: "ANTHROPIC_API_KEY",
    create: (apiKey: string, modelId: string) => createAnthropic({ apiKey })(modelId),
  },
  openai: {
    keyEnv: "OPENAI_API_KEY",
    create: (apiKey: string, modelId: string) => createOpenAI({ apiKey })(modelId),
  },
  google: {
    keyEnv: "GOOGLE_GENERATIVE_AI_API_KEY",
    create: (apiKey: string, modelId: string) => createGoogleGenerativeAI({ apiKey })(modelId),
  },
  groq: {
    keyEnv: "GROQ_API_KEY",
    create: (apiKey: string, modelId: string) => createGroq({ apiKey })(modelId),
  },
} as const;

type ProviderName = keyof typeof PROVIDERS;
type ModelRef = { id: string; provider: ProviderName; modelId: string };

export type ResolvedModel = { id: string; model: LanguageModel };

// TODO(HUMAN): set the API keys and real model IDs in .env.local and on Vercel.
/** The placeholder from .env.example counts as "not configured". */
const PLACEHOLDER_MODEL_ID = "MODEL_ID";

function parseModelRef(value: string): ModelRef | null {
  const id = value.trim();
  const separator = id.indexOf(":");
  if (separator <= 0) return null;

  const provider = id.slice(0, separator);
  const modelId = id.slice(separator + 1);
  if (!(provider in PROVIDERS) || !modelId || modelId === PLACEHOLDER_MODEL_ID) return null;
  return { id, provider: provider as ProviderName, modelId };
}

function ensembleEntries(): string[] {
  return (process.env.AI_ENSEMBLE_MODELS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseEnsemble(): ModelRef[] {
  return ensembleEntries().flatMap((value) => parseModelRef(value) ?? []);
}

/** Entries nothing can use, such as a provider this app does not support. */
function ignoredModels(): string[] {
  const entries = [process.env.AI_PRIMARY_MODEL?.trim() ?? "", ...ensembleEntries()];
  const ignored = entries.filter(
    (value) => value && !parseModelRef(value) && !value.endsWith(`:${PLACEHOLDER_MODEL_ID}`),
  );
  return [...new Set(ignored)];
}

function apiKeyFor(ref: ModelRef): string | undefined {
  return process.env[PROVIDERS[ref.provider].keyEnv] || undefined;
}

function resolve(ref: ModelRef): ResolvedModel | null {
  const apiKey = apiKeyFor(ref);
  if (!apiKey) return null;
  return { id: ref.id, model: PROVIDERS[ref.provider].create(apiKey, ref.modelId) };
}

/** Falls back to the first ensemble model with a key (plan §3). */
export function getPrimaryModel(): ResolvedModel | null {
  const primary = parseModelRef(process.env.AI_PRIMARY_MODEL ?? "");
  const resolved = primary ? resolve(primary) : null;
  return resolved ?? getEnsembleModels()[0] ?? null;
}

export function getEnsembleModels(): ResolvedModel[] {
  return parseEnsemble().flatMap((ref) => resolve(ref) ?? []);
}

/**
 * Without keys the app falls back to fake answers, which is right for a demo
 * and wrong for real hiring. A broken setup in production must fail visibly, so
 * there mock mode has to be requested with MOCK_AI=true.
 */
export function isMockMode(): boolean {
  if (process.env.MOCK_AI === "true") return true;
  return process.env.VERCEL_ENV !== "production" && getPrimaryModel() === null;
}

export function getHealth(): HealthInfo {
  const mock = isMockMode();
  return {
    mock,
    primaryModel: mock ? null : (getPrimaryModel()?.id ?? null),
    ensemble: parseEnsemble().map((ref) => ({
      id: ref.id,
      available: !mock && Boolean(apiKeyFor(ref)),
    })),
    ignoredModels: ignoredModels(),
    github: Boolean(process.env.GITHUB_TOKEN),
  };
}
