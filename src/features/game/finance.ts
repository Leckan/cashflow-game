import { roundHalfAwayFromZero, type Cents } from "./money";
import type {
  Asset,
  BalanceSheet,
  IncomeStatement,
  LedgerEntry,
  Liability,
  Offer,
  PlayerState,
  PurchasePreview,
} from "./types";

export function monthlyInterestCents(principalCents: Cents, annualRateBps: number): Cents {
  if (principalCents <= 0 || annualRateBps <= 0) return 0;
  return Math.round((principalCents * annualRateBps) / (10_000 * 12));
}

export function ownedValue(asset: Asset): Cents {
  return Math.round((asset.currentValueCents * asset.ownershipBps) / 10_000);
}

export function effectiveIncome(asset: Asset): Cents {
  if (asset.incomePausedTurns > 0) return 0;
  return Math.round((asset.recurringIncomeCents * asset.ownershipBps) / 10_000);
}

export function effectiveExpense(asset: Asset): Cents {
  return Math.round((asset.recurringExpenseCents * asset.ownershipBps) / 10_000);
}

export function totalIncome(statement: IncomeStatement): Cents {
  return (
    statement.salaryCents +
    statement.otherEarnedCents +
    statement.businessIncomeCents +
    statement.rentalIncomeCents +
    statement.investmentIncomeCents
  );
}

export function totalExpenses(statement: IncomeStatement): Cents {
  return (
    statement.livingExpenseCents +
    statement.operatingExpenseCents +
    statement.debtPaymentCents +
    statement.taxCents
  );
}

/** Monthly income minus monthly expenses. Recurring items only; one-time cash events are ledger entries. */
export function netCashFlow(statement: IncomeStatement): Cents {
  return totalIncome(statement) - totalExpenses(statement);
}

/** Rental, dividend, and business income flagged passive by the scenario. Salary is earned. */
export function passiveIncome(statement: IncomeStatement): Cents {
  return statement.businessIncomeCents + statement.rentalIncomeCents + statement.investmentIncomeCents;
}

/** Null when expenses are zero so callers do not divide by zero. */
export function passiveCoverageRatio(statement: IncomeStatement): number | null {
  const expenses = totalExpenses(statement);
  if (expenses === 0) return null;
  return passiveIncome(statement) / expenses;
}

export function passiveCoversExpenses(statement: IncomeStatement): boolean {
  return passiveIncome(statement) >= totalExpenses(statement);
}

export function projectStatement(player: PlayerState): IncomeStatement {
  let business = 0;
  let rental = 0;
  let investment = 0;
  let operating = 0;
  for (const asset of player.assets) {
    const income = effectiveIncome(asset);
    operating += effectiveExpense(asset);
    if (!asset.countsAsPassive) continue;
    if (asset.incomeKind === "business") business += income;
    else if (asset.incomeKind === "rental") rental += income;
    else if (asset.incomeKind === "investment") investment += income;
  }
  const debt = player.liabilities.reduce((sum, liability) => sum + liability.monthlyPaymentCents, 0);
  return {
    salaryCents: player.lifestyle.salaryCents,
    otherEarnedCents: player.lifestyle.otherEarnedCents,
    businessIncomeCents: business,
    rentalIncomeCents: rental,
    investmentIncomeCents: investment,
    livingExpenseCents: player.lifestyle.livingExpenseCents,
    operatingExpenseCents: operating,
    debtPaymentCents: debt,
    taxCents: player.lifestyle.baseTaxCents,
  };
}

export function linkedDebt(player: PlayerState, assetId: string): Cents {
  return player.liabilities
    .filter((liability) => liability.linkedAssetId === assetId)
    .reduce((sum, liability) => sum + liability.principalBalanceCents, 0);
}

export function assetMonthlyCashFlow(player: PlayerState, asset: Asset): Cents {
  const debtService = player.liabilities
    .filter((liability) => liability.linkedAssetId === asset.id)
    .reduce((sum, liability) => sum + liability.monthlyPaymentCents, 0);
  return effectiveIncome(asset) - effectiveExpense(asset) - debtService;
}

