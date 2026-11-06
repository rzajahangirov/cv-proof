import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { az } from "@/lib/i18n/messages/az";

function isCorrect(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function suppliedPassword(request: NextRequest): string | null {
  const [scheme, encoded] = (request.headers.get("authorization") ?? "").split(" ");
  if (scheme !== "Basic" || !encoded) return null;
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  return decoded.slice(decoded.indexOf(":") + 1);
}

/**
 * One shared password for the whole app, pages and API alike. Every API call
 * spends paid AI quota, so a public deployment must not stay open. The browser
 * shows its own login dialog; any username works. Without APP_PASSWORD the app
 * stays open, which keeps local development and hosts with their own gate simple.
 */
export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const supplied = suppliedPassword(request);
  if (supplied !== null && isCorrect(supplied, password)) return NextResponse.next();

  return new NextResponse(az.errors.auth_required, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="CV Proof", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg).*)"],
};
