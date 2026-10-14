import { balanceSheet, emergencyReserveMonths, netCashFlow, passiveIncome, projectStatement, totalExpenses } from "./finance";
import { formatMoney } from "./money";
import type { GameState } from "./types";

export interface CoachReply {
  question: string;
  answer: string;
  source: "local-rules";
}

const prompts = [
  { id: "cashflow", label: "Why did this change my monthly cash flow?" },
  { id: "net-worth", label: "Why is net worth up while cash is low?" },
  { id: "vacancy", label: "What would a vacancy do?" },
  { id: "debt", label: "What are the risks of this debt?" },
  { id: "next", label: "What could I do differently next game?" },
] as const;

export function coachPrompts() {
  return prompts;
}

export function explainLocally(state: GameState, playerId: string, questionId: string): CoachReply {
  const player = state.players.find((item) => item.id === playerId) ?? state.players[0];
  if (!player) {
    return { question: questionId, answer: "There is no player on this game yet.", source: "local-rules" };
  }
  const statement = projectStatement(player);
  const sheet = balanceSheet(player);
  const flow = netCashFlow(statement);
  const passive = passiveIncome(statement);
  const expenses = totalExpenses(statement);
  const reserve = emergencyReserveMonths(player, statement);
  const prompt = prompts.find((item) => item.id === questionId)?.label ?? questionId;

  if (questionId === "net-worth") {
    return {
      question: prompt,
      source: "local-rules",
      answer: `Net worth is ${formatMoney(sheet.netWorthCents)} because assets are ${formatMoney(sheet.totalAssetsCents)} and liabilities are ${formatMoney(sheet.totalLiabilitiesCents)}. Cash is only ${formatMoney(player.cashCents)} of those assets. A down payment can leave cash low while the building and the loan both sit on the sheet. The building is not spendable cash.`,
    };
  }
  if (questionId === "vacancy") {
    const rental = player.assets.find((asset) => asset.assetType === "real_estate");
    if (!rental) {
      return {
        question: prompt,
        source: "local-rules",
        answer: "You do not own a rental in this game, so a vacancy card has nothing to pause. The lesson still stands: a loan payment continues when rent stops.",
      };
    }
    return {
      question: prompt,
      source: "local-rules",
      answer: `${rental.name} is modeled at ${formatMoney(rental.recurringIncomeCents)} of monthly income and ${formatMoney(rental.recurringExpenseCents)} of operating cost. A vacancy in this game pauses that income for two months. The linked loan payment stays in your expenses. The base-case cash flow assumed the unit was full.`,
    };
  }
  if (questionId === "debt") {
    const debt = sheet.totalLiabilitiesCents;
    return {
      question: prompt,
      source: "local-rules",
      answer: `You owe ${formatMoney(debt)}, and debt payments are ${formatMoney(statement.debtPaymentCents)} of the month. Payments are expenses, so they raise the passive income you need before independence. A hardship bridge, if you have one, is expensive fictional borrowing because a bill exceeded cash. None of these rates are offers from a real lender.`,
    };
  }
  if (questionId === "next") {
    const reserveText = reserve == null ? "Expenses are zero, so a reserve ratio is not defined." : `Cash covers about ${reserve.toFixed(1)} months of expenses.`;
    return {
      question: prompt,
      source: "local-rules",
      answer: `${reserveText} Next game, compare cash after a purchase with at least a couple of months of expenses before treating a positive deal as safe. Passive income is ${formatMoney(passive)} and the month costs ${formatMoney(expenses)}. Salary does not close that gap forever.`,
    };
  }
  return {
    question: prompt,
    source: "local-rules",
    answer: `Monthly cash flow is ${formatMoney(flow)}. That is income of ${formatMoney(statement.salaryCents + statement.otherEarnedCents + statement.businessIncomeCents + statement.rentalIncomeCents + statement.investmentIncomeCents)} minus expenses of ${formatMoney(expenses)}. Passive income is ${formatMoney(passive)} and does not include salary. A purchase changes this only when its income, operating cost, or loan payment is now on the statement. The figures are game assumptions.`,
  };
}