export function balanceSheet(player: PlayerState): BalanceSheet {
  let investments = 0;
  let property = 0;
  let business = 0;
  let other = 0;
  for (const asset of player.assets) {
    const value = ownedValue(asset);
    if (asset.assetType === "securities") investments += value;
    else if (asset.assetType === "real_estate") property += value;
    else if (asset.assetType === "business") business += value;
    else other += value;
  }
  let mortgage = 0;
  let otherDebt = 0;
  for (const liability of player.liabilities) {
    if (liability.liabilityType === "mortgage") mortgage += liability.principalBalanceCents;
    else otherDebt += liability.principalBalanceCents;
  }
  const businessDebt = player.liabilities
    .filter((liability) => liability.liabilityType === "business")
    .reduce((sum, liability) => sum + liability.principalBalanceCents, 0);
  const totalAssets = player.cashCents + investments + property + business + other;
  const totalLiabilities = mortgage + otherDebt;
  return {
    cashCents: player.cashCents,
    investmentsCents: investments,
    propertyCents: property,
    businessAssetCents: business,
    businessEquityCents: business - businessDebt,
    otherAssetsCents: other,
    mortgageCents: mortgage,
    otherDebtCents: otherDebt,
    totalAssetsCents: totalAssets,
    totalLiabilitiesCents: totalLiabilities,
    netWorthCents: totalAssets - totalLiabilities,
  };
}

export function debtToAssetRatio(sheet: BalanceSheet): number | null {
  if (sheet.totalAssetsCents === 0) return null;
  return sheet.totalLiabilitiesCents / sheet.totalAssetsCents;
}

export function emergencyReserveMonths(player: PlayerState, statement = projectStatement(player)): number | null {
  const expenses = totalExpenses(statement);
  if (expenses === 0) return null;
  return player.cashCents / expenses;
}

export function incomeProducingAssetCount(player: PlayerState): number {
  return player.assets.filter((asset) => asset.countsAsPassive && effectiveIncome(asset) > 0).length;
}

export function unrealizedGainCents(player: PlayerState): Cents {
  return player.assets.reduce((sum, asset) => {
    const gain = asset.currentValueCents - asset.purchasePriceCents;
    return sum + Math.round((gain * asset.ownershipBps) / 10_000);
  }, 0);
}

export function cashFromLedger(player: PlayerState): Cents {
  const delta = player.ledger.reduce((sum, entry) => {
    const cash = entry.accountDeltas.find((item) => item.account === "cash");
    return sum + (cash?.deltaCents ?? 0);
  }, 0);
  return player.opening.cashCents + delta;
}

export function openingFromPlayer(player: PlayerState): PlayerState["opening"] {
  const statement = projectStatement(player);
  const sheet = balanceSheet(player);
  return {
    netWorthCents: sheet.netWorthCents,
    cashFlowCents: netCashFlow(statement),
    cashCents: player.cashCents,
    passiveIncomeCents: passiveIncome(statement),
    totalDebtCents: sheet.totalLiabilitiesCents,
    totalExpensesCents: totalExpenses(statement),
  };
}

function withLedger(player: PlayerState, entry: Omit<LedgerEntry, "id">): PlayerState {
  const next: PlayerState = {
    ...player,
    assets: player.assets.map((asset) => ({ ...asset })),
    liabilities: player.liabilities.map((liability) => ({ ...liability })),
    ledger: [...player.ledger],
    lifestyle: { ...player.lifestyle },
    cardCooldowns: { ...player.cardCooldowns },
    lessons: [...player.lessons],
    history: [...player.history],
  };
  next.ledger.push({ ...entry, id: `${player.id}-tx-${next.ledger.length + 1}` });
  return next;
}

export function cashRequired(offer: Offer, priceDiscountCents = 0): Cents {
  const discount = Math.min(Math.max(priceDiscountCents, 0), offer.downPaymentCents + offer.closingCostCents);
  return offer.downPaymentCents + offer.closingCostCents - discount;
}

export function negotiatedOffer(offer: Offer, priceDiscountCents = 0): Offer {
  const discount = Math.min(Math.max(priceDiscountCents, 0), offer.downPaymentCents);
  return {
    ...offer,
    purchasePriceCents: offer.purchasePriceCents - discount,
    downPaymentCents: offer.downPaymentCents - discount,
    exitValueCents: Math.max(0, offer.exitValueCents - discount),
  };
}

