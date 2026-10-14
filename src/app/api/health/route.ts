import { NextResponse } from "next/server";
import { multiplayerEnabled } from "@/server/store";

export async function GET() {
  return NextResponse.json({
    ok: true,
    storage: process.env.DATABASE_URL ? "postgres+file" : "file",
    multiplayer: multiplayerEnabled(),
  });
}
