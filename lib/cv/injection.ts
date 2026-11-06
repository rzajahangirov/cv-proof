import { config } from "@/lib/config";

/**
 * Prompt-injection phrases in en/az/ru. Hidden white text is still present in
 * the extracted text, which is how it gets caught here. Cyrillic and Azerbaijani
 * letters are outside \b, hence the explicit Unicode lookarounds.
 */
const NOT_LETTER_BEFORE = "(?<![\\p{L}\\p{N}])";
const NOT_LETTER_AFTER = "(?![\\p{L}\\p{N}])";

const PHRASES = [
  "ignore\\s+(?:all\\s+|any\\s+)?(?:of\\s+)?(?:the\\s+|your\\s+)?(?:previous|above|prior|earlier)\\s+(?:instructions?|prompts?|rules?)",
  "disregard\\s+(?:all\\s+)?(?:of\\s+)?(?:the\\s+|your\\s+)?(?:previous|above|prior|earlier)\\s+(?:instructions?|prompts?|rules?)",
  "system\\s+prompt",
  "give\\s+(?:this\\s+candidate\\s+|me\\s+)?(?:a\\s+)?(?:(?:score|rating)\\s+of\\s+)?100",
  "rate\\s+(?:me|this\\s+candidate)",
  "you\\s+are\\s+an?\\s+(?:ai|assistant|llm|language\\s+model)",
  "əvvəlki\\s+təlimatlar\\p{L}*",
  "bu\\s+namizədə",
  "100\\s+bal",
  "игнорируй\\p{L}*",
  "предыдущие\\s+инструкции",
];

const PATTERNS = PHRASES.map(
  (phrase) => new RegExp(`${NOT_LETTER_BEFORE}${phrase}${NOT_LETTER_AFTER}`, "giu"),
);

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
