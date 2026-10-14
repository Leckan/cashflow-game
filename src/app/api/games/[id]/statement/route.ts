import { NextResponse } from "next/server";
import { balanceSheet, debtToAssetRatio, emergencyReserveMonths, incomeProducingAssetCount, netCashFlow, passiveCoverageRatio, passiveIncome, projectStatement, totalExpenses, unrealizedGainCents } from "@/features/game/finance";
import { buildReport } from "@/features/game/report";
import { apiError, rateLimit } from "@/server/http";
import { getIdentity } from "@/server/identity";
import { readGame } from "@/server/store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const { id } = await context.params;
  const identity = await getIdentity();
  const record = await readGame(id);
  if (!record || (record.ownerId !== identity.id && !record.state.players.some((player) => player.id === identity.id))) {
    return apiError("GAME_NOT_FOUND", "No game with that id.", 404);
  }
  const player = record.state.players.find((item) => item.id === identity.id) ?? record.state.players[0];
  if (!player) return apiError("GAME_NOT_FOUND", "No game with that id.", 404);
  const statement = projectStatement(player);
  const sheet = balanceSheet(player);
  return NextResponse.json({
    ok: true,
    statement,
    sheet,
    netCashFlowCents: netCashFlow(statement),
    passiveIncomeCents: passiveIncome(statement),
    passiveCoverage: passiveCoverageRatio(statement),
    debtToAsset: debtToAssetRatio(sheet),
    reserveMonths: emergencyReserveMonths(player, statement),
    incomeProducingAssets: incomeProducingAssetCount(player),
    unrealizedGainCents: unrealizedGainCents(player),
    totalExpensesCents: totalExpenses(statement),
    history: player.history,
    report: record.state.status === "completed" ? buildReport(record.state, player.id) : null,
  });
}
