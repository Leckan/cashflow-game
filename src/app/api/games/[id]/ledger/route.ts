import { NextResponse } from "next/server";
import { apiError, rateLimit } from "@/server/http";
import { getIdentity } from "@/server/identity";
import { readGame } from "@/server/store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const { id } = await context.params;
  const identity = await getIdentity();
  const record = await readGame(id);
  if (!record || (record.ownerId !== identity.id && !record.state.players.some((player) => player.id === identity.id))) {
    return apiError("GAME_NOT_FOUND", "No game with that id.", 404);
  }
  const player = record.state.players.find((item) => item.id === identity.id) ?? record.state.players[0];
  return NextResponse.json({ ok: true, ledger: player?.ledger ?? [] });
}
