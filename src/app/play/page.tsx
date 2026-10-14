import Link from "next/link";
import { catalog } from "@/features/game/content";

export default function PlayPage() {
  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-6 sm:px-6">
      <div>
        <h1 className="display text-5xl">Choose a table</h1>
        <p className="mt-3 max-w-2xl text-paper/80">No account is required. Games save in this browser’s server files, and in Postgres when you configure it.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/play/tutorial" className="border border-paper/20 p-5 hover:border-brass">
          <h2 className="display text-3xl">Financial foundations</h2>
          <p className="mt-2 text-sm leading-6 text-paper/80">Four guided turns: paycheck, a duplex you probably cannot afford yet, a small bill, and the win condition.</p>
        </Link>
        <Link href="/play/solo/new" className="border border-paper/20 p-5 hover:border-brass">
          <h2 className="display text-3xl">Solo wealth journey</h2>
          <p className="mt-2 text-sm leading-6 text-paper/80">Pick a fictional starting profile and play until independence, distress, or the month limit.</p>
        </Link>
        <Link href="/play/room/new" className="border border-paper/20 p-5 hover:border-brass">
          <h2 className="display text-3xl">Private room</h2>
          <p className="mt-2 text-sm leading-6 text-paper/80">Invite with a code. The server rolls the dice and refuses actions on someone else’s turn.</p>
        </Link>
        <Link href="/play/solo/new?challenge=duplex-on-the-table" className="border border-paper/20 p-5 hover:border-brass" data-testid="duplex-drill">
          <h2 className="display text-3xl">The duplex drill</h2>
          <p className="mt-2 text-sm leading-6 text-paper/80">A short challenge with enough fictional savings to decide on Maple Street in the first month.</p>
        </Link>
      </div>
      <section>
        <h2 className="display text-3xl">Other challenges</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {catalog.challenges.filter((challenge) => challenge.id !== "duplex-on-the-table").map((challenge) => (
            <li key={challenge.id}>
              <Link href={`/play/solo/new?challenge=${challenge.id}`} className="block border border-white/10 p-4 hover:border-brass">
                <span className="font-semibold">{challenge.title}</span>
                <span className="mt-1 block text-sm text-paper/75">{challenge.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
