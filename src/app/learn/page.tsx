const lessons = [
  ["Cash flow", "Money that arrives each month minus money that leaves each month. A paycheck raises it only while the work continues."],
  ["Assets and liabilities", "An asset is something you own. A liability is something you owe. Net worth subtracts the second from the first. Owning a building and owing its loan is one story, not two wins."],
  ["Passive income", "In this game, rent, distributions, and some business profits count. Salary does not. Independence means that passive income covers the month’s expenses."],
  ["Debt", "A loan can buy an income-producing asset. The payment is still an expense. If the payment and the operating costs exceed the income, the deal makes the month harder."],
  ["Reserves", "Cash pays a surprise bill. A marked-up fund price does not, unless you sell. This game will invent a hardship loan only up to a cap, then it stops."],
  ["Risk", "Every opportunity card is a hypothesis: rent stays full, machines keep working, a fictional price holds. The downside column is part of the decision."],
];

export default function LearnPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="display text-5xl">The ideas on the table</h1>
      <p className="mt-4 max-w-2xl leading-7 text-paper/80">
        Short explanations for the words the game uses. They describe the rules of WealthQuest, not your taxes, your lease, or a security you can buy.
      </p>
      <div className="mt-8 space-y-8">
        {lessons.map(([title, copy]) => (
          <section key={title}>
            <h2 className="display text-3xl">{title}</h2>
            <p className="mt-2 max-w-2xl leading-7 text-paper/85">{copy}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
