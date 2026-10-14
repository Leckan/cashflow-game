import { NextResponse } from "next/server";
import { rateLimit, apiError } from "@/server/http";
import { getIdentity } from "@/server/identity";
import { readGame } from "@/server/store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const { id } = await context.params;
  const identity = await getIdentity();
  const record = await readGame(id);
  const allowed = record && (record.ownerId === identity.id || record.state.players.some((player) => player.id === identity.id || player.userId === identity.id));
  if (!record || !allowed) return apiError("GAME_NOT_FOUND", "No game with that id.", 404);
  return NextResponse.json({ ok: true, state: record.state });
}
