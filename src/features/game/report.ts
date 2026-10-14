import {
  balanceSheet,
  debtToAssetRatio,
  emergencyReserveMonths,
  netCashFlow,
  passiveIncome,
  projectStatement,
  totalExpenses,
  unrealizedGainCents,
} from "./finance";
import { formatMoney } from "./money";
import type { Ending, GameState, PlayerState } from "./types";

export interface GameReport {
  playerId: string;
  displayName: string;
  ending: Ending | null;
  endingReason: string | null;
  startingNetWorthCents: number;
  endingNetWorthCents: number;
  startingCashFlowCents: number;
  endingCashFlowCents: number;
  startingPassiveIncomeCents: number;
  endingPassiveIncomeCents: number;
  passiveIncomeChangeCents: number;
  assetsAcquired: string[];
  debtChangeCents: number;
  endingCashCents: number;
  reserveMonths: number | null;
  riskScore: number;
  score: number;
  largestInflow: { description: string; amountCents: number } | null;
  largestOutflow: { description: string; amountCents: number } | null;
  decisions: { turn: number; description: string; amountCents: number }[];
  lessons: string[];
  formulas: string[];
}

export function riskScore(player: PlayerState): number {
  const statement = projectStatement(player);
  const sheet = balanceSheet(player);
  const reserve = emergencyReserveMonths(player, statement);
  let score = 0;
  if (reserve != null && reserve >= 3) score += 40;
  else if (reserve != null && reserve >= 1) score += 20;
  if (!player.liabilities.some((liability) => liability.liabilityType === "bridge")) score += 30;
  const ratio = debtToAssetRatio(sheet);
  if (ratio == null || ratio < 0.5) score += 20;
  const kinds = new Set(player.assets.map((asset) => asset.assetType));
  if (kinds.size >= 2) score += 10;
  return Math.min(100, score);
}

export function scorePlayer(player: PlayerState, ending: Ending | null): number {
  const sheet = balanceSheet(player);
  const statement = projectStatement(player);
  const worthDelta = sheet.netWorthCents - player.opening.netWorthCents;
  const reserve = emergencyReserveMonths(player, statement);
  const reserveMonths = reserve == null ? 12 : reserve;
  const bridge = player.liabilities
    .filter((liability) => liability.liabilityType === "bridge")
    .reduce((sum, liability) => sum + liability.principalBalanceCents, 0);
  const bonus =
    ending === "independence_reserve" ? 800_000 : ending === "financial_independence" ? 500_000 : ending === "challenge_complete" ? 200_000 : 0;
  const raw =
    Math.round(worthDelta / 100) +
    Math.round(passiveIncome(statement) / 10) +
    Math.round(reserveMonths * 500) -
    Math.round(bridge / 50) +
    bonus;
  return Math.max(0, raw);
}

export function buildReport(state: GameState, playerId: string): GameReport {
  const player = state.players.find((item) => item.id === playerId) ?? state.players[0];
  const statement = projectStatement(player);
  const sheet = balanceSheet(player);
  const inflows = player.ledger
    .map((entry) => ({ entry, cash: entry.accountDeltas.find((delta) => delta.account === "cash")?.deltaCents ?? 0 }))
    .filter((item) => item.cash > 0)
    .sort((a, b) => b.cash - a.cash);
  const outflows = player.ledger
    .map((entry) => ({ entry, cash: entry.accountDeltas.find((delta) => delta.account === "cash")?.deltaCents ?? 0 }))
    .filter((item) => item.cash < 0)
    .sort((a, b) => a.cash - b.cash);
  const acquired = player.assets.filter((asset) => asset.acquiredAtTurn > 0).map((asset) => asset.name);
  return {
    playerId: player.id,
    displayName: player.displayName,
    ending: state.ending,
    endingReason: state.endingReason,
    startingNetWorthCents: player.opening.netWorthCents,
    endingNetWorthCents: sheet.netWorthCents,
    startingCashFlowCents: player.opening.cashFlowCents,
    endingCashFlowCents: netCashFlow(statement),
    startingPassiveIncomeCents: player.opening.passiveIncomeCents,
    endingPassiveIncomeCents: passiveIncome(statement),
    passiveIncomeChangeCents: passiveIncome(statement) - player.opening.passiveIncomeCents,
    assetsAcquired: acquired,
    debtChangeCents: sheet.totalLiabilitiesCents - player.opening.totalDebtCents,
    endingCashCents: player.cashCents,
    reserveMonths: emergencyReserveMonths(player, statement),
    riskScore: riskScore(player),
    score: player.finalScore ?? scorePlayer(player, state.ending),
    largestInflow: inflows[0] ? { description: inflows[0].entry.description, amountCents: inflows[0].cash } : null,
    largestOutflow: outflows[0] ? { description: outflows[0].entry.description, amountCents: outflows[0].cash } : null,
    decisions: player.ledger
      .filter((entry) => entry.transactionType !== "loan_amortization" && entry.transactionType !== "monthly_settlement")
      .map((entry) => ({ turn: entry.turnNumber, description: entry.description, amountCents: entry.amountCents })),
    lessons: player.lessons,
    formulas: [
      `Net worth = assets − liabilities = ${formatMoney(sheet.totalAssetsCents)} − ${formatMoney(sheet.totalLiabilitiesCents)} = ${formatMoney(sheet.netWorthCents)}.`,
      `Monthly cash flow = income − expenses = ${formatMoney(statement.salaryCents + statement.otherEarnedCents + statement.businessIncomeCents + statement.rentalIncomeCents + statement.investmentIncomeCents)} − ${formatMoney(totalExpenses(statement))} = ${formatMoney(netCashFlow(statement))}.`,
      `Passive income = rental + passive business + distributions = ${formatMoney(passiveIncome(statement))}. Salary is excluded.`,
      `Unrealized price change on assets = ${formatMoney(unrealizedGainCents(player))}. It is not cash.`,
      "A property is counted once as an asset. Its loan is counted once as a liability. Equity is the difference, not a third pile.",
      "Score uses the change in net worth, passive income, reserve months, hardship borrowing, and the ending. It is a game score.",
    ],
  };
}
