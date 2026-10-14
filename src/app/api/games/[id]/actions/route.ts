import { NextResponse } from "next/server";
import { actionSchema } from "@/lib/validation";
import { apiError, guardMutation } from "@/server/http";
import { getIdentity } from "@/server/identity";
import { mutateGame } from "@/server/store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = guardMutation(request);
  if (blocked) return blocked;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_TRANSACTION", "That action is not valid.", 400);
  const { id } = await context.params;
  const identity = await getIdentity();
  const result = await mutateGame(id, identity.id, { ...parsed.data, playerId: identity.id });
  if (!result.ok) {
    const status = result.code === "GAME_NOT_FOUND" ? 404 : result.code === "INSUFFICIENT_FUNDS" ? 409 : 400;
    return NextResponse.json({ ok: false, code: result.code, message: result.message, state: result.state }, { status });
  }
  return NextResponse.json({ ok: true, duplicate: result.duplicate, state: result.state });
}
