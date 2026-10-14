export const avatars = [
  { id: "cedar", label: "Cedar", color: "#c46b3a" },
  { id: "tide", label: "Tide", color: "#2a6f8f" },
  { id: "brass", label: "Brass", color: "#b8893a" },
  { id: "plum", label: "Plum", color: "#6d4c7d" },
  { id: "fern", label: "Fern", color: "#1f8a5b" },
  { id: "clay", label: "Clay", color: "#d24b32" },
] as const;

export function avatarColor(id: string): string {
  return avatars.find((avatar) => avatar.id === id)?.color ?? "#b8893a";
}
