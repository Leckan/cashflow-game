/** Mulberry32. Same seed and cursor always produce the same sequence. */
export function randomAt(seed: number, index: number): number {
  let a = seed >>> 0;
  for (let i = 0; i <= index; i += 1) {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    a = t >>> 0;
  }
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}

export function rollFaces(seed: number, cursor: number, diceCount: number): { faces: number[]; cursor: number } {
  const faces: number[] = [];
  let next = cursor;
  for (let i = 0; i < diceCount; i += 1) {
    const unit = randomAt(seed, next);
    next += 1;
    faces.push(1 + Math.floor(unit * 6));
  }
  return { faces, cursor: next };
}

export function nextPosition(position: number, steps: number, length: number): number {
  if (length <= 0) throw new Error("Board length must be positive");
  const normalized = ((position % length) + length) % length;
  const travel = ((steps % length) + length) % length;
  return (normalized + travel) % length;
}

export function pathBetween(from: number, to: number, length: number): number[] {
  const steps: number[] = [];
  let cursor = from;
  while (cursor !== to && steps.length < length) {
    cursor = (cursor + 1) % length;
    steps.push(cursor);
  }
  return steps;
}

export function boardPoint(index: number, radius = 1): { x: number; z: number } {
  const perSide = 8;
  const side = Math.floor(index / perSide) % 4;
  const idx = index % perSide;
  const u = (idx / (perSide - 1)) * 2 - 1;
  if (side === 0) return { x: u * radius, z: radius };
  if (side === 1) return { x: radius, z: -u * radius };
  if (side === 2) return { x: -u * radius, z: -radius };
  return { x: -radius, z: u * radius };
}
