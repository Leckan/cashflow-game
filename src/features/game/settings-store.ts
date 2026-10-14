"use client";

import { create } from "zustand";

export interface Settings {
  quality: "low" | "high";
  muted: boolean;
  volume: number;
  reducedMotion: boolean;
  flatView: boolean;
  hydrate: () => void;
  update: (partial: Partial<Omit<Settings, "hydrate" | "update">>) => void;
}

const storageKey = "wealthquest-settings";

export const useSettings = create<Settings>((set, get) => ({
  quality: "high",
  muted: false,
  volume: 0.5,
  reducedMotion: false,
  flatView: false,
  hydrate: () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Partial<Settings>;
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      set({
        quality: saved.quality ?? (coarse ? "low" : "high"),
        muted: saved.muted ?? false,
        volume: saved.volume ?? 0.5,
        reducedMotion: saved.reducedMotion ?? motion,
        flatView: saved.flatView ?? false,
      });
    } catch {
      set({ reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches });
    }
  },
  update: (partial) => {
    set(partial);
    const next = get();
    localStorage.setItem(
      storageKey,
      JSON.stringify({ quality: next.quality, muted: next.muted, volume: next.volume, reducedMotion: next.reducedMotion, flatView: next.flatView }),
    );
  },
}));
