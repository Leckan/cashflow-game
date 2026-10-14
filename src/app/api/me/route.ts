import { NextResponse } from "next/server";
import { profileSchema } from "@/lib/validation";
import { apiError, guardMutation, rateLimit } from "@/server/http";
import { getIdentity, saveIdentity } from "@/server/identity";
import { deleteOwnedGames, listGames } from "@/server/store";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const identity = await getIdentity();
  return NextResponse.json({ ok: true, identity });
}

export async function POST(request: Request) {
  const blocked = guardMutation(request);
  if (blocked) return blocked;
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_TRANSACTION", "Use a name and an avatar.", 400);
  const identity = await getIdentity();
  await saveIdentity(identity, parsed.data.displayName, parsed.data.avatarId);
  return NextResponse.json({ ok: true, identity: { ...identity, ...parsed.data } });
}

export async function DELETE(request: Request) {
  const blocked = guardMutation(request);
  if (blocked) return blocked;
  const identity = await getIdentity();
  const games = await listGames(identity.id);
  await deleteOwnedGames(identity.id);
  return NextResponse.json({ ok: true, deletedGames: games.filter((game) => game.ownerId === identity.id).length });
}
