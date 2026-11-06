import { APICallError, NoObjectGeneratedError, NoOutputGeneratedError, RetryError } from "ai";

const STATUS_CODES: Record<number, string> = {
  401: "ai_auth",
  403: "ai_auth",
  404: "ai_model_not_found",
  // Groq answers 413 when one request alone exceeds its tokens-per-minute limit.
  413: "ai_rate_limited",
  429: "ai_rate_limited",
};

const CLOSED_MODEL = /decommissioned|model_not_found|does not exist/i;
const BAD_KEY = /api[ _-]?key/i;
const INVALID_JSON = /json_validate_failed|does not match the expected schema/i;

function rootCause(error: unknown): unknown {
  return RetryError.isInstance(error) ? error.lastError : error;
}

/** Turns a provider failure into a code the UI can explain to a person. */
export function classifyAiError(error: unknown): string {
  const cause = rootCause(error);

  if (cause instanceof Error && cause.name === "TimeoutError") return "ai_timeout";
  if (NoObjectGeneratedError.isInstance(cause) || NoOutputGeneratedError.isInstance(cause)) {
    return "ai_invalid_output";
  }
  if (APICallError.isInstance(cause)) {
    // Providers differ: Gemini answers 400 for a bad key, Groq 400 for a closed model.
    const text = `${cause.message} ${cause.responseBody ?? ""}`;
    if (INVALID_JSON.test(text)) return "ai_invalid_output";
    if (CLOSED_MODEL.test(text)) return "ai_model_not_found";
    if (BAD_KEY.test(cause.message)) return "ai_auth";
    return STATUS_CODES[cause.statusCode ?? 0] ?? "ai_error";
  }
  return "ai_error";
}
