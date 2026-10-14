"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clientApi } from "@/lib/client-api";

interface Summary {
  id: string;
  mode: string;
  status: string;
  ending: string | null;
  turnNumber: number;
  updatedAt: string;
  displayName: string;
}

export default function DashboardPage() {
  const [games, setGames] = useState<Summary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void clientApi<{ games: Summary[] }>("/api/games")
      .then((body) => setGames(body.games))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setReady(true));
  }, []);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="display text-5xl">Saved games</h1>
      <p className="mt-3 text-paper/80">These are the games on this machine for the current browser or signed-in demo account.</p>
      {error && <p className="mt-4 text-persimmon">{error}</p>}
      <ul className="mt-6 divide-y divide-white/10">
        {!ready && <li className="py-4">Looking up saved games…</li>}
        {ready && games.length === 0 && <li className="py-4">No games yet. The table is empty.</li>}
        {games.map((game) => (
          <li key={game.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-semibold">{game.displayName}</p>
              <p className="text-sm text-paper/70">{game.mode} · month {game.turnNumber} · {game.ending ?? game.status}</p>
            </div>
            <Link href={game.mode === "multiplayer" ? "/play" : `/play/solo/${game.id}`} className="text-brass">
              Resume
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
