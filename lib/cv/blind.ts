import type { BlindProfile, CvProfile } from "@/lib/types";

const REDACTED = "[REDACTED]";

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu;
const LINKEDIN = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s),;]+/gi;
const PHONE_LIKE = /\+?\(?\d[\d\s().-]{7,}\d/g;
const YEAR_RANGE = /^(?:19|20)\d{2}\D+(?:19|20)\d{2}/;

function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "").length;
  if (digits < 9 || digits > 15) return false;
  // "2019 - 2021" also matches PHONE_LIKE; career dates must survive redaction.
  return !YEAR_RANGE.test(value.trim());
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wholeWord(value: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(value)}(?![\\p{L}\\p{N}])`, "giu");
}

/** An allow-list: a field added to CvProfile later cannot leak by default. */
export function toBlindProfile(profile: CvProfile): BlindProfile {
  const { githubUsername, totalYearsExperience, skills, experience, projects, education, languages } =
    profile;
  return { githubUsername, totalYearsExperience, skills, experience, projects, education, languages };
}

/**
 * Removes personal identifiers before text reaches the screen, score and
 * interview steps. Pattern-based passes run too, because the LLM may normalize
 * a phone number or email differently from how the CV writes it.
 */
export function redactCvText(text: string, profile: CvProfile): string {
  let result = text;

  for (const value of [profile.email, profile.phone, profile.linkedinUrl]) {
    if (value) result = result.replaceAll(value, REDACTED);
  }

  const name = profile.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter((part) => part.length >= 3);
    for (const value of [name, ...parts]) {
      result = result.replace(wholeWord(value), REDACTED);
    }
  }

  return result
    .replace(EMAIL, REDACTED)
    .replace(LINKEDIN, REDACTED)
    .replace(PHONE_LIKE, (match) => (looksLikePhone(match) ? REDACTED : match));
}
