# Financial calculations

Money is integer cents. `usd(4500)` is `450000`. Interest uses `Math.round` on an integer product. Balances are not stored as binary floating-point dollars.

These figures are game rules. The Maple Street sheet is a fictional listing, not a market quote.

## Income statement

Monthly income is salary, other earned income, passive business income, rental income, and investment income.

Monthly expenses are living costs, asset operating costs, debt payments, and the profile’s base tax.

```text
monthly cash flow = monthly income − monthly expenses
```

One-time cash events are ledger lines. They are not part of the recurring cash-flow figure.

Passive income is rental income, investment income, and business income on assets flagged passive. Salary and an owner draw are earned. The entrepreneur profile’s business asset does not count as passive.

```text
coverage = passive income / monthly expenses
```

If monthly expenses are zero, coverage is null. Independence is still true when passive income is at least zero and cash is not negative.

## Balance sheet

```text
total assets = cash + securities + property value + business asset value + other assets
total liabilities = every liability principal, including mortgages
net worth = total assets − total liabilities
```

A property is booked at its current value. The mortgage is a separate liability. Equity is the difference and is not added again. Business equity on the statement is a memo: business asset value minus business-note principal. That memo is already inside net worth.

Closing costs reduce cash and do not increase the asset, so they reduce net worth. On Maple Street that change is −$4,000.

Unrealized price change is current value minus purchase price, scaled by ownership. It is not cash.

## Maple Street Duplex

Hypothetical assumptions used by the card:

- Purchase price $180,000
- Down payment $36,000
- Closing costs $4,000
- Loan $144,000 at 650 basis points
- Rent $2,400
- Operating costs $700
- Debt service $1,250

```text
base cash flow = 2400 − 700 − 1250 = 450
cash required = 36000 + 4000 = 40000
```

Vacancy, repairs, a rate change, and a lower resale price are listed as risks. The base month does not include them.

## Loans

```text
monthly interest = round(principal cents × annual basis points / (10000 × 12))
principal reduction = min(principal, max(0, payment − interest))
```

A $144,000 loan at 6.50% has $780 of interest in the first month. The $1,250 payment reduces principal by $470. The payment itself is already in monthly expenses, so amortization does not move cash a second time.

The hardship bridge, when a required bill exceeds cash, is a fictional 24% line. Its payment is that month’s interest plus the greater of $25 and 1% of principal. The line can grow only up to four months of total expenses. Past that cap the action ends in distress and cash is left unchanged. Courses, insurance, and gifts cannot use the bridge.

## Ownership

Income, expenses, and value are multiplied by ownership basis points and rounded. A 50% stake is half of each.

## Independence

The default win is recurring passive income greater than or equal to monthly expenses, with cash at least zero. Cash covering three months of expenses is the stronger ending `independence_reserve`. A higher net worth without that coverage is `net_worth_only` when the month limit hits.

Challenge games can end earlier when their objective is met. The duplex drill ends after a cash-flow-positive asset is owned and the month is settled.

## Ledger invariant

```text
opening cash + sum of cash deltas on the ledger = current cash
```

Each entry has an id, a turn, a type, an amount, and account deltas. Purchases, repayments, amortization, and settlement all write one.

## Score

The end-of-game score adds a scaled change in net worth, passive income, and reserve months, then subtracts hardship borrowing. Independence and challenge endings add a bonus. It is a game score, not a measure of real wealth.
