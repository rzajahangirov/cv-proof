import { config } from "@/lib/config";

/**
 * Prompt-injection phrases in en/az/ru. Hidden white text is still present in
 * the extracted text, which is how it gets caught here.
 *
 * PDF extraction often glues hidden text to the previous word ("RusIgnore all
 * previous instructions"), so distinctive phrases must match mid-word. Only the
 * short ones that occur inside ordinary words ("corpoRATE MEetings") need a
 * boundary, written with lookarounds because \b ignores az/ru letters.
 */
const NOT_LETTER_BEFORE = "(?<![\\p{L}\\p{N}])";

const DISTINCTIVE = [
  "ignore\\s+(?:all\\s+|any\\s+)?(?:of\\s+)?(?:the\\s+|your\\s+)?(?:previous|above|prior|earlier)\\s+(?:instructions?|prompts?|rules?)",
  "disregard\\s+(?:all\\s+)?(?:of\\s+)?(?:the\\s+|your\\s+)?(?:previous|above|prior|earlier)\\s+(?:instructions?|prompts?|rules?)",
  "you\\s+are\\s+an?\\s+(?:ai|assistant|llm|language\\s+model)(?![\\p{L}\\p{N}])",
  "system\\s+prompt(?![\\p{L}\\p{N}])",
  "əvvəlki\\s+təlimatlar\\p{L}*",
  "bu\\s+namizədə",
  "игнорируй\\p{L}*",
  "предыдущие\\s+инструкции",
];

const NEEDS_BOUNDARY = [
  "give\\s+(?:this\\s+candidate\\s+|me\\s+)?(?:a\\s+)?(?:(?:score|rating)\\s+of\\s+)?100(?![\\p{L}\\p{N}])",
  "rate\\s+(?:me|this\\s+candidate)(?![\\p{L}\\p{N}])",
  "100\\s+bal(?![\\p{L}\\p{N}])",
];

const PATTERNS = [
  ...DISTINCTIVE.map((phrase) => new RegExp(phrase, "giu")),
  ...NEEDS_BOUNDARY.map((phrase) => new RegExp(NOT_LETTER_BEFORE + phrase, "giu")),
];

export function detectInjection(text: string): { detected: boolean; snippets: string[] } {
  const { maxInjectionSnippets, injectionSnippetContext } = config.cv;
  const snippets = new Set<string>();

  for (const pattern of PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (snippets.size >= maxInjectionSnippets) break;
      const start = Math.max(0, match.index - injectionSnippetContext);
      const end = match.index + match[0].length + injectionSnippetContext;
      snippets.add(text.slice(start, end).replace(/\s+/g, " ").trim());
    }
  }

  return { detected: snippets.size > 0, snippets: [...snippets] };
}
