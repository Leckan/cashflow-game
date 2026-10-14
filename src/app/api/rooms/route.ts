import { NextResponse } from "next/server";
import { createRoom } from "@/features/game/rooms";
import { roomCreateSchema } from "@/lib/validation";
import { apiError, guardMutation } from "@/server/http";
import { getIdentity, saveIdentity } from "@/server/identity";
import { multiplayerEnabled, writeRoom } from "@/server/store";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((value) => alphabet[value % alphabet.length]).join("");
}

export async function POST(request: Request) {
  const blocked = guardMutation(request);
  if (blocked) return blocked;
  if (!multiplayerEnabled()) return apiError("INVALID_GAME_STATE", "Multiplayer is turned off.", 404);
  const parsed = roomCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_TRANSACTION", "Check the room setup.", 400);
  const identity = await getIdentity();
  await saveIdentity(identity, parsed.data.displayName, parsed.data.avatarId);
  const now = new Date().toISOString();
  const room = createRoom({
    id: crypto.randomUUID(),
    code: makeCode(),
    now,
    host: {
      playerId: identity.id,
      userId: identity.authenticated ? identity.id : null,
      displayName: parsed.data.displayName,
      avatarId: parsed.data.avatarId,
      profileId: parsed.data.profileId,
      connected: true,
    },
  });
  await writeRoom(room);
  return NextResponse.json({ ok: true, room });
}
