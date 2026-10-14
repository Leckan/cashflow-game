import { NextResponse } from "next/server";
import { rateLimit } from "@/server/http";
import { getIdentity } from "@/server/identity";
import { listGames, readProfile } from "@/server/store";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const identity = await getIdentity();
  const games = await listGames(identity.id);
  const profile = await readProfile(identity.id);
  return NextResponse.json({
    ok: true,
    exportedAt: new Date().toISOString(),
    profile,
    games: games.filter((game) => game.ownerId === identity.id).map((game) => game.state),
  });
}
