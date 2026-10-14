import { describe, expect, it } from "vitest";
import { actInRoom, createRoom, joinRoom, reconnectRoom, startRoom } from "@/features/game/rooms";
import { usd } from "@/features/game/money";

const now = "2026-10-13T00:00:00.000Z";

function member(playerId: string, name: string) {
  return { playerId, userId: null, displayName: name, avatarId: "tide", profileId: "early-career", connected: true };
}

describe("multiplayer rooms", () => {
  it("starts only for the host and rejects the other player's roll", () => {
    let room = createRoom({ id: "room-1", code: "HARBOR", host: member("ada", "Ada"), now });
    const joined = joinRoom(room, member("ben", "Ben"), now);
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    room = joined.room;
    const denied = startRoom(room, "ben", now);
    expect(denied.ok).toBe(false);
    const started = startRoom(room, "ada", now);
    expect(started.ok).toBe(true);
    if (!started.ok || !started.room.game) return;
    const stolen = actInRoom(started.room, "ben", { type: "roll", idempotencyKey: "r", playerId: "ben" }, now);
    expect(stolen.ok).toBe(false);
    if (stolen.ok) return;
    expect(stolen.code).toBe("NOT_ACTIVE_PLAYER");
    const rolled = actInRoom(started.room, "ada", { type: "roll", idempotencyKey: "r", playerId: "ada" }, now);
    expect(rolled.ok).toBe(true);
    if (!rolled.ok || !rolled.room.game) return;
    const duplicate = actInRoom(rolled.room, "ada", { type: "roll", idempotencyKey: "r", playerId: "ada" }, now);
    expect(duplicate.ok).toBe(true);
    if (!duplicate.ok || !duplicate.room.game) return;
    expect(duplicate.room.version).toBe(rolled.room.version);
    expect(duplicate.room.game.players[0]?.boardPosition).toBe(rolled.room.game.players[0]?.boardPosition);
  });

  it("reconnects a member and refuses a stranger", () => {
    const room = createRoom({ id: "room-2", code: "MAPLE1", host: member("ada", "Ada"), now });
    const back = reconnectRoom(room, "ada", now);
    expect(back.ok).toBe(true);
    const stranger = reconnectRoom(room, "nope", now);
    expect(stranger.ok).toBe(false);
    if (stranger.ok) return;
    expect(stranger.code).toBe("NOT_A_MEMBER");
  });

  it("serializes two purchases so the second cannot spend the same cash", async () => {
    const { createGame, dispatch } = await import("@/features/game/engine");
    const { createKeyedLock } = await import("@/server/lock");
    const library = {
      ...(await import("@/features/game/content")).catalog,
    };
    let state = createGame(
      {
        id: "race",
        mode: "challenge",
        profileId: "bonus-year-saver",
        challengeId: "duplex-on-the-table",
        seed: 1,
        now,
        players: [{ id: "ada", userId: null, displayName: "Ada", avatarId: "tide" }],
      },
      library,
    );
    const rolled = dispatch(state, { type: "roll", idempotencyKey: "roll", playerId: "ada" }, library);
    if (!rolled.ok) throw new Error(rolled.message);
    state = rolled.state;
    const lock = createKeyedLock();
    const buy = (key: string) =>
      lock("race", async () => {
        await Promise.resolve();
        const result = dispatch(state, { type: "decide", idempotencyKey: key, playerId: "ada", optionId: "buy" }, library);
        if (result.ok) state = result.state;
        return result;
      });
    const [first, second] = await Promise.all([buy("buy-a"), buy("buy-b")]);
    const successes = [first, second].filter((result) => result.ok);
    expect(successes).toHaveLength(1);
    expect(state.players[0]?.assets).toHaveLength(1);
    expect(state.players[0]?.cashCents).toBe(usd(10000));
  });
});
