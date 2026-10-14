import { catalog as defaultCatalog } from "./content";
import {
  applyCashChange,
  amortizeLoans,
  balanceSheet,
  cashRequired,
  moveSecurityPrices,
  netCashFlow,
  nonBridgeDebt,
  openingFromPlayer,
  passiveCoversExpenses,
  passiveIncome,
  positiveCashFlowAssetCount,
  previewPurchase,
  projectStatement,
  purchaseOffer,
  repayLiability,
  tickPauses,
  totalExpenses,
} from "./finance";
import { assertInvariants } from "./invariants";
import { nextPosition, randomAt, rollFaces } from "./random";
import { scorePlayer } from "./report";
import { RULES_VERSION } from "./types";
import type {
  ActionResult,
  CardOption,
  Catalog,
  Challenge,
  Difficulty,
  Effect,
  Ending,
  EventCard,
  GameAction,
  GameMode,
  GameState,
  Objective,
  PlayerState,
  Profile,
  RulesConfig,
  ScriptStep,
} from "./types";

export interface CreateGameInput {
  id: string;
  mode: GameMode;
  profileId: string;
  seed: number;
  now: string;
  players: { id: string; userId: string | null; displayName: string; avatarId: string; profileId?: string }[];
  challengeId?: string | null;
  difficulty?: Difficulty;
  shareScore?: boolean;
  startingPosition?: number;
  script?: ScriptStep[] | null;
}

const TUTORIAL_SCRIPT: ScriptStep[] = [
  { roll: 1, cardId: "tut-paycheck" },
  { roll: 2, cardId: "tut-maple" },
  { roll: 1, cardId: "tut-leak" },
  { roll: 2, cardId: "tut-goal" },
];

function rulesFor(difficulty: Difficulty, boardSpaces: number, maxTurns?: number): RulesConfig {
  const preset = {
    guided: { diceCount: 1, maxTurns: 24, expenseMultiplierBps: 10_000 },
    standard: { diceCount: 2, maxTurns: 18, expenseMultiplierBps: 10_000 },
    sharp: { diceCount: 2, maxTurns: 14, expenseMultiplierBps: 12_500 },
  }[difficulty];
  return {
    version: RULES_VERSION,
    diceCount: preset.diceCount,
    maxTurns: maxTurns ?? preset.maxTurns,
    expenseMultiplierBps: preset.expenseMultiplierBps,
    reserveMonthsForStrongWin: 3,
    bridgeCapMonths: 4,
    bridgeRateBps: 2400,
    boardSpaces,
  };
}

function materializeProfile(profile: Profile, playerId: string, position: number, identity: CreateGameInput["players"][number], order: number): PlayerState {
  const player: PlayerState = {
    id: playerId,
    userId: identity.userId,
    displayName: identity.displayName,
    avatarId: identity.avatarId,
    turnOrder: order,
    boardPosition: position,
    month: 1,
    isActive: order === 0,
    lifestyle: { ...profile.lifestyle },
    cashCents: profile.cashCents,
    assets: profile.assets.map((asset, index) => ({ ...asset, id: `${playerId}-opening-asset-${index}`, acquiredAtTurn: 0 })),
    liabilities: profile.liabilities.map((liability, index) => ({ ...liability, id: `${playerId}-opening-debt-${index}` })),
    ledger: [],
    cardCooldowns: {},
    insuranceTurnsRemaining: 0,
    communityGiftCents: 0,
    lessons: [],
    history: [],
    opening: {
      netWorthCents: 0,
      cashFlowCents: 0,
      cashCents: profile.cashCents,
      passiveIncomeCents: 0,
      totalDebtCents: 0,
      totalExpensesCents: 0,
    },
    finalScore: null,
  };
  player.opening = openingFromPlayer(player);
  return player;
}

