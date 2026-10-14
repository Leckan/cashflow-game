import { NextResponse } from "next/server";
import { joinRoom } from "@/features/game/rooms";
import { roomJoinSchema } from "@/lib/validation";
import { apiError, guardMutation } from "@/server/http";
import { getIdentity, saveIdentity } from "@/server/identity";
import { multiplayerEnabled, mutateRoom } from "@/server/store";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const blocked = guardMutation(request);
  if (blocked) return blocked;
  if (!multiplayerEnabled()) return apiError("INVALID_GAME_STATE", "Multiplayer is turned off.", 404);
  const parsed = roomJoinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_TRANSACTION", "Check your name and profile.", 400);
  const { code } = await context.params;
  const identity = await getIdentity();
  await saveIdentity(identity, parsed.data.displayName, parsed.data.avatarId);
  const result = await mutateRoom(code.toUpperCase(), async (room) => {
    if (!room) return { room: null, result: null };
    const joined = joinRoom(
      room,
      {
        playerId: identity.id,
        userId: identity.authenticated ? identity.id : null,
        displayName: parsed.data.displayName,
        avatarId: parsed.data.avatarId,
        profileId: parsed.data.profileId,
        connected: true,
      },
      new Date().toISOString(),
    );
    return { room: joined.room, result: joined };
  });
  if (!result) return apiError("GAME_NOT_FOUND", "No room with that code.", 404);
  if (!result.ok) return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status: 400 });
  return NextResponse.json({ ok: true, room: result.room });
}
