import Link from "next/link";
import { brand } from "@/config/brand";

const steps = [
  ["Roll", "One month begins. The dice are recorded before the token moves."],
  ["Read", "A fictional deal shows the cash to start, the loan, and what is left in a base month."],
  ["See it", "Buy or decline. The statement changes only when you confirm."],
];

export default function HomePage() {
  return (
    <main className="grid items-center gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,460px)]">
      <div className="max-w-xl">
        <h1 className="display text-5xl leading-[1.05] text-paper sm:text-6xl">Put a paycheck on the table.</h1>
        <p className="mt-5 max-w-lg text-lg leading-8 text-paper/80">
          {brand.name} is a fictional board game about cash, debt, and income that shows up more than once. The deals are invented. The arithmetic is not.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/play" className="inline-flex h-11 items-center bg-brass px-4 font-semibold text-ink" data-testid="start-solo">
            Play a solo game
          </Link>
          <Link href="/learn" className="inline-flex h-11 items-center border border-paper/30 px-4 text-paper">
            Read the ideas first
          </Link>
        </div>
        <ol className="mt-10 space-y-4">
          {steps.map(([title, copy], index) => (
            <li key={title} className="grid grid-cols-[2rem_1fr] gap-3">
              <span className="display text-2xl text-brass">{index + 1}</span>
              <p>
                <span className="font-semibold">{title}. </span>
                <span className="text-paper/80">{copy}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>
      <div className="table-mark relative aspect-square border border-brass/40 p-6" aria-hidden>
        <div className="absolute inset-8 border border-brass/50" />
        <div className="absolute inset-[28%] flex items-center justify-center border border-paper/20 text-center">
          <p className="display px-4 text-3xl text-brass">Independence Spire</p>
        </div>
        {[
          ["Payday", "8%", "22%"],
          ["Maple", "78%", "22%"],
          ["Market", "78%", "78%"],
          ["Review", "18%", "78%"],
        ].map(([label, left, top]) => (
          <span key={label} className="absolute bg-paper px-2 py-1 text-xs text-ink" style={{ left, top }}>
            {label}
          </span>
        ))}
        <span className="absolute left-[42%] top-[18%] h-4 w-4 rounded-full bg-tide" />
      </div>
    </main>
  );
}
