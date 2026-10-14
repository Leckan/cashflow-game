import type { Cents } from "./money";

export const RULES_VERSION = "2026.1";

export const SPACE_CATEGORIES = [
  "start",
  "salary",
  "investment",
  "real_estate",
  "small_business",
  "securities",
  "unexpected",
  "market",
  "career",
  "tax",
  "insurance",
  "review",
  "negotiation",
  "charity",
  "rest",
  "milestone",
  "tutorial",
] as const;

export type SpaceCategory = (typeof SPACE_CATEGORIES)[number];

export type AssetType = "real_estate" | "business" | "securities" | "other";
export type IncomeKind = "rental" | "business" | "investment" | "other" | "none";
export type RiskCategory = "low" | "moderate" | "high";
export type LiabilityType = "mortgage" | "consumer" | "business" | "bridge" | "other";
export type Difficulty = "guided" | "standard" | "sharp";
export type GameMode = "tutorial" | "solo" | "challenge" | "multiplayer";
export type Phase = "awaiting_roll" | "awaiting_decision" | "ready_to_end" | "completed";

export type Ending =
  | "financial_independence"
  | "independence_reserve"
  | "net_worth_only"
  | "distress"
  | "challenge_complete"
  | "turn_limit"
  | "tutorial_complete";

export type GameErrorCode =
  | "INSUFFICIENT_FUNDS"
  | "INVALID_GAME_STATE"
  | "NOT_ACTIVE_PLAYER"
  | "OPPORTUNITY_UNAVAILABLE"
  | "INVALID_TRANSACTION"
  | "GAME_NOT_FOUND"
  | "ALREADY_OWNED"
  | "NOT_A_MEMBER";

export interface AccountDelta {
  account: string;
  deltaCents: Cents;
}

export interface LedgerEntry {
  id: string;
  transactionType: string;
  amountCents: Cents;
  description: string;
  turnNumber: number;
  idempotencyKey: string;
  assetId?: string;
  liabilityId?: string;
  accountDeltas: AccountDelta[];
}

export interface Asset {
  id: string;
  offerId: string | null;
  assetType: AssetType;
  name: string;
  purchasePriceCents: Cents;
  currentValueCents: Cents;
  ownershipBps: number;
  incomeKind: IncomeKind;
  countsAsPassive: boolean;
  recurringIncomeCents: Cents;
  recurringExpenseCents: Cents;
  incomePausedTurns: number;
  riskCategory: RiskCategory;
  acquiredAtTurn: number;
  units?: number;
  unitPriceCents?: Cents;
}

export interface Liability {
  id: string;
  liabilityType: LiabilityType;
  name: string;
  principalBalanceCents: Cents;
  interestRateBps: number;
  monthlyPaymentCents: Cents;
  linkedAssetId?: string;
}

export interface Lifestyle {
  salaryCents: Cents;
  otherEarnedCents: Cents;
  livingExpenseCents: Cents;
  baseTaxCents: Cents;
}

export interface OpeningSnapshot {
  netWorthCents: Cents;
  cashFlowCents: Cents;
  cashCents: Cents;
  passiveIncomeCents: Cents;
  totalDebtCents: Cents;
  totalExpensesCents: Cents;
}

export interface HistoryPoint {
  turn: number;
  cashCents: Cents;
  netWorthCents: Cents;
  cashFlowCents: Cents;
  passiveIncomeCents: Cents;
}

export interface PlayerState {
  id: string;
  userId: string | null;
  displayName: string;
  avatarId: string;
  turnOrder: number;
  boardPosition: number;
  month: number;
  isActive: boolean;
  lifestyle: Lifestyle;
  cashCents: Cents;
  assets: Asset[];
  liabilities: Liability[];
  ledger: LedgerEntry[];
  cardCooldowns: Record<string, number>;
  insuranceTurnsRemaining: number;
  communityGiftCents: Cents;
  lessons: string[];
  history: HistoryPoint[];
  opening: OpeningSnapshot;
  finalScore: number | null;
}

export interface ScenarioView {
  label: string;
  monthlyCashFlowCents: Cents;
  notes: string;
}

export interface Offer {
  id: string;
  name: string;
  description: string;
  category: "real_estate" | "business" | "securities";
  purchasePriceCents: Cents;
  downPaymentCents: Cents;
  closingCostCents: Cents;
  financingCents: Cents;
  interestRateBps: number;
  monthlyDebtServiceCents: Cents;
  monthlyIncomeCents: Cents;
  monthlyOperatingExpenseCents: Cents;
  incomeKind: Exclude<IncomeKind, "none" | "other">;
  countsAsPassive: boolean;
  riskCategory: RiskCategory;
  holdingPeriodTurns: number;
  exitValueCents: Cents;
  assumptions: string[];
  risks: string[];
  educationalExplanation: string;
  hypothetical: true;
  ownerInvolvement: string;
  scenarios: {
    best: ScenarioView;
    base: ScenarioView;
    downside: ScenarioView;
  };
  units?: number;
}

