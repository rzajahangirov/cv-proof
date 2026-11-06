import { z } from "zod";
import { classifyAiError } from "@/lib/ai/errors";
import type { ApiResponse } from "@/lib/types";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function fail(code: string, message: string, status: number): Response {
  const body: ApiResponse<never> = { ok: false, error: { code, message } };
  return Response.json(body, { status });
}

function toFailure(error: unknown): Response {
  if (error instanceof ApiError) return fail(error.code, error.message, error.status);
  if (error instanceof z.ZodError) return fail("invalid_input", z.prettifyError(error), 400);

  const message = error instanceof Error ? error.message : "Unknown error";
  const code = classifyAiError(error);
  // Only the message: provider errors carry the request body, i.e. CV data.
  console.error("[api]", code, message);
  return fail(code, message.slice(0, 300), code === "ai_timeout" ? 504 : 502);
}

/** Wraps a route handler in the `{ ok, data | error }` envelope (plan §7). */
export function route<T>(handler: (request: Request) => Promise<T>) {
  return async (request: Request): Promise<Response> => {
    try {
      const data = await handler(request);
      const body: ApiResponse<T> = { ok: true, data };
      return Response.json(body);
    } catch (error) {
      return toFailure(error);
    }
  };
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await request.json().catch(() => {
    throw new ApiError("invalid_input", "Body is not valid JSON");
  });
  return schema.parse(body);
}