export function assertOfferCoherent(offer: Offer): void {
  if (offer.financingCents + offer.downPaymentCents !== offer.purchasePriceCents) {
    throw new Error(`Offer ${offer.id} does not fund its purchase price`);
  }
  if (!offer.hypothetical) {
    throw new Error(`Offer ${offer.id} must be marked hypothetical`);
  }
}

export function previewPurchase(player: PlayerState, offer: Offer, priceDiscountCents = 0): PurchasePreview {
  const deal = negotiatedOffer(offer, priceDiscountCents);
  assertOfferCoherent(deal);
  const required = cashRequired(deal, 0);
  const sheet = balanceSheet(player);
  const projectedExpense = deal.monthlyOperatingExpenseCents + deal.monthlyDebtServiceCents;
  const projectedFlow = deal.monthlyIncomeCents - projectedExpense;
  const resultingDebt = sheet.totalLiabilitiesCents + deal.financingCents;
  const netWorthChange = -deal.closingCostCents;
  return {
    cashRequiredCents: required,
    projectedMonthlyIncomeCents: deal.monthlyIncomeCents,
    projectedMonthlyExpenseCents: projectedExpense,
    projectedCashFlowCents: projectedFlow,
    remainingCashCents: player.cashCents - required,
    affordable: player.cashCents >= required,
    resultingDebtCents: resultingDebt,
    resultingNetWorthCents: sheet.netWorthCents + netWorthChange,
    netWorthChangeCents: netWorthChange,
    scenarios: deal.scenarios,
    risks: deal.risks,
    assumptions: deal.assumptions,
  };
}

export function purchaseOffer(
  player: PlayerState,
  offer: Offer,
  turnNumber: number,
  idempotencyKey: string,
  priceDiscountCents = 0,
): { ok: true; player: PlayerState } | { ok: false; code: "INSUFFICIENT_FUNDS" | "ALREADY_OWNED"; message: string } {
  if (player.assets.some((asset) => asset.offerId === offer.id)) {
    return { ok: false, code: "ALREADY_OWNED", message: "You already hold this opportunity." };
  }
  const deal = negotiatedOffer(offer, priceDiscountCents);
  assertOfferCoherent(deal);
  const required = cashRequired(deal, 0);
  if (player.cashCents < required) {
    return {
      ok: false,
      code: "INSUFFICIENT_FUNDS",
      message: "Cash on hand does not cover the down payment and closing costs.",
    };
  }
  const assetId = `${player.id}-asset-${deal.id}`;
  const units = deal.units ?? 1;
  const asset: Asset = {
    id: assetId,
    offerId: deal.id,
    assetType: deal.category,
    name: deal.name,
    purchasePriceCents: deal.purchasePriceCents,
    currentValueCents: deal.category === "securities" ? deal.purchasePriceCents : deal.purchasePriceCents,
    ownershipBps: 10_000,
    incomeKind: deal.incomeKind,
    countsAsPassive: deal.countsAsPassive,
    recurringIncomeCents: deal.monthlyIncomeCents,
    recurringExpenseCents: deal.monthlyOperatingExpenseCents,
    incomePausedTurns: 0,
    riskCategory: deal.riskCategory,
    acquiredAtTurn: turnNumber,
    units: deal.category === "securities" ? units : undefined,
    unitPriceCents: deal.category === "securities" ? Math.round(deal.purchasePriceCents / units) : undefined,
  };
  let next = withLedger(player, {
    transactionType: "asset_purchase",
    amountCents: required,
    description: `Acquired ${deal.name}. Hypothetical scenario, not a market quote.`,
    turnNumber,
    idempotencyKey,
    assetId,
    accountDeltas: [
      { account: "cash", deltaCents: -required },
      { account: "assets", deltaCents: deal.purchasePriceCents },
      { account: "liabilities", deltaCents: deal.financingCents },
    ],
  });
  next = { ...next, cashCents: next.cashCents - required, assets: [...next.assets, asset] };
  if (deal.financingCents > 0) {
    const liability: Liability = {
      id: `${player.id}-debt-${deal.id}`,
      liabilityType: deal.category === "real_estate" ? "mortgage" : "business",
      name: `${deal.name} financing`,
      principalBalanceCents: deal.financingCents,
      interestRateBps: deal.interestRateBps,
      monthlyPaymentCents: deal.monthlyDebtServiceCents,
      linkedAssetId: assetId,
    };
    next = {
      ...next,
      liabilities: [...next.liabilities, liability],
      ledger: next.ledger.map((entry, index) =>
        index === next.ledger.length - 1 ? { ...entry, liabilityId: liability.id } : entry,
      ),
    };
  }
  return { ok: true, player: next };
}

