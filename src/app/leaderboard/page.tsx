"use client";

import { useEffect, useState } from "react";
import { clientApi } from "@/lib/client-api";

interface Entry {
  gameId: string;
  displayName: string;
  score: number;
  ending: string | null;
  mode: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  useEffect(() => {
    void clientApi<{ entries: Entry[] }>("/api/leaderboard").then((body) => setEntries(body.entries));
  }, []);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="display text-5xl">Finished games on this server</h1>
      <p className="mt-3 max-w-2xl leading-7 text-paper/80">
        Scores come from net worth change, passive income, reserves, and the ending. They are not a ranking of real wealth, and they are not shared beyond this installation.
      </p>
      <ol className="mt-6 space-y-3">
        {entries.length === 0 && <li>No finished games have been shared yet.</li>}
        {entries.map((entry, index) => (
          <li key={entry.gameId} className="flex justify-between gap-4 border-b border-white/10 py-3">
            <span>{index + 1}. {entry.displayName}</span>
            <span>{entry.score} · {entry.ending ?? entry.mode}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
