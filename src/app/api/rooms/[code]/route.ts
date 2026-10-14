import { NextResponse } from "next/server";
import { apiError, rateLimit } from "@/server/http";
import { getIdentity } from "@/server/identity";
import { multiplayerEnabled, readRoom } from "@/server/store";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const limited = rateLimit(request);
  if (limited) return limited;
  if (!multiplayerEnabled()) return apiError("INVALID_GAME_STATE", "Multiplayer is turned off.", 404);
  const { code } = await context.params;
  const room = await readRoom(code.toUpperCase());
  if (!room) return apiError("GAME_NOT_FOUND", "No room with that code.", 404);
  const identity = await getIdentity();
  const member = room.members.some((item) => item.playerId === identity.id);
  if (!member) {
    return NextResponse.json({
      ok: true,
      room: { code: room.code, status: room.status, maxPlayers: room.maxPlayers, seats: room.members.length, member: false },
    });
  }
  return NextResponse.json({ ok: true, room, member: true });
}
