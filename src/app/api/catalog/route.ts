import { NextResponse } from "next/server";
import { catalog } from "@/features/game/content";
import { coachPrompts } from "@/features/game/coach";

export async function GET() {
  return NextResponse.json({
    ok: true,
    profiles: catalog.profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      summary: profile.summary,
      note: profile.note,
    })),
    challenges: catalog.challenges,
    prompts: coachPrompts(),
    multiplayer: process.env.NEXT_PUBLIC_MULTIPLAYER_ENABLED !== "false",
  });
}
