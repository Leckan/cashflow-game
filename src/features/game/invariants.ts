import { cashFromLedger } from "./finance";
import { RULES_VERSION, type GameState } from "./types";

function assertInt(value: number, label: string): void {
  if (!Number.isInteger(value)) throw new Error(`${label} must be integer cents`);
}

export function assertInvariants(state: GameState): void {
  if (state.rulesVersion !== RULES_VERSION || state.rules.version !== RULES_VERSION) {
    throw new Error("Rules version does not match this build");
  }
  if (state.activePlayerIndex < 0 || state.activePlayerIndex >= state.players.length) {
    throw new Error("Active player is out of range");
  }
  if (new Set(state.processedKeys).size !== state.processedKeys.length) {
    throw new Error("Duplicate idempotency keys");
  }
  if (state.phase === "awaiting_roll" && state.pending) throw new Error("A roll is still pending");
  if (state.phase === "awaiting_decision" && (!state.pending || state.pending.optionId)) {
    throw new Error("Decision phase is missing an open event");
  }
  if (state.phase === "ready_to_end" && (!state.pending || !state.pending.optionId)) {
    throw new Error("Turn is ready to end without a resolved event");
  }
  if (state.phase === "completed" && state.status !== "completed") throw new Error("Completed phase without completed status");
  for (const player of state.players) {
    assertInt(player.cashCents, "cash");
    if (player.cashCents < 0) throw new Error("Cash cannot be negative");
    if (player.boardPosition < 0 || player.boardPosition >= state.rules.boardSpaces) {
      throw new Error("Token is off the board");
    }
    const replayed = cashFromLedger(player);
    if (replayed !== player.cashCents) {
      throw new Error(`Cash ${player.cashCents} does not match the ledger ${replayed}`);
    }
    const ledgerIds = player.ledger.map((entry) => entry.id);
    if (new Set(ledgerIds).size !== ledgerIds.length) throw new Error("Duplicate ledger ids");
    for (const entry of player.ledger) {
      assertInt(entry.amountCents, entry.id);
      for (const delta of entry.accountDeltas) assertInt(delta.deltaCents, entry.id);
    }
    for (const asset of player.assets) {
      assertInt(asset.currentValueCents, asset.name);
      assertInt(asset.recurringIncomeCents, asset.name);
    }
    for (const liability of player.liabilities) {
      assertInt(liability.principalBalanceCents, liability.name);
      if (liability.principalBalanceCents < 0) throw new Error("Principal cannot be negative");
    }
  }
}
