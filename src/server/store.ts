import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { dispatch } from "@/features/game/engine";
import { scorePlayer } from "@/features/game/report";
import type { GameAction, GameState } from "@/features/game/types";
import type { Room } from "@/features/game/rooms";
import { createKeyedLock } from "@/server/lock";
import { projectGame } from "@/server/project";

const lock = createKeyedLock();

export interface PlayerProfile {
  id: string;
  displayName: string;
  avatarId: string;
  email: string | null;
}

export interface GameRecord {
  ownerId: string;
  state: GameState;
}

export interface LeaderboardEntry {
  gameId: string;
  displayName: string;
  score: number;
  ending: string | null;
  mode: string;
  completedAt: string;
}

function root() {
  return process.env.GAME_DATA_DIR ?? path.join(process.cwd(), ".data");
}

async function ensure(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function writeJson(file: string, value: unknown) {
  await ensure(path.dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value));
  await rename(tmp, file);
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function canAccess(record: GameRecord, identityId: string) {
  return record.ownerId === identityId || record.state.players.some((player) => player.id === identityId || player.userId === identityId);
}

export async function readProfile(id: string) {
  return readJson<PlayerProfile>(path.join(root(), "players", `${id}.json`));
}

export async function writeProfile(profile: PlayerProfile) {
  await writeJson(path.join(root(), "players", `${profile.id}.json`), profile);
}

export async function readGame(id: string) {
  return readJson<GameRecord>(path.join(root(), "games", `${id}.json`));
}

async function writeGame(record: GameRecord) {
  await writeJson(path.join(root(), "games", `${record.state.id}.json`), record);
  if (record.state.status === "completed" && record.state.shareScore) {
    await rememberScore(record.state);
  }
  try {
    await projectGame(record.ownerId, record.state);
  } catch (error) {
    console.error("Database projection skipped:", error instanceof Error ? error.message : "unknown error");
  }
}

async function rememberScore(state: GameState) {
  const file = path.join(root(), "leaderboard.json");
  const current = (await readJson<LeaderboardEntry[]>(file)) ?? [];
  if (current.some((entry) => entry.gameId === state.id)) return;
  const player = state.players[0];
  if (!player) return;
  current.unshift({
    gameId: state.id,
    displayName: player.displayName,
    score: player.finalScore ?? scorePlayer(player, state.ending),
    ending: state.ending,
    mode: state.mode,
    completedAt: state.updatedAt,
  });
  await writeJson(file, current.slice(0, 100));
}

export async function listGames(ownerId: string) {
  const dir = path.join(root(), "games");
  await ensure(dir);
  const files = await readdir(dir);
  const games: GameRecord[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const record = await readJson<GameRecord>(path.join(dir, file));
    if (record && canAccess(record, ownerId)) games.push(record);
  }
  return games.sort((a, b) => (a.state.updatedAt < b.state.updatedAt ? 1 : -1));
}

export async function createGameRecord(ownerId: string, state: GameState) {
  await writeGame({ ownerId, state: { ...state, updatedAt: new Date().toISOString() } });
}

export async function mutateGame(id: string, identityId: string, action: GameAction) {
  return lock(`game:${id}`, async () => {
    const record = await readGame(id);
    if (!record || !canAccess(record, identityId)) {
      return { ok: false as const, code: "GAME_NOT_FOUND" as const, message: "No game with that id.", state: null };
    }
    const result = dispatch(record.state, { ...action, playerId: identityId });
    if (result.ok && !result.duplicate) {
      const updated = { ...result.state, updatedAt: new Date().toISOString() };
      await writeGame({ ownerId: record.ownerId, state: updated });
      return { ...result, state: updated };
    }
    return result;
  });
}

export async function deleteOwnedGames(ownerId: string) {
  const games = await listGames(ownerId);
  await Promise.all(games.filter((game) => game.ownerId === ownerId).map((game) => rm(path.join(root(), "games", `${game.state.id}.json`), { force: true })));
  await rm(path.join(root(), "players", `${ownerId}.json`), { force: true });
}

export async function readLeaderboard() {
  return (await readJson<LeaderboardEntry[]>(path.join(root(), "leaderboard.json"))) ?? [];
}

export async function readRoom(code: string) {
  return readJson<Room>(path.join(root(), "rooms", `${code}.json`));
}

export async function writeRoom(room: Room) {
  await writeJson(path.join(root(), "rooms", `${room.code}.json`), room);
}

export async function mutateRoom<T>(code: string, task: (room: Room | null) => Promise<{ room: Room | null; result: T }>): Promise<T> {
  return lock(`room:${code}`, async () => {
    const current = await readRoom(code);
    const { room, result } = await task(current);
    if (room) await writeRoom(room);
    return result;
  });
}

export function multiplayerEnabled() {
  return process.env.NEXT_PUBLIC_MULTIPLAYER_ENABLED !== "false";
}
