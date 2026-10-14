import { Suspense } from "react";
import { GameApp } from "@/components/game/GameApp";

export default function SoloGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  return (
    <Suspense fallback={<p className="p-6">Setting the table…</p>}>
      <Loaded params={params} />
    </Suspense>
  );
}

async function Loaded({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  return <GameApp gameId={gameId} />;
}
