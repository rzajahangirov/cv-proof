import { APICallError, NoObjectGeneratedError, NoOutputGeneratedError, RetryError } from "ai";

const STATUS_CODES: Record<number, string> = {
  401: "ai_auth",
  403: "ai_auth",
  404: "ai_model_not_found",
  429: "ai_rate_limited",
};

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
    // Gemini answers 400, not 401, for a bad key.
    if (/api[ _-]?key/i.test(cause.message)) return "ai_auth";
    return STATUS_CODES[cause.statusCode ?? 0] ?? "ai_error";
  }
  return "ai_error";
}