export function createGame(input: CreateGameInput, library: Catalog = defaultCatalog): GameState {
  const challenge = input.challengeId ? library.challenges.find((item) => item.id === input.challengeId) ?? null : null;
  if (input.challengeId && !challenge) throw new Error("Unknown challenge");
  const mode: GameMode = input.mode;
  const difficulty: Difficulty = mode === "tutorial" ? "guided" : (challenge?.difficulty ?? input.difficulty ?? "standard");
  const script = mode === "tutorial" ? (input.script ?? TUTORIAL_SCRIPT) : null;
  const maxTurns = mode === "tutorial" ? (script?.length ?? 4) : challenge?.maxTurns;
  const rules = rulesFor(difficulty, library.board.length, maxTurns);
  const start = input.startingPosition ?? challenge?.startingPosition ?? 0;
  const players = input.players.map((identity, order) => {
    const profileId = challenge?.lockProfile && challenge.profileId ? challenge.profileId : (identity.profileId ?? input.profileId);
    const profile = library.profiles.find((item) => item.id === profileId);
    if (!profile) throw new Error("Unknown profile");
    return materializeProfile(profile, identity.id, start, identity, order);
  });
  if (players.length === 0) throw new Error("A game needs a player");
  const state: GameState = {
    rulesVersion: RULES_VERSION,
    id: input.id,
    mode,
    status: "active",
    ending: null,
    endingReason: null,
    seed: input.seed >>> 0,
    rngCursor: 0,
    turnNumber: 1,
    phase: "awaiting_roll",
    difficulty,
    rules,
    challengeId: challenge?.id ?? null,
    objective: mode === "tutorial" ? { type: "tutorial_finish" } : (challenge?.objective ?? null),
    script,
    scriptedDraws: challenge?.scriptedDraws ?? [],
    players,
    activePlayerIndex: 0,
    pending: null,
    processedKeys: [],
    events: [],
    createdAt: input.now,
    updatedAt: input.now,
    shareScore: input.shareScore ?? true,
  };
  assertInvariants(state);
  return state;
}

export function activePlayer(state: GameState): PlayerState {
  const player = state.players[state.activePlayerIndex];
  if (!player) throw new Error("No active player");
  return player;
}

export function cardEligible(card: EventCard, player: PlayerState): boolean {
  const until = player.cardCooldowns[card.id] ?? 0;
  if (until > player.month) return false;
  if (card.requiresAssetType && !player.assets.some((asset) => asset.assetType === card.requiresAssetType)) return false;
  if (card.minCashCents != null && player.cashCents < card.minCashCents) return false;
  return true;
}

function rejected(state: GameState, code: Extract<ActionResult, { ok: false }>["code"], message: string): ActionResult {
  return { ok: false, code, message, state };
}

function remember(state: GameState, key: string): GameState {
  return { ...state, processedKeys: [...state.processedKeys, key] };
}

function withPlayer(state: GameState, player: PlayerState): GameState {
  return { ...state, players: state.players.map((item) => (item.id === player.id ? player : item)) };
}

function pushEvent(state: GameState, event: Omit<GameState["events"][number], "id">): GameState {
  return {
    ...state,
    events: [...state.events, { ...event, id: `${state.id}-ev-${state.events.length + 1}` }],
  };
}

function finish(state: GameState, ending: Ending, reason: string, key: string): GameState {
  const players = state.players.map((player) => ({
    ...player,
    isActive: false,
    finalScore: scorePlayer(player, ending),
  }));
  return remember(
    {
      ...state,
      players,
      status: "completed",
      phase: "completed",
      ending,
      endingReason: reason,
      pending: state.pending,
    },
    key,
  );
}

function objectiveMet(state: GameState, player: PlayerState): boolean {
  const objective: Objective | null = state.objective;
  if (!objective || objective.type === "tutorial_finish") return false;
  const statement = projectStatement(player);
  const sheet = balanceSheet(player);
  switch (objective.type) {
    case "passive_income":
      return passiveIncome(statement) >= objective.targetCents;
    case "positive_assets":
      return positiveCashFlowAssetCount(player) >= objective.count;
    case "reduce_debt":
      return nonBridgeDebt(player) <= objective.maxPrincipalCents && player.cashCents >= objective.minCashCents;
    case "survive_turns":
      return player.month >= objective.turns && player.cashCents >= objective.minCashCents;
    case "net_worth_growth":
      return player.month <= objective.withinTurns && sheet.netWorthCents - player.opening.netWorthCents >= objective.growthCents;
    case "financial_independence":
      return passiveCoversExpenses(statement) && player.cashCents >= 0;
    default:
      return false;
  }
}

