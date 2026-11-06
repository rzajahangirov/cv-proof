import type { ApiResponse } from "@/lib/types";

export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ApiClientError";
  }
}

async function send<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiClientError("network_error");
  }

  // Platform failures (413, 504) answer with HTML, not with our envelope.
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body) {
    throw new ApiClientError(response.status === 413 ? "file_too_large" : "server_error");
  }
  if (!body.ok) throw new ApiClientError(body.error.code, body.error.message);
  return body.data;
}

export function getJson<T>(url: string): Promise<T> {
  return send<T>(url);
}

export function postJson<T>(url: string, payload: unknown): Promise<T> {
  return send<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function postForm<T>(url: string, form: FormData): Promise<T> {
  return send<T>(url, { method: "POST", body: form });
}