export function repayLiability(
  player: PlayerState,
  liabilityId: string,
  amountCents: Cents,
  turnNumber: number,
  idempotencyKey: string,
): { ok: true; player: PlayerState } | { ok: false; code: "INSUFFICIENT_FUNDS" | "INVALID_TRANSACTION"; message: string } {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, code: "INVALID_TRANSACTION", message: "Repayment must be a positive amount in cents." };
  }
  const liability = player.liabilities.find((item) => item.id === liabilityId);
  if (!liability) {
    return { ok: false, code: "INVALID_TRANSACTION", message: "That debt is not on your statement." };
  }
  if (amountCents > liability.principalBalanceCents) {
    return { ok: false, code: "INVALID_TRANSACTION", message: "Repayment is larger than the remaining principal." };
  }
  if (amountCents > player.cashCents) {
    return { ok: false, code: "INSUFFICIENT_FUNDS", message: "Cash on hand does not cover that repayment." };
  }
  const remaining = liability.principalBalanceCents - amountCents;
  let next = withLedger(player, {
    transactionType: "debt_repayment",
    amountCents,
    description: `Principal payment on ${liability.name}.`,
    turnNumber,
    idempotencyKey,
    liabilityId,
    accountDeltas: [
      { account: "cash", deltaCents: -amountCents },
      { account: "liabilities", deltaCents: -amountCents },
    ],
  });
  next = {
    ...next,
    cashCents: next.cashCents - amountCents,
    liabilities:
      remaining === 0
        ? next.liabilities.filter((item) => item.id !== liabilityId)
        : next.liabilities.map((item) =>
            item.id === liabilityId ? { ...item, principalBalanceCents: remaining } : item,
          ),
  };
  return { ok: true, player: next };
}

export function bridgePaymentCents(principalCents: Cents, annualRateBps: number): Cents {
  const interest = monthlyInterestCents(principalCents, annualRateBps);
  const extra = Math.max(2_500, Math.round(principalCents * 0.01));
  return interest + extra;
}

export interface CashResolution {
  player: PlayerState;
  distress: boolean;
  reason: string | null;
}

export function applyCashChange(
  player: PlayerState,
  deltaCents: Cents,
  input: {
    turnNumber: number;
    idempotencyKey: string;
    description: string;
    transactionType: string;
    bridgeCapCents: Cents;
    bridgeRateBps: number;
  },
): CashResolution {
  if (deltaCents >= 0) {
    const next = withLedger(player, {
      transactionType: input.transactionType,
      amountCents: deltaCents,
      description: input.description,
      turnNumber: input.turnNumber,
      idempotencyKey: input.idempotencyKey,
      accountDeltas: [{ account: "cash", deltaCents }],
    });
    return { player: { ...next, cashCents: next.cashCents + deltaCents }, distress: false, reason: null };
  }
  const cost = -deltaCents;
  const paid = Math.min(player.cashCents, cost);
  const shortfall = cost - paid;
  if (shortfall === 0) {
    const next = withLedger(player, {
      transactionType: input.transactionType,
      amountCents: cost,
      description: input.description,
      turnNumber: input.turnNumber,
      idempotencyKey: input.idempotencyKey,
      accountDeltas: [{ account: "cash", deltaCents: -cost }],
    });
    return { player: { ...next, cashCents: next.cashCents - cost }, distress: false, reason: null };
  }
  const existing = player.liabilities.find((item) => item.liabilityType === "bridge");
  const existingPrincipal = existing?.principalBalanceCents ?? 0;
  if (existingPrincipal + shortfall > input.bridgeCapCents) {
    return {
      player,
      distress: true,
      reason: "A bill came due, cash ran out, and the hardship line would have grown past the game's borrowing cap.",
    };
  }
  const principal = existingPrincipal + shortfall;
  const payment = bridgePaymentCents(principal, input.bridgeRateBps);
  const liabilityId = existing?.id ?? `${player.id}-bridge`;
  const deltas = [
    { account: "cash", deltaCents: -paid },
    { account: "liabilities", deltaCents: shortfall },
  ];
  let next = withLedger(player, {
    transactionType: "hardship_bridge",
    amountCents: cost,
    description: `${input.description} Cash covered ${paid} cents and a hardship bridge covered the rest.`,
    turnNumber: input.turnNumber,
    idempotencyKey: input.idempotencyKey,
    liabilityId,
    accountDeltas: deltas,
  });
  const bridge: Liability = {
    id: liabilityId,
    liabilityType: "bridge",
    name: "Hardship bridge",
    principalBalanceCents: principal,
    interestRateBps: input.bridgeRateBps,
    monthlyPaymentCents: payment,
  };
  next = {
    ...next,
    cashCents: next.cashCents - paid,
    liabilities: existing
      ? next.liabilities.map((item) => (item.id === liabilityId ? bridge : item))
      : [...next.liabilities, bridge],
  };
  return { player: next, distress: false, reason: null };
}

