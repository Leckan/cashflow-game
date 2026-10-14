import { NextResponse } from "next/server";
import { explainLocally } from "@/features/game/coach";
import { coachSchema } from "@/lib/validation";
import { apiError, guardMutation } from "@/server/http";
import { getIdentity } from "@/server/identity";
import { readGame } from "@/server/store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = guardMutation(request);
  if (blocked) return blocked;
  const parsed = coachSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_TRANSACTION", "Pick one of the coach questions.", 400);
  const { id } = await context.params;
  const identity = await getIdentity();
  const record = await readGame(id);
  if (!record || (record.ownerId !== identity.id && !record.state.players.some((player) => player.id === identity.id))) {
    return apiError("GAME_NOT_FOUND", "No game with that id.", 404);
  }
  return NextResponse.json({ ok: true, reply: explainLocally(record.state, identity.id, parsed.data.questionId) });
}
