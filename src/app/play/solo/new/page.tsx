"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useSyncExternalStore } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { catalog } from "@/features/game/content";
import { clientApi } from "@/lib/client-api";
import type { GameState } from "@/features/game/types";

const schema = z.object({
  displayName: z.string().trim().min(1).max(40),
  profileId: z.string().min(1),
  avatarId: z.string().min(1),
  difficulty: z.enum(["guided", "standard", "sharp"]),
  seed: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function clientMounted() {
  return true;
}

function NewGameGate() {
  const mounted = useSyncExternalStore(() => () => undefined, clientMounted, () => false);
  const params = useSearchParams();
  if (!mounted) return <p className="p-6">Preparing the profiles…</p>;
  return <NewGameForm challengeId={params.get("challenge") ?? undefined} />;
}

function NewGameForm({ challengeId }: { challengeId?: string }) {
  const router = useRouter();
  const challenge = catalog.challenges.find((item) => item.id === challengeId);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: "Ada",
      profileId: challenge?.profileId ?? "early-career",
      avatarId: "tide",
      difficulty: challenge?.difficulty ?? "standard",
      seed: "",
    },
  });
  const profileId = useWatch({ control: form.control, name: "profileId" });

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="display text-5xl">{challenge ? challenge.title : "New solo game"}</h1>
      <p className="mt-3 leading-7 text-paper/80">{challenge?.description ?? "These profiles are teaching sketches, not averages."}</p>
      <form
        className="mt-6 grid gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          try {
            const body = await clientApi<{ state: GameState }>("/api/games", {
              method: "POST",
              body: JSON.stringify({
                mode: challenge ? "challenge" : "solo",
                profileId: challenge?.lockProfile && challenge.profileId ? challenge.profileId : values.profileId,
                challengeId: challenge?.id,
                difficulty: values.difficulty,
                displayName: values.displayName,
                avatarId: values.avatarId,
                seed: values.seed ? Number(values.seed) : undefined,
              }),
            });
            router.push(`/play/solo/${body.state.id}`);
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not start.");
          }
        })}
      >
        <label className="grid gap-1 text-sm">
          Name
          <input data-testid="display-name" className="h-11 bg-paper px-3 text-ink" {...form.register("displayName")} />
        </label>
        <label className="grid gap-1 text-sm">
          Starting profile
          <select data-testid="profile-select" className="h-11 bg-paper px-3 text-ink" disabled={Boolean(challenge?.lockProfile)} {...form.register("profileId")}>
            {catalog.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Token
          <select className="h-11 bg-paper px-3 text-ink" {...form.register("avatarId")}>
            {["tide", "cedar", "brass", "plum", "fern", "clay"].map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Difficulty
          <select className="h-11 bg-paper px-3 text-ink" {...form.register("difficulty")}>
            <option value="guided">Guided, one die</option>
            <option value="standard">Standard, two dice</option>
            <option value="sharp">Sharp, larger bills</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Seed, optional
          <input className="h-11 bg-paper px-3 text-ink" {...form.register("seed")} inputMode="numeric" />
        </label>
        {catalog.profiles.find((profile) => profile.id === profileId)?.note && (
          <p className="text-sm leading-6 text-paper/75">{catalog.profiles.find((profile) => profile.id === profileId)?.note}</p>
        )}
        <Button type="submit" data-testid="start-game">Sit down</Button>
        {error && <p className="text-persimmon">{error}</p>}
      </form>
    </main>
  );
}

export default function NewSoloPage() {
  return (
    <Suspense fallback={<p className="p-6">Preparing the profiles…</p>}>
      <NewGameGate />
    </Suspense>
  );
}
