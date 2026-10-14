import { NextResponse } from "next/server";
import { catalog } from "@/features/game/content";
import { createGame } from "@/features/game/engine";
import { createGameSchema } from "@/lib/validation";
import { getIdentity, saveIdentity } from "@/server/identity";
import { apiError, guardMutation, rateLimit } from "@/server/http";
import { createGameRecord, listGames } from "@/server/store";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const identity = await getIdentity();
  const games = await listGames(identity.id);
  return NextResponse.json({
    ok: true,
    games: games.map((record) => ({
      id: record.state.id,
      mode: record.state.mode,
      status: record.state.status,
      ending: record.state.ending,
      turnNumber: record.state.turnNumber,
      updatedAt: record.state.updatedAt,
      challengeId: record.state.challengeId,
      displayName: record.state.players[0]?.displayName ?? identity.displayName,
    })),
  });
}

export async function POST(request: Request) {
  const blocked = guardMutation(request);
  if (blocked) return blocked;
  const parsed = createGameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_TRANSACTION", "Check the game setup and try again.", 400);
  if (parsed.data.challengeId && !catalog.challenges.some((challenge) => challenge.id === parsed.data.challengeId)) {
    return apiError("INVALID_TRANSACTION", "That challenge is not in this edition.", 400);
  }
  if (!catalog.profiles.some((profile) => profile.id === parsed.data.profileId)) {
    return apiError("INVALID_TRANSACTION", "That profile is not in this edition.", 400);
  }
  const identity = await getIdentity();
  const displayName = parsed.data.displayName ?? identity.displayName;
  const avatarId = parsed.data.avatarId ?? identity.avatarId;
  if (parsed.data.displayName || parsed.data.avatarId) await saveIdentity(identity, displayName, avatarId);
  const seed = parsed.data.seed ?? (crypto.getRandomValues(new Uint32Array(1))[0] || 1);
  const state = createGame({
    id: crypto.randomUUID(),
    mode: parsed.data.mode,
    profileId: parsed.data.profileId,
    challengeId: parsed.data.challengeId ?? null,
    difficulty: parsed.data.difficulty,
    seed,
    now: new Date().toISOString(),
    shareScore: parsed.data.shareScore,
    players: [
      {
        id: identity.id,
        userId: identity.authenticated ? identity.id : null,
        displayName,
        avatarId,
      },
    ],
  });
  await createGameRecord(identity.id, state);
  return NextResponse.json({ ok: true, state });
}
