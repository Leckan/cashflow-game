import { NextResponse } from "next/server";
import { actInRoom, startRoom } from "@/features/game/rooms";
import { actionSchema } from "@/lib/validation";
import { z } from "zod";
import { apiError, guardMutation } from "@/server/http";
import { getIdentity } from "@/server/identity";
import { multiplayerEnabled, mutateRoom } from "@/server/store";

const startSchema = z.object({ type: z.literal("start") });

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const blocked = guardMutation(request);
  if (blocked) return blocked;
  if (!multiplayerEnabled()) return apiError("INVALID_GAME_STATE", "Multiplayer is turned off.", 404);
  const body = await request.json().catch(() => null);
  const { code } = await context.params;
  const identity = await getIdentity();
  const now = new Date().toISOString();
  const starting = startSchema.safeParse(body);
  const result = await mutateRoom(code.toUpperCase(), async (room) => {
    if (!room) return { room: null, result: null };
    if (starting.success) {
      const started = startRoom(room, identity.id, now);
      return { room: started.ok ? started.room : room, result: started };
    }
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return {
        room,
        result: { ok: false as const, code: "INVALID_TRANSACTION" as const, message: "That action is not valid.", room },
      };
    }
    const acted = actInRoom(room, identity.id, { ...parsed.data, playerId: identity.id }, now);
    return { room: acted.room, result: acted };
  });
  if (!result) return apiError("GAME_NOT_FOUND", "No room with that code.", 404);
  if (!result.ok) return NextResponse.json({ ok: false, code: result.code, message: result.message, room: result.room }, { status: 400 });
  return NextResponse.json({ ok: true, room: result.room });
}
