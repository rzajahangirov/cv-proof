import { readJson, route } from "@/lib/api";
import { collectGithubEvidence } from "@/lib/github/collect";
import { githubCollectInputSchema } from "@/lib/schemas";

export const maxDuration = 60;

export const POST = route(async (request) => {
  const { username } = await readJson(request, githubCollectInputSchema);
  return collectGithubEvidence(username);
});