export type Effect =
  | { type: "noop" }
  | { type: "cash"; deltaCents: Cents; description: string; transactionType: string }
  | { type: "expense"; amountCents: Cents; description: string; waivedIfInsured?: boolean }
  | {
      type: "salary_delta";
      deltaCents: Cents;
      costCents: Cents;
      description: string;
    }
  | { type: "buy"; offerId: string; priceDiscountCents?: Cents }
  | { type: "pause_income"; assetType: AssetType; turns: number; description: string }
  | { type: "market_move"; deltaBps: number; description: string }
  | { type: "living_delta"; deltaCents: Cents; description: string }
  | { type: "insure"; turns: number; premiumCents: Cents; description: string }
  | { type: "charity"; amountCents: Cents; description: string };

export interface CardOption {
  id: string;
  label: string;
  detail: string;
  effect: Effect;
}

export interface EventCard {
  id: string;
  title: string;
  category: SpaceCategory;
  description: string;
  educationalExplanation: string;
  riskNote?: string;
  cooldownTurns?: number;
  requiresAssetType?: AssetType;
  minCashCents?: Cents;
  options: CardOption[];
}

export interface BoardSpace {
  id: string;
  position: number;
  name: string;
  category: Exclude<SpaceCategory, "tutorial">;
  summary: string;
  accent: string;
}

export interface PendingEvent {
  rolls: number[];
  total: number;
  from: number;
  to: number;
  spaceId: string;
  cardId: string;
  optionId: string | null;
}

export interface GameEventRecord {
  id: string;
  playerId: string;
  eventCardId: string | null;
  eventType: string;
  turnNumber: number;
  payload: Record<string, string | number | boolean | null>;
}

export interface RulesConfig {
  version: string;
  diceCount: number;
  maxTurns: number;
  expenseMultiplierBps: number;
  reserveMonthsForStrongWin: number;
  bridgeCapMonths: number;
  bridgeRateBps: number;
  boardSpaces: number;
}

export type Objective =
  | { type: "passive_income"; targetCents: Cents }
  | { type: "positive_assets"; count: number }
  | { type: "reduce_debt"; maxPrincipalCents: Cents; minCashCents: Cents }
  | { type: "survive_turns"; turns: number; minCashCents: Cents }
  | { type: "net_worth_growth"; growthCents: Cents; withinTurns: number }
  | { type: "financial_independence" }
  | { type: "tutorial_finish" };

export interface ScriptStep {
  roll: number;
  cardId: string;
}

export interface ScriptedDraw {
  month: number;
  cardId: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  objective: Objective;
  maxTurns?: number;
  profileId?: string;
  lockProfile?: boolean;
  scriptedDraws?: ScriptedDraw[];
  startingPosition?: number;
}

export interface Profile {
  id: string;
  name: string;
  summary: string;
  note: string;
  lifestyle: Lifestyle;
  cashCents: Cents;
  assets: Omit<Asset, "id" | "acquiredAtTurn">[];
  liabilities: Omit<Liability, "id">[];
}

export interface GameState {
  rulesVersion: string;
  id: string;
  mode: GameMode;
  status: "active" | "completed";
  ending: Ending | null;
  endingReason: string | null;
  seed: number;
  rngCursor: number;
  turnNumber: number;
  phase: Phase;
  difficulty: Difficulty;
  rules: RulesConfig;
  challengeId: string | null;
  objective: Objective | null;
  script: ScriptStep[] | null;
  scriptedDraws: ScriptedDraw[];
  players: PlayerState[];
  activePlayerIndex: number;
  pending: PendingEvent | null;
  processedKeys: string[];
  events: GameEventRecord[];
  createdAt: string;
  updatedAt: string;
  shareScore: boolean;
}

export interface Catalog {
  board: BoardSpace[];
  cards: EventCard[];
  offers: Offer[];
  profiles: Profile[];
  challenges: Challenge[];
  fallbackCardId: string;
}

export type GameAction =
  | { type: "roll"; idempotencyKey: string; playerId: string }
  | { type: "decide"; idempotencyKey: string; playerId: string; optionId: string }
  | {
      type: "repay";
      idempotencyKey: string;
      playerId: string;
      liabilityId: string;
      amountCents: Cents;
    }
  | { type: "end_turn"; idempotencyKey: string; playerId: string };

export type ActionResult =
  | { ok: true; state: GameState; duplicate: boolean }
  | { ok: false; code: GameErrorCode; message: string; state: GameState };

export interface IncomeStatement {
  salaryCents: Cents;
  otherEarnedCents: Cents;
  businessIncomeCents: Cents;
  rentalIncomeCents: Cents;
  investmentIncomeCents: Cents;
  livingExpenseCents: Cents;
  operatingExpenseCents: Cents;
  debtPaymentCents: Cents;
  taxCents: Cents;
}

export interface BalanceSheet {
  cashCents: Cents;
  investmentsCents: Cents;
  propertyCents: Cents;
  businessAssetCents: Cents;
  businessEquityCents: Cents;
  otherAssetsCents: Cents;
  mortgageCents: Cents;
  otherDebtCents: Cents;
  totalAssetsCents: Cents;
  totalLiabilitiesCents: Cents;
  netWorthCents: Cents;
}

export interface PurchasePreview {
  cashRequiredCents: Cents;
  projectedMonthlyIncomeCents: Cents;
  projectedMonthlyExpenseCents: Cents;
  projectedCashFlowCents: Cents;
  remainingCashCents: Cents;
  affordable: boolean;
  resultingDebtCents: Cents;
  resultingNetWorthCents: Cents;
  netWorthChangeCents: Cents;
  scenarios: Offer["scenarios"];
  risks: string[];
  assumptions: string[];
}
