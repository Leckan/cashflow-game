import { NextResponse } from "next/server";
import { rateLimit } from "@/server/http";
import { readLeaderboard } from "@/server/store";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const entries = await readLeaderboard();
  return NextResponse.json({ ok: true, entries });
}
