import { Suspense } from "react";
import { GameApp } from "@/components/game/GameApp";

export default function RoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  return (
    <Suspense fallback={<p className="p-6">Finding the room…</p>}>
      <Loaded params={params} />
    </Suspense>
  );
}

async function Loaded({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  return <GameApp roomCode={roomCode.toUpperCase()} />;
}
