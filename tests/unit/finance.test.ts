import { describe, expect, it } from "vitest";
import { mapleStreet } from "@/features/game/content/offers";
import { createGame } from "@/features/game/engine";
import {
  balanceSheet,
  cashFromLedger,
  debtToAssetRatio,
  monthlyInterestCents,
  netCashFlow,
  passiveCoverageRatio,
  passiveCoversExpenses,
  passiveIncome,
  previewPurchase,
  projectStatement,
  purchaseOffer,
  repayLiability,
  totalExpenses,
  totalIncome,
} from "@/features/game/finance";
import { usd } from "@/features/game/money";
import type { PlayerState } from "@/features/game/types";

function playerFrom(profileId: string): PlayerState {
  const game = createGame({
    id: "g",
    mode: "solo",
    profileId,
    seed: 1,
    now: "2026-10-13T00:00:00.000Z",
    players: [{ id: "p", userId: null, displayName: "Ada", avatarId: "tide" }],
  });
  return game.players[0]!;
}

describe("financial calculations", () => {
  it("computes net worth as assets minus liabilities without adding equity twice", () => {
    const player = playerFrom("early-career");
    const sheet = balanceSheet(player);
    expect(sheet.cashCents).toBe(usd(5000));
    expect(sheet.totalLiabilitiesCents).toBe(usd(8000));
    expect(sheet.netWorthCents).toBe(usd(5000) - usd(8000));
    expect(sheet.netWorthCents).toBe(sheet.totalAssetsCents - sheet.totalLiabilitiesCents);
  });

  it("keeps a property's full value and its mortgage on opposite sides", () => {
    const player = playerFrom("bonus-year-saver");
    const bought = purchaseOffer(player, mapleStreet, 1, "buy-1");
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    const sheet = balanceSheet(bought.player);
    expect(sheet.propertyCents).toBe(usd(180000));
    expect(sheet.mortgageCents).toBe(usd(144000));
    expect(sheet.netWorthCents - balanceSheet(player).netWorthCents).toBe(-usd(4000));
    expect(sheet.cashCents).toBe(usd(10000));
  });

  it("uses the duplex sheet: rent minus operating costs minus debt service", () => {
    const preview = previewPurchase(playerFrom("bonus-year-saver"), mapleStreet);
    expect(preview.projectedCashFlowCents).toBe(usd(450));
    expect(preview.cashRequiredCents).toBe(usd(40000));
    expect(usd(2400) - usd(700) - usd(1250)).toBe(usd(450));
  });

  it("computes monthly cash flow from the early-career profile", () => {
    const statement = projectStatement(playerFrom("early-career"));
    expect(totalIncome(statement)).toBe(usd(4500));
    expect(totalExpenses(statement)).toBe(usd(3450));
    expect(netCashFlow(statement)).toBe(usd(1050));
    expect(passiveIncome(statement)).toBe(0);
  });

  it("does not treat the owner draw as passive income", () => {
    const statement = projectStatement(playerFrom("entrepreneur"));
    expect(statement.salaryCents).toBe(usd(3500));
    expect(passiveIncome(statement)).toBe(0);
    expect(netCashFlow(statement)).toBe(usd(680));
    expect(balanceSheet(playerFrom("entrepreneur")).netWorthCents).toBe(usd(16000));
  });

  it("returns null coverage instead of dividing by zero and treats zero expenses as covered", () => {
    const statement = {
      salaryCents: 0,
      otherEarnedCents: 0,
      businessIncomeCents: 0,
      rentalIncomeCents: 0,
      investmentIncomeCents: 0,
      livingExpenseCents: 0,
      operatingExpenseCents: 0,
      debtPaymentCents: 0,
      taxCents: 0,
    };
    expect(passiveCoverageRatio(statement)).toBeNull();
    expect(passiveCoversExpenses(statement)).toBe(true);
    expect(debtToAssetRatio({ ...balanceSheet(playerFrom("bonus-year-saver")), totalAssetsCents: 0, totalLiabilitiesCents: 0, netWorthCents: 0 })).toBeNull();
  });

  it("rounds monthly interest half away from zero", () => {
    expect(monthlyInterestCents(usd(144000), 650)).toBe(usd(780));
    expect(monthlyInterestCents(10, 10_000)).toBe(1);
    expect(monthlyInterestCents(1, 10_000)).toBe(0);
  });

  it("leaves the player unchanged when a purchase is rejected", () => {
    const player = playerFrom("early-career");
    const before = structuredClone(player);
    const result = purchaseOffer(player, mapleStreet, 1, "nope");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INSUFFICIENT_FUNDS");
    expect(player).toEqual(before);
  });

  it("repays principal with cash and removes a paid-off loan", () => {
    const player = playerFrom("experienced");
    const liabilityId = player.liabilities[0]!.id;
    const paid = repayLiability(player, liabilityId, usd(500), 1, "repay-1");
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.player.cashCents).toBe(usd(19500));
    expect(paid.player.liabilities[0]!.principalBalanceCents).toBe(usd(4500));
    expect(cashFromLedger(paid.player)).toBe(paid.player.cashCents);
    const rest = repayLiability(paid.player, liabilityId, usd(4500), 1, "repay-2");
    expect(rest.ok).toBe(true);
    if (!rest.ok) return;
    expect(rest.player.liabilities).toHaveLength(0);
    expect(rest.player.cashCents).toBe(usd(15000));
  });

  it("counts only the owned fraction of an asset", () => {
    const player = playerFrom("experienced");
    const asset = player.assets[0]!;
    asset.ownershipBps = 5_000;
    asset.currentValueCents = usd(10000);
    expect(balanceSheet(player).investmentsCents).toBe(usd(5000));
  });
});
