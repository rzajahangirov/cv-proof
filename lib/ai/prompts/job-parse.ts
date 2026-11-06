import { guard, wrap } from "@/lib/ai/prompts/shared";
import { config } from "@/lib/config";
import type { Lang } from "@/lib/types";

export function jobParseSystem(lang: Lang): string {
  return `${guard(lang)}

Task: read the free-text vacancy inside <job> and extract the job title and ${config.job.minCriteria}-${config.job.maxCriteria} screening criteria.
- A criterion is "must" only if the text states it as required. Everything else is "nice".
- weight: integer 1-5. 5 = critical, 1 = minor.
- description: what evidence in a CV would satisfy the criterion.`;
}

export function jobParsePrompt(text: string): string {
  return wrap("job", text);
}
