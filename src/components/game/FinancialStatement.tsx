"use client";

import { balanceSheet, debtToAssetRatio, emergencyReserveMonths, netCashFlow, passiveCoverageRatio, passiveIncome, projectStatement, totalExpenses, totalIncome, unrealizedGainCents } from "@/features/game/finance";
import { formatMoney, formatSignedMoney } from "@/features/game/money";
import type { PlayerState } from "@/features/game/types";

function Row({ label, value, tone }: { label: string; value: string; tone?: "sap" | "persimmon" }) {
  return (
    <tr>
      <th scope="row" className="py-1 pr-4 text-left font-normal text-ink/80">
        {label}
      </th>
      <td className={tone === "sap" ? "text-right text-sap" : tone === "persimmon" ? "text-right text-persimmon" : "text-right"}>{value}</td>
    </tr>
  );
}

export function FinancialStatement({ player }: { player: PlayerState }) {
  const statement = projectStatement(player);
  const sheet = balanceSheet(player);
  const flow = netCashFlow(statement);
  const coverage = passiveCoverageRatio(statement);
  const reserve = emergencyReserveMonths(player, statement);
  const ratio = debtToAssetRatio(sheet);
  return (
    <div data-testid="financial-statement" className="grid gap-6 text-ink md:grid-cols-3">
      <section>
        <h3 className="display text-xl">Income statement</h3>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">Monthly income and expenses</caption>
          <tbody>
            <Row label="Salary and wages" value={formatMoney(statement.salaryCents)} />
            <Row label="Other earned income" value={formatMoney(statement.otherEarnedCents)} />
            <Row label="Business income" value={formatMoney(statement.businessIncomeCents)} />
            <Row label="Rental income" value={formatMoney(statement.rentalIncomeCents)} />
            <Row label="Investment income" value={formatMoney(statement.investmentIncomeCents)} />
            <Row label="Living expenses" value={formatMoney(statement.livingExpenseCents)} tone="persimmon" />
            <Row label="Operating expenses" value={formatMoney(statement.operatingExpenseCents)} tone="persimmon" />
            <Row label="Loan payments" value={formatMoney(statement.debtPaymentCents)} tone="persimmon" />
            <Row label="Taxes and fees" value={formatMoney(statement.taxCents)} tone="persimmon" />
            <Row label="Net monthly cash flow" value={formatSignedMoney(flow)} tone={flow >= 0 ? "sap" : "persimmon"} />
          </tbody>
        </table>
        <p className="mt-2 text-xs leading-5 text-ink/70">Income {formatMoney(totalIncome(statement))} minus expenses {formatMoney(totalExpenses(statement))}.</p>
      </section>
      <section>
        <h3 className="display text-xl">Balance sheet</h3>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">Assets, liabilities, and net worth</caption>
          <tbody>
            <Row label="Cash" value={formatMoney(sheet.cashCents)} />
            <Row label="Investments" value={formatMoney(sheet.investmentsCents)} />
            <Row label="Property value" value={formatMoney(sheet.propertyCents)} />
            <Row label="Business assets" value={formatMoney(sheet.businessAssetCents)} />
            <Row label="Other assets" value={formatMoney(sheet.otherAssetsCents)} />
            <Row label="Mortgages" value={formatMoney(sheet.mortgageCents)} />
            <Row label="Other debt" value={formatMoney(sheet.otherDebtCents)} />
            <Row label="Total assets" value={formatMoney(sheet.totalAssetsCents)} />
            <Row label="Total liabilities" value={formatMoney(sheet.totalLiabilitiesCents)} />
            <Row label="Net worth" value={formatMoney(sheet.netWorthCents)} />
          </tbody>
        </table>
        <p className="mt-2 text-xs leading-5 text-ink/70">Business equity, already inside net worth, is {formatMoney(sheet.businessEquityCents)}.</p>
      </section>
      <section>
        <h3 className="display text-xl">Portfolio</h3>
        <ul className="mt-2 space-y-2 text-sm">
          <li>Passive income {formatMoney(passiveIncome(statement))}</li>
          <li>Coverage {coverage == null ? "not defined while expenses are zero" : `${Math.round(coverage * 100)}% of expenses`}</li>
          <li>Reserve {reserve == null ? "not defined" : `${reserve.toFixed(1)} months`}</li>
          <li>Debt to assets {ratio == null ? "not defined" : `${Math.round(ratio * 100)}%`}</li>
          <li>Unrealized price change {formatMoney(unrealizedGainCents(player))}</li>
        </ul>
        <ul className="mt-3 space-y-2 text-sm">
          {player.assets.length === 0 && <li>No assets yet.</li>}
          {player.assets.map((asset) => (
            <li key={asset.id} data-testid={`asset-${asset.offerId ?? asset.id}`}>
              {asset.name}: {formatMoney(asset.recurringIncomeCents)} in, {formatMoney(asset.recurringExpenseCents)} operating
              {asset.incomePausedTurns > 0 ? `, income paused ${asset.incomePausedTurns} month${asset.incomePausedTurns === 1 ? "" : "s"}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