function drawCard(state: GameState, player: PlayerState, category: EventCard["category"], library: Catalog): { card: EventCard; cursor: number } {
  if (state.mode === "tutorial" && state.script) {
    const step = state.script[player.month - 1];
    const scripted = step ? library.cards.find((item) => item.id === step.cardId) : undefined;
    if (scripted) return { card: scripted, cursor: state.rngCursor };
  }
  const planned = state.scriptedDraws.find((item) => item.month === player.month);
  if (planned) {
    const card = library.cards.find((item) => item.id === planned.cardId);
    if (card && cardEligible(card, player)) return { card, cursor: state.rngCursor };
  }
  const deck = library.cards.filter((item) => item.category === category);
  const pool = deck.length > 0 ? deck : library.cards.filter((item) => item.id === library.fallbackCardId);
  const unit = randomAt(state.seed, state.rngCursor);
  const cursor = state.rngCursor + 1;
  const start = pool.length === 0 ? 0 : Math.floor(unit * pool.length);
  for (let offset = 0; offset < pool.length; offset += 1) {
    const card = pool[(start + offset) % pool.length];
    if (card && cardEligible(card, player)) return { card, cursor };
  }
  const fallback = library.cards.find((item) => item.id === library.fallbackCardId) ?? library.cards[0];
  if (!fallback) throw new Error("Card catalog is empty");
  return { card: fallback, cursor };
}

function scaleExpense(state: GameState, amount: number): number {
  return Math.round((amount * state.rules.expenseMultiplierBps) / 10_000);
}

function applyOption(
  state: GameState,
  player: PlayerState,
  option: CardOption,
  library: Catalog,
  key: string,
): { ok: true; player: PlayerState; distress?: string } | { ok: false; code: Extract<ActionResult, { ok: false }>["code"]; message: string } {
  const effect: Effect = option.effect;
  const turn = player.month;
  if (effect.type === "noop") return { ok: true, player };
  if (effect.type === "buy") {
    const offer = library.offers.find((item) => item.id === effect.offerId);
    if (!offer) return { ok: false, code: "OPPORTUNITY_UNAVAILABLE", message: "That opportunity is not in this edition." };
    const bought = purchaseOffer(player, offer, turn, key, effect.priceDiscountCents ?? 0);
    if (!bought.ok) {
      const code = bought.code === "ALREADY_OWNED" ? "OPPORTUNITY_UNAVAILABLE" : "INSUFFICIENT_FUNDS";
      return { ok: false, code, message: bought.message };
    }
    return { ok: true, player: bought.player };
  }
  if (effect.type === "expense") {
    if (effect.waivedIfInsured && player.insuranceTurnsRemaining > 0) return { ok: true, player };
    const capBase = Math.max(totalExpenses(projectStatement(player)), 1);
    const resolved = applyCashChange(player, -scaleExpense(state, effect.amountCents), {
      turnNumber: turn,
      idempotencyKey: key,
      description: effect.description,
      transactionType: "unexpected_expense",
      bridgeCapCents: capBase * state.rules.bridgeCapMonths,
      bridgeRateBps: state.rules.bridgeRateBps,
    });
    if (resolved.distress) return { ok: true, player: resolved.player, distress: resolved.reason ?? "Distress" };
    return { ok: true, player: resolved.player };
  }
  if (effect.type === "cash") {
    const resolved = applyCashChange(player, effect.deltaCents, {
      turnNumber: turn,
      idempotencyKey: key,
      description: effect.description,
      transactionType: effect.transactionType,
      bridgeCapCents: Math.max(totalExpenses(projectStatement(player)), 1) * state.rules.bridgeCapMonths,
      bridgeRateBps: state.rules.bridgeRateBps,
    });
    if (resolved.distress) return { ok: true, player: resolved.player, distress: resolved.reason ?? "Distress" };
    return { ok: true, player: resolved.player };
  }
  if (effect.type === "salary_delta") {
    if (player.cashCents < effect.costCents) {
      return { ok: false, code: "INSUFFICIENT_FUNDS", message: "The course costs more cash than you have." };
    }
    const paid = applyCashChange(player, -effect.costCents, {
      turnNumber: turn,
      idempotencyKey: key,
      description: effect.description,
      transactionType: "career_cost",
      bridgeCapCents: 0,
      bridgeRateBps: state.rules.bridgeRateBps,
    });
    if (effect.costCents > 0 && paid.distress) {
      return { ok: false, code: "INSUFFICIENT_FUNDS", message: "The course costs more cash than you have." };
    }
    const base = effect.costCents > 0 ? paid.player : player;
    return {
      ok: true,
      player: {
        ...base,
        lifestyle: { ...base.lifestyle, salaryCents: base.lifestyle.salaryCents + effect.deltaCents },
      },
    };
  }
  if (effect.type === "living_delta") {
    const next = {
      ...player,
      lifestyle: {
        ...player.lifestyle,
        livingExpenseCents: Math.max(0, player.lifestyle.livingExpenseCents + effect.deltaCents),
      },
      ledger: [...player.ledger],
    };
    next.ledger.push({
      id: `${player.id}-tx-${next.ledger.length + 1}`,
      transactionType: "lifestyle_change",
      amountCents: effect.deltaCents,
      description: effect.description,
      turnNumber: turn,
      idempotencyKey: key,
      accountDeltas: [{ account: "living_expenses", deltaCents: effect.deltaCents }],
    });
    return { ok: true, player: next };
  }
  if (effect.type === "pause_income") {
    const index = player.assets.findIndex((asset) => asset.assetType === effect.assetType);
    if (index < 0) return { ok: true, player };
    const assets = player.assets.map((asset, assetIndex) =>
      assetIndex === index ? { ...asset, incomePausedTurns: Math.max(asset.incomePausedTurns, effect.turns) } : { ...asset },
    );
    return { ok: true, player: { ...player, assets } };
  }
  if (effect.type === "market_move") {
    return {
      ok: true,
      player: moveSecurityPrices(player, effect.deltaBps, turn, key, effect.description),
    };
  }
  if (effect.type === "insure") {
    if (player.cashCents < effect.premiumCents) {
      return { ok: false, code: "INSUFFICIENT_FUNDS", message: "The premium is more cash than you have." };
    }
    const paid = applyCashChange(player, -effect.premiumCents, {
      turnNumber: turn,
      idempotencyKey: key,
      description: effect.description,
      transactionType: "insurance_premium",
      bridgeCapCents: 0,
      bridgeRateBps: state.rules.bridgeRateBps,
    });
    if (paid.distress) return { ok: false, code: "INSUFFICIENT_FUNDS", message: "The premium is more cash than you have." };
    return { ok: true, player: { ...paid.player, insuranceTurnsRemaining: paid.player.insuranceTurnsRemaining + effect.turns } };
  }
  if (effect.type === "charity") {
    if (player.cashCents < effect.amountCents) {
      return { ok: false, code: "INSUFFICIENT_FUNDS", message: "The gift is more cash than you have." };
    }
    const paid = applyCashChange(player, -effect.amountCents, {
      turnNumber: turn,
      idempotencyKey: key,
      description: effect.description,
      transactionType: "charity",
      bridgeCapCents: 0,
      bridgeRateBps: state.rules.bridgeRateBps,
    });
    if (paid.distress) return { ok: false, code: "INSUFFICIENT_FUNDS", message: "The gift is more cash than you have." };
    return { ok: true, player: { ...paid.player, communityGiftCents: paid.player.communityGiftCents + effect.amountCents } };
  }
  return { ok: false, code: "INVALID_TRANSACTION", message: "That choice is not available." };
}

