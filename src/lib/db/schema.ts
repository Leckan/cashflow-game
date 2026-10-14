import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const gameSessions = pgTable("game_sessions", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  gameMode: text("game_mode").notNull(),
  status: text("status").notNull(),
  rulesVersion: text("rules_version").notNull(),
  randomSeed: text("random_seed").notNull(),
  currentTurn: integer("current_turn").notNull(),
  activePlayerId: text("active_player_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [index("game_sessions_owner_idx").on(table.ownerId)]);

export const gamePlayers = pgTable("game_players", {
  id: text("id").primaryKey(),
  gameSessionId: text("game_session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  displayName: text("display_name").notNull(),
  avatarId: text("avatar_id").notNull(),
  turnOrder: integer("turn_order").notNull(),
  currentBoardPosition: integer("current_board_position").notNull(),
  isActive: boolean("is_active").notNull(),
  finalScore: integer("final_score"),
}, (table) => [index("game_players_session_idx").on(table.gameSessionId)]);

export const financialAccounts = pgTable("financial_accounts", {
  id: text("id").primaryKey(),
  gamePlayerId: text("game_player_id").notNull().references(() => gamePlayers.id, { onDelete: "cascade" }),
  accountType: text("account_type").notNull(),
  accountName: text("account_name").notNull(),
  balanceCents: integer("balance_cents").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  gameSessionId: text("game_session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
  gamePlayerId: text("game_player_id").notNull().references(() => gamePlayers.id, { onDelete: "cascade" }),
  transactionType: text("transaction_type").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  description: text("description").notNull(),
  turnNumber: integer("turn_number").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("transactions_idempotency_idx").on(table.gameSessionId, table.idempotencyKey)]);

export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  gamePlayerId: text("game_player_id").notNull().references(() => gamePlayers.id, { onDelete: "cascade" }),
  assetType: text("asset_type").notNull(),
  name: text("name").notNull(),
  purchasePriceCents: integer("purchase_price_cents").notNull(),
  currentValueCents: integer("current_value_cents").notNull(),
  recurringIncomeCents: integer("recurring_income_cents").notNull(),
  recurringExpenseCents: integer("recurring_expense_cents").notNull(),
  financingBalanceCents: integer("financing_balance_cents").notNull().default(0),
  ownershipBps: integer("ownership_bps").notNull(),
  riskCategory: text("risk_category").notNull(),
  acquiredAtTurn: integer("acquired_at_turn").notNull(),
  metadata: jsonb("metadata"),
});

export const liabilities = pgTable("liabilities", {
  id: text("id").primaryKey(),
  gamePlayerId: text("game_player_id").notNull().references(() => gamePlayers.id, { onDelete: "cascade" }),
  liabilityType: text("liability_type").notNull(),
  name: text("name").notNull(),
  principalBalanceCents: integer("principal_balance_cents").notNull(),
  interestRateBps: integer("interest_rate_bps").notNull(),
  monthlyPaymentCents: integer("monthly_payment_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const boardSpaces = pgTable("board_spaces", {
  id: text("id").primaryKey(),
  boardVersion: text("board_version").notNull(),
  position: integer("position").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  visualConfig: jsonb("visual_config").notNull(),
  eventConfig: jsonb("event_config").notNull(),
}, (table) => [uniqueIndex("board_spaces_version_position_idx").on(table.boardVersion, table.position)]);

export const eventCards = pgTable("event_cards", {
  id: text("id").primaryKey(),
  deckVersion: text("deck_version").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  effectConfig: jsonb("effect_config").notNull(),
  eligibilityConfig: jsonb("eligibility_config").notNull(),
  educationalExplanation: text("educational_explanation").notNull(),
});

export const gameEvents = pgTable("game_events", {
  id: text("id").primaryKey(),
  gameSessionId: text("game_session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
  gamePlayerId: text("game_player_id").notNull(),
  eventCardId: text("event_card_id"),
  eventType: text("event_type").notNull(),
  turnNumber: integer("turn_number").notNull(),
  eventPayload: jsonb("event_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gameSnapshots = pgTable("game_snapshots", {
  id: text("id").primaryKey(),
  gameSessionId: text("game_session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
  turnNumber: integer("turn_number").notNull(),
  stateVersion: text("state_version").notNull(),
  stateJson: jsonb("state_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gameRooms = pgTable("game_rooms", {
  id: text("id").primaryKey(),
  gameSessionId: text("game_session_id"),
  roomCode: text("room_code").notNull(),
  hostPlayerId: text("host_player_id").notNull(),
  visibility: text("visibility").notNull(),
  status: text("status").notNull(),
  maxPlayers: integer("max_players").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("game_rooms_code_idx").on(table.roomCode)]);

export const challenges = pgTable("challenges", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  objectiveConfig: jsonb("objective_config").notNull(),
  difficulty: text("difficulty").notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
