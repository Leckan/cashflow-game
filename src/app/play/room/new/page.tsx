"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { catalog } from "@/features/game/content";
import { clientApi } from "@/lib/client-api";
import type { Room } from "@/features/game/rooms";

export default function NewRoomPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="display text-5xl">Open a private room</h1>
      <form
        className="mt-6 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void clientApi<{ room: Room }>("/api/rooms", {
            method: "POST",
            body: JSON.stringify({
              displayName: data.get("displayName"),
              avatarId: data.get("avatarId"),
              profileId: data.get("profileId"),
            }),
          })
            .then((body) => router.push(`/play/room/${body.room.code}`))
            .catch((reason: Error) => setError(reason.message));
        }}
      >
        <input name="displayName" required defaultValue="Ada" className="h-11 bg-paper px-3 text-ink" />
        <select name="avatarId" className="h-11 bg-paper px-3 text-ink" defaultValue="brass">
          <option value="brass">Brass</option>
          <option value="tide">Tide</option>
        </select>
        <select name="profileId" className="h-11 bg-paper px-3 text-ink" defaultValue="experienced">
          {catalog.profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>{profile.name}</option>
          ))}
        </select>
        <Button type="submit">Create the room</Button>
        {error && <p className="text-persimmon">{error}</p>}
      </form>
    </main>
  );
}
