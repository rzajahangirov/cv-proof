import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
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

function parseEnsemble(): ModelRef[] {
  return (process.env.AI_ENSEMBLE_MODELS ?? "")
    .split(",")
    .flatMap((value) => parseModelRef(value) ?? []);
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

export function isMockMode(): boolean {
  return process.env.MOCK_AI === "true" || getPrimaryModel() === null;
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
    github: Boolean(process.env.GITHUB_TOKEN),
  };
}
