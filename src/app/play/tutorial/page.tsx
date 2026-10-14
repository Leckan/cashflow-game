"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clientApi } from "@/lib/client-api";
import type { GameState } from "@/features/game/types";

export default function TutorialPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="display text-5xl">Four turns, then you know the table.</h1>
      <p className="mt-4 leading-7 text-paper/80">
        The dice are scripted. You will meet a paycheck, the Maple Street Duplex, a $200 repair, and the definition of financial independence used in this game.
      </p>
      <Button
        className="mt-6"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void clientApi<{ state: GameState }>("/api/games", {
            method: "POST",
            body: JSON.stringify({ mode: "tutorial", profileId: "early-career", displayName: "Student", avatarId: "fern" }),
          })
            .then((body) => router.push(`/play/solo/${body.state.id}`))
            .catch((reason: Error) => {
              setError(reason.message);
              setBusy(false);
            });
        }}
      >
        Begin the lesson
      </Button>
      {error && <p className="mt-3 text-persimmon">{error}</p>}
    </main>
  );
}