function settle(state: GameState, player: PlayerState, key: string): { player: PlayerState; distress: string | null } {
  const statement = projectStatement(player);
  const flow = netCashFlow(statement);
  const amortized = amortizeLoans(player, player.month, `${key}:amort`);
  const cap = Math.max(totalExpenses(statement), 1) * state.rules.bridgeCapMonths;
  const resolved = applyCashChange(amortized, flow, {
    turnNumber: player.month,
    idempotencyKey: `${key}:settle`,
    description: "Month settled. Recurring income minus recurring expenses.",
    transactionType: "monthly_settlement",
    bridgeCapCents: cap,
    bridgeRateBps: state.rules.bridgeRateBps,
  });
  if (resolved.distress) return { player, distress: resolved.reason };
  const paused = tickPauses(resolved.player);
  const after = projectStatement(paused);
  const history = [
    ...paused.history,
    {
      turn: player.month,
      cashCents: paused.cashCents,
      netWorthCents: balanceSheet(paused).netWorthCents,
      cashFlowCents: netCashFlow(after),
      passiveIncomeCents: passiveIncome(after),
    },
  ];
  return { player: { ...paused, history }, distress: null };
}

function endingAfterTurn(state: GameState, player: PlayerState): { ending: Ending; reason: string } | null {
  if (objectiveMet(state, player)) {
    return { ending: "challenge_complete", reason: "The challenge objective was met." };
  }
  const statement = projectStatement(player);
  if (passiveCoversExpenses(statement) && player.cashCents >= 0) {
    const expenses = totalExpenses(statement);
    const strong = expenses === 0 ? player.cashCents > 0 : player.cashCents >= expenses * state.rules.reserveMonthsForStrongWin;
    return strong
      ? {
          ending: "independence_reserve",
          reason: "Passive income covers the month, and cash covers at least three months of expenses.",
        }
      : {
          ending: "financial_independence",
          reason: "Passive income covers monthly expenses and cash is not negative. The reserve is still thin.",
        };
  }
  if (state.mode === "tutorial" && state.script && player.month >= state.script.length) {
    return { ending: "tutorial_complete", reason: "The four teaching turns are finished." };
  }
  if (player.month >= state.rules.maxTurns) {
    const worth = balanceSheet(player).netWorthCents;
    if (worth > player.opening.netWorthCents) {
      return {
        ending: "net_worth_only",
        reason: "Net worth is higher than it started, and passive income still does not cover the month.",
      };
    }
    return { ending: "turn_limit", reason: "The month limit ended the game before independence." };
  }
  return null;
}

