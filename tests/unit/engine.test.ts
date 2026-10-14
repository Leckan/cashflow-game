import { describe, expect, it } from "vitest";
import { catalog } from "@/features/game/content";
import { cards } from "@/features/game/content/cards";
import { profiles } from "@/features/game/content/profiles";
import { activePlayer, cardEligible, createGame, dispatch, restoreGameState } from "@/features/game/engine";
import { balanceSheet, cashFromLedger, netCashFlow, projectStatement } from "@/features/game/finance";
import { assertInvariants } from "@/features/game/invariants";
import { nextPosition } from "@/features/game/random";
import { usd } from "@/features/game/money";
import type { Catalog, GameState } from "@/features/game/types";

const now = "2026-10-13T00:00:00.000Z";

function solo(profileId = "early-career", extra: Partial<Parameters<typeof createGame>[0]> = {}): GameState {
  return createGame({
    id: "game-1",
    mode: "solo",
    profileId,
    seed: 20261013,
    now,
    players: [{ id: "ada", userId: null, displayName: "Ada", avatarId: "tide" }],
    ...extra,
  });
}

function act(state: GameState, type: "roll" | "end_turn", key: string) {
  return dispatch(state, { type, idempotencyKey: key, playerId: "ada" });
}

describe("board and turns", () => {
  it("wraps the token around the board", () => {
    expect(nextPosition(30, 4, 32)).toBe(2);
    expect(nextPosition(0, 6, 32)).toBe(6);
    const game = createGame({
      id: "wrap",
      mode: "tutorial",
      profileId: "early-career",
      seed: 1,
      now,
      startingPosition: 30,
      script: [{ roll: 4, cardId: "quiet-review" }],
      players: [{ id: "ada", userId: null, displayName: "Ada", avatarId: "cedar" }],
    });
    const rolled = dispatch(game, { type: "roll", idempotencyKey: "r", playerId: "ada" });
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    expect(activePlayer(rolled.state).boardPosition).toBe(2);
  });

  it("refuses a second roll and an early end of turn", () => {
    const game = solo();
    const rolled = act(game, "roll", "roll-1");
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    const again = act(rolled.state, "roll", "roll-2");
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.code).toBe("INVALID_GAME_STATE");
    expect(again.state).toBe(rolled.state);
    const early = act(game, "end_turn", "end-early");
    expect(early.ok).toBe(false);
    if (early.ok) return;
    expect(early.code).toBe("INVALID_GAME_STATE");
  });

  it("does not let another player roll", () => {
    const game = createGame({
      id: "mp",
      mode: "multiplayer",
      profileId: "early-career",
      seed: 3,
      now,
      players: [
        { id: "ada", userId: null, displayName: "Ada", avatarId: "tide" },
        { id: "ben", userId: null, displayName: "Ben", avatarId: "plum" },
      ],
    });
    const stolen = dispatch(game, { type: "roll", idempotencyKey: "x", playerId: "ben" });
    expect(stolen.ok).toBe(false);
    if (stolen.ok) return;
    expect(stolen.code).toBe("NOT_ACTIVE_PLAYER");
  });

  it("keeps a rejected purchase from changing the statement", () => {
    let state = createGame({
      id: "tut",
      mode: "tutorial",
      profileId: "early-career",
      seed: 1,
      now,
      players: [{ id: "ada", userId: null, displayName: "Ada", avatarId: "fern" }],
    });
    const first = dispatch(state, { type: "roll", idempotencyKey: "r1", playerId: "ada" });
    if (!first.ok) throw new Error("roll");
    const ack = dispatch(first.state, { type: "decide", idempotencyKey: "d1", playerId: "ada", optionId: "acknowledge" });
    if (!ack.ok) throw new Error("ack");
    const ended = dispatch(ack.state, { type: "end_turn", idempotencyKey: "e1", playerId: "ada" });
    if (!ended.ok) throw new Error("end");
    state = ended.state;
    const second = dispatch(state, { type: "roll", idempotencyKey: "r2", playerId: "ada" });
    if (!second.ok) throw new Error("roll2");
    expect(second.state.pending?.cardId).toBe("tut-maple");
    const before = structuredClone(second.state);
    const bought = dispatch(second.state, { type: "decide", idempotencyKey: "buy", playerId: "ada", optionId: "buy" });
    expect(bought.ok).toBe(false);
    if (bought.ok) return;
    expect(bought.code).toBe("INSUFFICIENT_FUNDS");
    expect(bought.state).toBe(second.state);
    expect(bought.state).toEqual(before);
  });

  it("buys the duplex once, records the ledger, and ignores the duplicate request", () => {
    const game = createGame({
      id: "duplex",
      mode: "challenge",
      profileId: "early-career",
      challengeId: "duplex-on-the-table",
      seed: 9,
      now,
      players: [{ id: "ada", userId: null, displayName: "Ada", avatarId: "brass" }],
    });
    const rolled = dispatch(game, { type: "roll", idempotencyKey: "r", playerId: "ada" });
    if (!rolled.ok) throw new Error("roll");
    expect(rolled.state.pending?.cardId).toBe("deal-maple");
    const bought = dispatch(rolled.state, { type: "decide", idempotencyKey: "buy", playerId: "ada", optionId: "buy" });
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    const player = activePlayer(bought.state);
    expect(player.assets.some((asset) => asset.name === "Maple Street Duplex")).toBe(true);
    expect(player.liabilities.some((liability) => liability.liabilityType === "mortgage")).toBe(true);
    expect(player.cashCents).toBe(usd(10000));
    expect(player.ledger.some((entry) => entry.transactionType === "asset_purchase")).toBe(true);
    expect(cashFromLedger(player)).toBe(player.cashCents);
    const duplicate = dispatch(bought.state, { type: "decide", idempotencyKey: "buy", playerId: "ada", optionId: "buy" });
    expect(duplicate.ok).toBe(true);
    if (!duplicate.ok) return;
    expect(duplicate.duplicate).toBe(true);
    expect(activePlayer(duplicate.state).assets).toHaveLength(1);
    const ended = dispatch(bought.state, { type: "end_turn", idempotencyKey: "end", playerId: "ada" });
    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    expect(ended.state.ending).toBe("challenge_complete");
    expect(ended.state.status).toBe("completed");
  });

  it("replays a saved game and repeats a seeded month", () => {
    const first = solo("experienced");
    const second = solo("experienced");
    const a = dispatch(first, { type: "roll", idempotencyKey: "r", playerId: "ada" });
    const b = dispatch(second, { type: "roll", idempotencyKey: "r", playerId: "ada" });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.state.pending).toEqual(b.state.pending);
    expect(a.state.rngCursor).toBe(b.state.rngCursor);
    const restored = restoreGameState(JSON.parse(JSON.stringify(a.state)));
    expect(restored.pending?.total).toBe(a.state.pending?.total);
    expect(restored.players[0]?.cashCents).toBe(a.state.players[0]?.cashCents);
  });

  it("finishes the tutorial without spending the random cursor", () => {
    let state = createGame({
      id: "tutorial",
      mode: "tutorial",
      profileId: "early-career",
      seed: 99,
      now,
      players: [{ id: "ada", userId: null, displayName: "Ada", avatarId: "clay" }],
    });
    expect(state.rngCursor).toBe(0);
    for (let turn = 0; turn < 4; turn += 1) {
      const rolled = dispatch(state, { type: "roll", idempotencyKey: `r${turn}`, playerId: "ada" });
      if (!rolled.ok) throw new Error(rolled.message);
      const optionId = rolled.state.pending?.cardId === "tut-leak" ? "pay" : rolled.state.pending?.cardId === "tut-maple" ? "decline" : "acknowledge";
      const decided = dispatch(rolled.state, { type: "decide", idempotencyKey: `d${turn}`, playerId: "ada", optionId });
      if (!decided.ok) throw new Error(decided.message);
      const ended = dispatch(decided.state, { type: "end_turn", idempotencyKey: `e${turn}`, playerId: "ada" });
      if (!ended.ok) throw new Error(ended.message);
      state = ended.state;
    }
    expect(state.ending).toBe("tutorial_complete");
    expect(state.rngCursor).toBe(0);
    expect(state.players[0]?.lessons.length).toBeGreaterThan(0);
  });

  it("skips an ineligible card", () => {
    const vacancy = cards.find((card) => card.id === "vacancy-one");
    expect(vacancy).toBeTruthy();
    expect(cardEligible(vacancy!, activePlayer(solo()))).toBe(false);
  });
});

