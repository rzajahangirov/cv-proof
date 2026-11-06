import { getHealth } from "@/lib/ai/models";
import { probeModels } from "@/lib/ai/probe";
import { route } from "@/lib/api";
import { probeGithub } from "@/lib/github/client";
import type { HealthInfo } from "@/lib/types";

export const maxDuration = 60;

/** `?check=models` makes one tiny real call per model; plain health stays free. */
export const GET = route(async (request): Promise<HealthInfo> => {
  const health = getHealth();
  if (new URL(request.url).searchParams.get("check") !== "models") return health;

  const [models, githubCheck] = await Promise.all([probeModels(), probeGithub()]);
  return { ...health, models, githubCheck };
});
