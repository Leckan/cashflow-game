import { createGame, dispatch, type CreateGameInput } from "./engine";
import type { Catalog, GameAction, GameErrorCode, GameState } from "./types";

export interface RoomMember {
  playerId: string;
  userId: string | null;
  displayName: string;
  avatarId: string;
  profileId: string;
  connected: boolean;
}

export interface Room {
  id: string;
  code: string;
  hostPlayerId: string;
  visibility: "private";
  status: "lobby" | "playing" | "finished";
  maxPlayers: number;
  members: RoomMember[];
  game: GameState | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

type RoomResult = { ok: true; room: Room } | { ok: false; code: GameErrorCode; message: string; room: Room };

function roomFail(room: Room, code: Extract<RoomResult, { ok: false }>["code"], message: string): RoomResult {
  return { ok: false, code, message, room };
}

export function createRoom(input: {
  id: string;
  code: string;
  host: RoomMember;
  now: string;
  maxPlayers?: number;
}): Room {
  return {
    id: input.id,
    code: input.code,
    hostPlayerId: input.host.playerId,
    visibility: "private",
    status: "lobby",
    maxPlayers: input.maxPlayers ?? 4,
    members: [{ ...input.host, connected: true }],
    game: null,
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function joinRoom(room: Room, member: RoomMember, now: string): RoomResult {
  if (room.status !== "lobby") return roomFail(room, "INVALID_GAME_STATE", "This room has already started.");
  const existing = room.members.find((item) => item.playerId === member.playerId);
  if (existing) {
    return {
      ok: true,
      room: {
        ...room,
        updatedAt: now,
        members: room.members.map((item) => (item.playerId === member.playerId ? { ...item, connected: true } : item)),
      },
    };
  }
  if (room.members.length >= room.maxPlayers) return roomFail(room, "INVALID_GAME_STATE", "The room is full.");
  return {
    ok: true,
    room: { ...room, updatedAt: now, version: room.version + 1, members: [...room.members, { ...member, connected: true }] },
  };
}

export function reconnectRoom(room: Room, playerId: string, now: string): RoomResult {
  const member = room.members.find((item) => item.playerId === playerId);
  if (!member) return roomFail(room, "NOT_A_MEMBER", "That player is not in this room.");
  return {
    ok: true,
    room: {
      ...room,
      updatedAt: now,
      members: room.members.map((item) => (item.playerId === playerId ? { ...item, connected: true } : item)),
    },
  };
}

export function startRoom(room: Room, actorId: string, now: string, library?: Catalog): RoomResult {
  if (actorId !== room.hostPlayerId) return roomFail(room, "NOT_ACTIVE_PLAYER", "Only the host can start.");
  if (room.status !== "lobby") return roomFail(room, "INVALID_GAME_STATE", "The room is not in the lobby.");
  if (room.members.length < 2) return roomFail(room, "INVALID_GAME_STATE", "Invite at least one more player.");
  const input: CreateGameInput = {
    id: room.id,
    mode: "multiplayer",
    profileId: room.members[0]?.profileId ?? "early-career",
    seed: Number.parseInt(room.code.replace(/\D/g, "").slice(0, 9) || "1", 10),
    now,
    challengeId: null,
    players: room.members.map((member) => ({
      id: member.playerId,
      userId: member.userId,
      displayName: member.displayName,
      avatarId: member.avatarId,
      profileId: member.profileId,
    })),
  };
  const game = createGame(input, library);
  return {
    ok: true,
    room: { ...room, status: "playing", game, version: room.version + 1, updatedAt: now },
  };
}

export function actInRoom(room: Room, actorId: string, action: GameAction, now: string, library?: Catalog): RoomResult {
  if (!room.members.some((member) => member.playerId === actorId)) {
    return roomFail(room, "NOT_A_MEMBER", "Join the room before taking a turn.");
  }
  if (room.status !== "playing" || !room.game) return roomFail(room, "INVALID_GAME_STATE", "The game has not started.");
  if (action.playerId !== actorId) return roomFail(room, "NOT_ACTIVE_PLAYER", "You cannot act for another player.");
  const result = dispatch(room.game, action, library);
  if (!result.ok) return { ok: false, code: result.code, message: result.message, room };
  const finished = result.state.status === "completed";
  return {
    ok: true,
    room: {
      ...room,
      game: result.state,
      status: finished ? "finished" : "playing",
      version: result.duplicate ? room.version : room.version + 1,
      updatedAt: now,
    },
  };
}

export function publicPlayerStats(state: GameState) {
  return state.players.map((player) => ({
    playerId: player.id,
    displayName: player.displayName,
    avatarId: player.avatarId,
    boardPosition: player.boardPosition,
    cashCents: player.cashCents,
    month: player.month,
    isActive: player.isActive,
    assetCount: player.assets.length,
  }));
}
