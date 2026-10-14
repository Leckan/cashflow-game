/** Integer cents. The engine never uses binary floating point as the source of a balance. */
export type Cents = number;

export function usd(dollars: number): Cents {
  return Math.round(dollars * 100);
}

export function assertCents(value: number, label = "amount"): Cents {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer number of cents`);
  }
  return value;
}

export function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function formatMoney(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const dollars = Math.trunc(abs / 100);
  const rem = abs % 100;
  const body = `$${dollars.toLocaleString("en-US")}.${rem.toString().padStart(2, "0")}`;
  return negative ? `-${body}` : body;
}

export function formatSignedMoney(cents: number): string {
  if (cents > 0) return `+${formatMoney(cents)}`;
  return formatMoney(cents);
}