export function dispatch(state: GameState, action: GameAction, library: Catalog = defaultCatalog): ActionResult {
  if (!action.idempotencyKey) return rejected(state, "INVALID_TRANSACTION", "Missing idempotency key.");
  if (state.processedKeys.includes(action.idempotencyKey)) return { ok: true, state, duplicate: true };
  const player = state.players.find((item) => item.id === action.playerId);
  if (!player) return rejected(state, "NOT_ACTIVE_PLAYER", "That player is not in this game.");
  if (state.status === "completed" || state.phase === "completed") {
    return rejected(state, "INVALID_GAME_STATE", "This game is already over.");
  }
  if (player.id !== activePlayer(state).id) return rejected(state, "NOT_ACTIVE_PLAYER", "It is not your turn.");

  if (action.type === "roll") {
    if (state.phase !== "awaiting_roll") return rejected(state, "INVALID_GAME_STATE", "The dice were already rolled this turn.");
    let rolls: number[] = [];
    let cursor = state.rngCursor;
    if (state.mode === "tutorial" && state.script) {
      const step = state.script[player.month - 1];
      if (!step) return rejected(state, "INVALID_GAME_STATE", "The tutorial has no further turn.");
      rolls = [step.roll];
    } else {
      const rolled = rollFaces(state.seed, state.rngCursor, state.rules.diceCount);
      rolls = rolled.faces;
      cursor = rolled.cursor;
    }
    const total = rolls.reduce((sum, face) => sum + face, 0);
    const from = player.boardPosition;
    const to = nextPosition(from, total, library.board.length);
    const space = library.board.find((item) => item.position === to) ?? library.board[to];
    if (!space) return rejected(state, "INVALID_GAME_STATE", "The token left the board.");
    const drawn = drawCard({ ...state, rngCursor: cursor }, player, space.category, library);
    const moved: PlayerState = { ...player, boardPosition: to };
    let next = withPlayer({ ...state, rngCursor: drawn.cursor }, moved);
    next = {
      ...next,
      phase: "awaiting_decision",
      pending: { rolls, total, from, to, spaceId: space.id, cardId: drawn.card.id, optionId: null },
    };
    next = pushEvent(next, {
      playerId: player.id,
      eventCardId: drawn.card.id,
      eventType: "landed",
      turnNumber: player.month,
      payload: { roll: total, space: space.id },
    });
    next = remember(next, action.idempotencyKey);
    assertInvariants(next);
    return { ok: true, state: next, duplicate: false };
  }

  if (action.type === "decide") {
    if (state.phase !== "awaiting_decision" || !state.pending) {
      return rejected(state, "INVALID_GAME_STATE", "There is no open decision.");
    }
    const card = library.cards.find((item) => item.id === state.pending?.cardId);
    const option = card?.options.find((item) => item.id === action.optionId);
    if (!card || !option) return rejected(state, "INVALID_TRANSACTION", "That choice is not on the card.");
    const applied = applyOption(state, player, option, library, action.idempotencyKey);
    if (!applied.ok) return rejected(state, applied.code, applied.message);
    let decided = applied.player;
    if (!decided.lessons.includes(card.educationalExplanation)) {
      decided = { ...decided, lessons: [...decided.lessons, card.educationalExplanation] };
    }
    if (card.cooldownTurns) {
      decided = { ...decided, cardCooldowns: { ...decided.cardCooldowns, [card.id]: player.month + card.cooldownTurns } };
    }
    if (applied.distress) {
      let ended = withPlayer(state, decided);
      ended = pushEvent(ended, {
        playerId: player.id,
        eventCardId: card.id,
        eventType: "distress",
        turnNumber: player.month,
        payload: { option: option.id },
      });
      ended = finish(ended, "distress", applied.distress, action.idempotencyKey);
      assertInvariants(ended);
      return { ok: true, state: ended, duplicate: false };
    }
    let next = withPlayer(state, decided);
    next = {
      ...next,
      phase: "ready_to_end",
      pending: { ...state.pending, optionId: option.id },
    };
    next = pushEvent(next, {
      playerId: player.id,
      eventCardId: card.id,
      eventType: "decision",
      turnNumber: player.month,
      payload: { option: option.id },
    });
    next = remember(next, action.idempotencyKey);
    assertInvariants(next);
    return { ok: true, state: next, duplicate: false };
  }

  if (action.type === "repay") {
    if (state.phase === "awaiting_roll" || state.phase === "awaiting_decision" || state.phase === "ready_to_end") {
      const paid = repayLiability(player, action.liabilityId, action.amountCents, player.month, action.idempotencyKey);
      if (!paid.ok) return rejected(state, paid.code, paid.message);
      let next = withPlayer(state, paid.player);
      next = pushEvent(next, {
        playerId: player.id,
        eventCardId: state.pending?.cardId ?? null,
        eventType: "repay",
        turnNumber: player.month,
        payload: { liability: action.liabilityId, amount: action.amountCents },
      });
      next = remember(next, action.idempotencyKey);
      assertInvariants(next);
      return { ok: true, state: next, duplicate: false };
    }
    return rejected(state, "INVALID_GAME_STATE", "Debts cannot be paid after the game ends.");
  }

  if (state.phase !== "ready_to_end") {
    return rejected(state, "INVALID_GAME_STATE", "Resolve the space before ending the turn.");
  }
  const settled = settle(state, player, action.idempotencyKey);
  if (settled.distress) {
    let ended = withPlayer(state, settled.player);
    ended = finish(ended, "distress", settled.distress, action.idempotencyKey);
    assertInvariants(ended);
    return { ok: true, state: ended, duplicate: false };
  }
  const outcome = endingAfterTurn(state, settled.player);
  if (outcome) {
    let ended = withPlayer(state, settled.player);
    ended = pushEvent(ended, {
      playerId: player.id,
      eventCardId: state.pending?.cardId ?? null,
      eventType: "game_ended",
      turnNumber: player.month,
      payload: { ending: outcome.ending },
    });
    ended = finish(ended, outcome.ending, outcome.reason, action.idempotencyKey);
    assertInvariants(ended);
    return { ok: true, state: ended, duplicate: false };
  }
  const advanced: PlayerState = { ...settled.player, month: settled.player.month + 1, isActive: false };
  const nextIndex = (state.activePlayerIndex + 1) % state.players.length;
  let next = withPlayer(state, advanced);
  next = {
    ...next,
    players: next.players.map((item, index) => ({ ...item, isActive: index === nextIndex })),
    activePlayerIndex: nextIndex,
    phase: "awaiting_roll",
    pending: null,
  };
  next = { ...next, turnNumber: next.players[nextIndex]?.month ?? advanced.month };
  next = pushEvent(next, {
    playerId: player.id,
    eventCardId: state.pending?.cardId ?? null,
    eventType: "end_turn",
    turnNumber: player.month,
    payload: { cash: advanced.cashCents },
  });
  next = remember(next, action.idempotencyKey);
  assertInvariants(next);
  return { ok: true, state: next, duplicate: false };
}

export function offerPreview(state: GameState, offerId: string, library: Catalog = defaultCatalog, discount = 0) {
  const offer = library.offers.find((item) => item.id === offerId);
  if (!offer) return null;
  return { offer, preview: previewPurchase(activePlayer(state), offer, discount), cashRequiredCents: cashRequired(offer, discount) };
}

export function listChallenges(library: Catalog = defaultCatalog): Challenge[] {
  return library.challenges;
}

export function restoreGameState(input: unknown): GameState {
  if (!input || typeof input !== "object") throw new Error("Save is not a game");
  const state = input as GameState;
  assertInvariants(state);
  return state;
}
