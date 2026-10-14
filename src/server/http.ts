import { NextResponse } from "next/server";
import type { GameErrorCode } from "@/features/game/types";

const hits = new Map<string, { count: number; reset: number }>();

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function rateLimit(request: Request): NextResponse | null {
  const key = `${clientKey(request)}:${new URL(request.url).pathname}`;
  const now = Date.now();
  const current = hits.get(key);
  if (!current || current.reset < now) {
    hits.set(key, { count: 1, reset: now + 60_000 });
    return null;
  }
  current.count += 1;
  if (current.count > 90) {
    return NextResponse.json(
      { ok: false, code: "INVALID_TRANSACTION", message: "Too many requests. Wait a minute and try again." },
      { status: 429 },
    );
  }
  return null;
}

export function guardMutation(request: Request): NextResponse | null {
  if (request.headers.get("x-wealthquest-request") !== "1") {
    return NextResponse.json(
      { ok: false, code: "INVALID_TRANSACTION", message: "Missing request header." },
      { status: 403 },
    );
  }
  return rateLimit(request);
}

export function apiError(code: GameErrorCode, message: string, status: number) {
  return NextResponse.json({ ok: false, code, message }, { status });
}
