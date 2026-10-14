export function playCue(kind: "dice" | "move" | "card" | "buy" | "turn", volume: number, muted: boolean) {
  if (muted || typeof window === "undefined") return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const pitch = { dice: 160, move: 280, card: 360, buy: 520, turn: 220 }[kind];
  oscillator.type = kind === "dice" ? "triangle" : "sine";
  oscillator.frequency.value = pitch;
  gain.gain.value = Math.max(0, Math.min(0.2, volume * 0.08));
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.12);
  oscillator.onended = () => void context.close();
}
