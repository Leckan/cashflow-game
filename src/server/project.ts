import postgres, { type Sql } from "postgres";
import { balanceSheet, netCashFlow, passiveIncome, projectStatement, totalExpenses, totalIncome } from "@/features/game/finance";
import { RULES_VERSION, type GameState } from "@/features/game/types";

let client: Sql | null = null;

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Parameters<Sql["json"]>[0];
}

function sqlClient() {
  if (!process.env.DATABASE_URL) return null;
  client ??= postgres(process.env.DATABASE_URL, { max: 1 });
  return client;
}

export async function projectGame(ownerId: string, state: GameState) {
  const sql = sqlClient();
  if (!sql) return;
  const active = state.players[state.activePlayerIndex];
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO users (id, display_name, email, updated_at)
      VALUES (${ownerId}, ${state.players[0]?.displayName ?? "Player"}, ${ownerId.includes("@") ? ownerId : null}, now())
      ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = now()
    `;
    await tx`
      INSERT INTO game_sessions (id, owner_id, game_mode, status, rules_version, random_seed, current_turn, active_player_id, created_at, updated_at, completed_at)
      VALUES (
        ${state.id}, ${ownerId}, ${state.mode}, ${state.status}, ${state.rulesVersion}, ${String(state.seed)},
        ${state.turnNumber}, ${active?.id ?? null}, ${state.createdAt}, ${state.updatedAt},
        ${state.status === "completed" ? state.updatedAt : null}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        current_turn = EXCLUDED.current_turn,
        active_player_id = EXCLUDED.active_player_id,
        updated_at = EXCLUDED.updated_at,
        completed_at = EXCLUDED.completed_at
    `;
    for (const player of state.players) {
      await tx`
        INSERT INTO game_players (id, game_session_id, user_id, display_name, avatar_id, turn_order, current_board_position, is_active, final_score)
        VALUES (${player.id}, ${state.id}, ${player.userId}, ${player.displayName}, ${player.avatarId}, ${player.turnOrder}, ${player.boardPosition}, ${player.isActive}, ${player.finalScore})
        ON CONFLICT (id) DO UPDATE SET
          current_board_position = EXCLUDED.current_board_position,
          is_active = EXCLUDED.is_active,
          final_score = EXCLUDED.final_score,
          display_name = EXCLUDED.display_name
      `;
      const statement = projectStatement(player);
      const sheet = balanceSheet(player);
      const accounts = [
        ["cash", "Cash", player.cashCents],
        ["earned_income", "Monthly earned income", statement.salaryCents + statement.otherEarnedCents],
        ["passive_income", "Monthly passive income", passiveIncome(statement)],
        ["expenses", "Monthly expenses", totalExpenses(statement)],
        ["cash_flow", "Monthly net cash flow", netCashFlow(statement)],
        ["assets", "Total assets", sheet.totalAssetsCents],
        ["liabilities", "Total liabilities", sheet.totalLiabilitiesCents],
        ["net_worth", "Net worth", sheet.netWorthCents],
      ] as const;
      for (const [accountType, accountName, balance] of accounts) {
        await tx`
          INSERT INTO financial_accounts (id, game_player_id, account_type, account_name, balance_cents, metadata, updated_at)
          VALUES (${`${player.id}:${accountType}`}, ${player.id}, ${accountType}, ${accountName}, ${balance}, ${sql.json(jsonValue({ rulesVersion: RULES_VERSION, income: totalIncome(statement) }))}, now())
          ON CONFLICT (id) DO UPDATE SET balance_cents = EXCLUDED.balance_cents, updated_at = now()
        `;
      }
      for (const entry of player.ledger) {
        await tx`
          INSERT INTO transactions (id, game_session_id, game_player_id, transaction_type, amount_cents, currency, description, turn_number, idempotency_key, metadata)
          VALUES (
            ${entry.id}, ${state.id}, ${player.id}, ${entry.transactionType}, ${entry.amountCents}, 'USD',
            ${entry.description}, ${entry.turnNumber}, ${entry.idempotencyKey}, ${sql.json(jsonValue({ accounts: entry.accountDeltas }))}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
      await tx`DELETE FROM assets WHERE game_player_id = ${player.id}`;
      for (const asset of player.assets) {
        const financing = player.liabilities
          .filter((liability) => liability.linkedAssetId === asset.id)
          .reduce((sum, liability) => sum + liability.principalBalanceCents, 0);
        await tx`
          INSERT INTO assets (id, game_player_id, asset_type, name, purchase_price_cents, current_value_cents, recurring_income_cents, recurring_expense_cents, financing_balance_cents, ownership_bps, risk_category, acquired_at_turn, metadata)
          VALUES (
            ${asset.id}, ${player.id}, ${asset.assetType}, ${asset.name}, ${asset.purchasePriceCents}, ${asset.currentValueCents},
            ${asset.recurringIncomeCents}, ${asset.recurringExpenseCents}, ${financing}, ${asset.ownershipBps}, ${asset.riskCategory},
            ${asset.acquiredAtTurn}, ${sql.json(jsonValue({ countsAsPassive: asset.countsAsPassive, incomeKind: asset.incomeKind }))}
          )
        `;
      }
      await tx`DELETE FROM liabilities WHERE game_player_id = ${player.id}`;
      for (const liability of player.liabilities) {
        await tx`
          INSERT INTO liabilities (id, game_player_id, liability_type, name, principal_balance_cents, interest_rate_bps, monthly_payment_cents, updated_at)
          VALUES (
            ${liability.id}, ${player.id}, ${liability.liabilityType}, ${liability.name}, ${liability.principalBalanceCents},
            ${liability.interestRateBps}, ${liability.monthlyPaymentCents}, now()
          )
        `;
      }
    }
    for (const event of state.events) {
      await tx`
        INSERT INTO game_events (id, game_session_id, game_player_id, event_card_id, event_type, turn_number, event_payload)
        VALUES (${event.id}, ${state.id}, ${event.playerId}, ${event.eventCardId}, ${event.eventType}, ${event.turnNumber}, ${sql.json(jsonValue(event.payload))}
        ON CONFLICT (id) DO NOTHING
      `;
    }
    await tx`
      INSERT INTO game_snapshots (id, game_session_id, turn_number, state_version, state_json)
      VALUES (${`${state.id}:${state.events.length}`}, ${state.id}, ${state.turnNumber}, ${RULES_VERSION}, ${sql.json(jsonValue(state))}
      ON CONFLICT (id) DO NOTHING
    `;
  });
}