export function amortizeLoans(player: PlayerState, turnNumber: number, idempotencyKey: string): PlayerState {
  let next = player;
  for (const liability of player.liabilities) {
    const interest = monthlyInterestCents(liability.principalBalanceCents, liability.interestRateBps);
    const reduction = Math.min(liability.principalBalanceCents, Math.max(0, liability.monthlyPaymentCents - interest));
    if (reduction <= 0) continue;
    const remaining = liability.principalBalanceCents - reduction;
    next = withLedger(next, {
      transactionType: "loan_amortization",
      amountCents: reduction,
      description: `Principal portion of the payment on ${liability.name}. Interest this month was recorded inside the payment, not added to the balance.`,
      turnNumber,
      idempotencyKey: `${idempotencyKey}:${liability.id}`,
      liabilityId: liability.id,
      accountDeltas: [{ account: "liabilities", deltaCents: -reduction }],
    });
    next = {
      ...next,
      liabilities:
        remaining === 0
          ? next.liabilities.filter((item) => item.id !== liability.id)
          : next.liabilities.map((item) =>
              item.id === liability.id ? { ...item, principalBalanceCents: remaining } : item,
            ),
    };
  }
  return next;
}

export function tickPauses(player: PlayerState): PlayerState {
  return {
    ...player,
    assets: player.assets.map((asset) => ({
      ...asset,
      incomePausedTurns: Math.max(0, asset.incomePausedTurns - 1),
    })),
    insuranceTurnsRemaining: Math.max(0, player.insuranceTurnsRemaining - 1),
    liabilities: player.liabilities.map((liability) => ({ ...liability })),
    ledger: [...player.ledger],
    lifestyle: { ...player.lifestyle },
    history: [...player.history],
    lessons: [...player.lessons],
    cardCooldowns: { ...player.cardCooldowns },
  };
}

export function moveSecurityPrices(player: PlayerState, deltaBps: number, turnNumber: number, idempotencyKey: string, description: string): PlayerState {
  if (!player.assets.some((asset) => asset.assetType === "securities" && asset.units && asset.unitPriceCents)) {
    return player;
  }
  let valueDelta = 0;
  const assets = player.assets.map((asset) => {
    if (asset.assetType !== "securities" || !asset.unitPriceCents || !asset.units) return { ...asset };
    const nextPrice = Math.max(0, roundHalfAwayFromZero((asset.unitPriceCents * (10_000 + deltaBps)) / 10_000));
    const nextValue = nextPrice * asset.units;
    valueDelta += Math.round(((nextValue - asset.currentValueCents) * asset.ownershipBps) / 10_000);
    return { ...asset, unitPriceCents: nextPrice, currentValueCents: nextValue };
  });
  const next = withLedger(
    { ...player, assets },
    {
      transactionType: "market_revaluation",
      amountCents: valueDelta,
      description,
      turnNumber,
      idempotencyKey,
      accountDeltas: [{ account: "investments", deltaCents: valueDelta }],
    },
  );
  return next;
}

export function positiveCashFlowAssetCount(player: PlayerState): number {
  return player.assets.filter((asset) => assetMonthlyCashFlow(player, asset) > 0).length;
}

export function nonBridgeDebt(player: PlayerState): Cents {
  return player.liabilities
    .filter((liability) => liability.liabilityType !== "bridge")
    .reduce((sum, liability) => sum + liability.principalBalanceCents, 0);
}
