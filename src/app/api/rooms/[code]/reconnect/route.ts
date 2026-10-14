import { NextResponse } from "next/server";
import { reconnectRoom } from "@/features/game/rooms";
import { apiError, guardMutation } from "@/server/http";
import { getIdentity } from "@/server/identity";
import { multiplayerEnabled, mutateRoom } from "@/server/store";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const blocked = guardMutation(request);
  if (blocked) return blocked;
  if (!multiplayerEnabled()) return apiError("INVALID_GAME_STATE", "Multiplayer is turned off.", 404);
  const { code } = await context.params;
  const identity = await getIdentity();
  const result = await mutateRoom(code.toUpperCase(), async (room) => {
    if (!room) return { room: null, result: null };
    const next = reconnectRoom(room, identity.id, new Date().toISOString());
    return { room: next.room, result: next };
  });
  if (!result) return apiError("GAME_NOT_FOUND", "No room with that code.", 404);
  if (!result.ok) return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status: 403 });
  return NextResponse.json({ ok: true, room: result.room });
}
