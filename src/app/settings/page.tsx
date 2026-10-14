"use client";

import { useEffect } from "react";
import { useSettings } from "@/features/game/settings-store";

export default function SettingsPage() {
  const settings = useSettings();
  useEffect(() => {
    useSettings.getState().hydrate();
  }, []);
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="display text-5xl">Table settings</h1>
      <div className="mt-6 grid gap-4 text-sm">
        <label className="flex items-center justify-between gap-4">
          Rendering
          <select className="h-10 bg-paper px-2 text-ink" value={settings.quality} onChange={(event) => settings.update({ quality: event.target.value as "low" | "high" })}>
            <option value="high">Detailed</option>
            <option value="low">Lighter</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-4">
          Flat table
          <input type="checkbox" checked={settings.flatView} onChange={(event) => settings.update({ flatView: event.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-4">
          Reduce motion
          <input type="checkbox" checked={settings.reducedMotion} onChange={(event) => settings.update({ reducedMotion: event.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-4">
          Mute
          <input type="checkbox" checked={settings.muted} onChange={(event) => settings.update({ muted: event.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-4">
          Volume
          <input type="range" min={0} max={1} step={0.1} value={settings.volume} onChange={(event) => settings.update({ volume: Number(event.target.value) })} />
        </label>
      </div>
    </main>
  );
}