describe("hardship and playthrough", () => {
  function billCatalog(amount: number): Catalog {
    return {
      board: [0, 1, 2, 3].map((position) => ({
        id: `s${position}`,
        position,
        name: "Bill square",
        category: "unexpected" as const,
        summary: "A bill.",
        accent: "#d24b32",
      })),
      cards: [
        {
          id: "bill",
          category: "unexpected",
          title: "Bill",
          description: "A fictional bill.",
          educationalExplanation: "Cash first, borrowing second, and only up to a cap.",
          options: [
            {
              id: "pay",
              label: "Pay",
              detail: "Pay the bill.",
              effect: { type: "expense", amountCents: amount, description: "Fictional bill" },
            },
          ],
        },
      ],
      offers: [],
      profiles,
      challenges: [],
      fallbackCardId: "bill",
    };
  }

  it("bridges a bill that cash cannot cover", () => {
    const library = billCatalog(usd(6000));
    const game = createGame(
      {
        id: "bridge",
        mode: "solo",
        profileId: "early-career",
        seed: 1,
        now,
        players: [{ id: "ada", userId: null, displayName: "Ada", avatarId: "tide" }],
      },
      library,
    );
    const rolled = dispatch(game, { type: "roll", idempotencyKey: "r", playerId: "ada" }, library);
    if (!rolled.ok) throw new Error(rolled.message);
    const paid = dispatch(rolled.state, { type: "decide", idempotencyKey: "d", playerId: "ada", optionId: "pay" }, library);
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    const player = activePlayer(paid.state);
    expect(player.cashCents).toBe(0);
    const bridge = player.liabilities.find((liability) => liability.liabilityType === "bridge");
    expect(bridge?.principalBalanceCents).toBe(usd(1000));
  });

  it("enters distress instead of borrowing past the cap", () => {
    const library = billCatalog(usd(20000));
    const game = createGame(
      {
        id: "distress",
        mode: "solo",
        profileId: "early-career",
        seed: 1,
        now,
        players: [{ id: "ada", userId: null, displayName: "Ada", avatarId: "tide" }],
      },
      library,
    );
    const beforeCash = activePlayer(game).cashCents;
    const rolled = dispatch(game, { type: "roll", idempotencyKey: "r", playerId: "ada" }, library);
    if (!rolled.ok) throw new Error(rolled.message);
    const paid = dispatch(rolled.state, { type: "decide", idempotencyKey: "d", playerId: "ada", optionId: "pay" }, library);
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.state.ending).toBe("distress");
    expect(activePlayer(paid.state).cashCents).toBe(beforeCash);
  });

  it("plays a seeded game to an ending without breaking the ledger", () => {
    let state = solo("experienced", { difficulty: "standard" });
    for (let turn = 0; turn < 24 && state.status === "active"; turn += 1) {
      const rolled = dispatch(state, { type: "roll", idempotencyKey: `r${turn}`, playerId: "ada" });
      if (!rolled.ok) throw new Error(rolled.message);
      const card = catalog.cards.find((item) => item.id === rolled.state.pending?.cardId);
      const option = card?.options.find((item) => ["decline", "skip", "keep", "acknowledge"].includes(item.id)) ?? card?.options[0];
      if (!option) throw new Error("no option");
      const decided = dispatch(rolled.state, { type: "decide", idempotencyKey: `d${turn}`, playerId: "ada", optionId: option.id });
      if (!decided.ok) throw new Error(decided.message);
      if (decided.state.status === "completed") {
        state = decided.state;
        break;
      }
      const ended = dispatch(decided.state, { type: "end_turn", idempotencyKey: `e${turn}`, playerId: "ada" });
      if (!ended.ok) throw new Error(ended.message);
      state = ended.state;
      assertInvariants(state);
      const player = state.players[0]!;
      expect(player.cashCents).toBe(cashFromLedger(player));
      expect(balanceSheet(player).netWorthCents).toBe(balanceSheet(player).totalAssetsCents - balanceSheet(player).totalLiabilitiesCents);
    }
    expect(state.status).toBe("completed");
    expect(state.ending).toBeTruthy();
    expect(projectStatement(state.players[0]!).salaryCents).toBeGreaterThan(0);
    expect(netCashFlow(projectStatement(state.players[0]!))).toBeTypeOf("number");
  });
});
