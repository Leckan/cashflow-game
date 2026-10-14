"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Board2D } from "@/components/game/Board2D";
import { FinancialStatement } from "@/components/game/FinancialStatement";
import { Button } from "@/components/ui/button";
import { catalog } from "@/features/game/content";
import { coachPrompts, explainLocally } from "@/features/game/coach";
import { playCue } from "@/features/game/audio";
import { balanceSheet, netCashFlow, passiveCoversExpenses, passiveIncome, previewPurchase, projectStatement, totalExpenses } from "@/features/game/finance";
import { formatMoney, formatSignedMoney, usd } from "@/features/game/money";
import { buildReport } from "@/features/game/report";
import { useSettings } from "@/features/game/settings-store";
import { actionKey, clientApi } from "@/lib/client-api";
import type { Room } from "@/features/game/rooms";
import type { GameState as State } from "@/features/game/types";

const GameScene = dynamic(() => import("@/components/three/GameScene").then((mod) => mod.GameScene), {
  ssr: false,
  loading: () => <p className="p-6 text-paper/80">Bringing the table into view…</p>,
});

const repaySchema = z.object({ amount: z.string().min(1) });

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function subscribeWebGL() {
  return () => undefined;
}

export function GameApp({ gameId, roomCode }: { gameId?: string; roomCode?: string }) {
  const settings = useSettings();
  const [state, setState] = useState<State | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [member, setMember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(true);
  const webgl = useSyncExternalStore(subscribeWebGL, hasWebGL, () => true);
  const [resetSignal, setResetSignal] = useState(0);
  const [tab, setTab] = useState<"statement" | "ledger" | "goals" | "rules" | "coach">("statement");
  const [details, setDetails] = useState(false);
  const [coach, setCoach] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const repayForm = useForm<{ amount: string }>({ resolver: zodResolver(repaySchema), defaultValues: { amount: "100" } });

  useEffect(() => {
    useSettings.getState().hydrate();
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "r" || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      document.querySelector<HTMLButtonElement>("[data-testid='roll-dice']")?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loadGame = useCallback(async (id: string) => {
    const body = await clientApi<{ state: State }>(`/api/games/${id}`);
    setState(body.state);
  }, []);

  useEffect(() => {
    if (!gameId) return;
    let cancel = false;
    const timer = window.setTimeout(() => {
      void loadGame(gameId).catch((reason: Error) => {
        if (!cancel) setError(reason.message);
      });
    }, 0);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [gameId, loadGame]);

  const loadRoom = useCallback(async () => {
    if (!roomCode) return;
    const body = await clientApi<{ room: Room; member?: boolean }>(`/api/rooms/${roomCode}`);
    if ("members" in body.room) {
      setRoom(body.room);
      setMember(true);
      if (body.room.game) setState(body.room.game);
    } else {
      setMember(false);
    }
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;
    let cancel = false;
    const kickoff = window.setTimeout(() => {
      void loadRoom().catch((reason: Error) => {
        if (!cancel) setError(reason.message);
      });
    }, 0);
    const timer = window.setInterval(() => {
      if (!document.hidden) loadRoom().catch(() => undefined);
    }, 2000);
    return () => {
      cancel = true;
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
    };
  }, [roomCode, loadRoom]);

  const onArrive = useCallback(() => setReveal(true), []);

  async function send(action: Record<string, unknown>, cue: "dice" | "card" | "buy" | "turn") {
    const gameIdForAction = state?.id;
    if (!roomCode && !gameIdForAction) return;
    setBusy(true);
    setError(null);
    try {
      const endpoint = roomCode ? `/api/rooms/${roomCode}/actions` : `/api/games/${gameIdForAction}/actions`;
      const body = await clientApi<{ state?: State; room?: Room }>(endpoint, { method: "POST", body: JSON.stringify(action) });
      const next = body.state ?? body.room?.game ?? null;
      if (next) setState(next);
      if (body.room) setRoom(body.room);
      playCue(cue, settings.volume, settings.muted);
    } catch (reason) {
      const body = (reason as Error & { body?: { state?: State } }).body;
      if (body?.state) setState(body.state);
      setError(reason instanceof Error ? reason.message : "The action was refused.");
      setReveal(true);
    } finally {
      setBusy(false);
    }
  }

  const player = state?.players[state.activePlayerIndex];
  const card = catalog.cards.find((item) => item.id === state?.pending?.cardId);
  const space = catalog.board.find((item) => item.id === state?.pending?.spaceId);
  const offerId = card?.options.find((option) => option.effect.type === "buy")?.effect;
  const offer = offerId && offerId.type === "buy" ? catalog.offers.find((item) => item.id === offerId.offerId) : undefined;
  const preview = player && offer ? previewPurchase(player, offer, offerId && offerId.type === "buy" ? offerId.priceDiscountCents ?? 0 : 0) : null;
  const statement = player ? projectStatement(player) : null;
  const sheet = player ? balanceSheet(player) : null;
  const flat = settings.flatView || !webgl;
  const cardReady = flat || reveal;
  const report = state && player && state.status === "completed" ? buildReport(state, player.id) : null;

  const goalText = useMemo(() => {
    if (!statement) return "";
    const gap = totalExpenses(statement) - passiveIncome(statement);
    if (passiveCoversExpenses(statement)) return "Passive income covers this month.";
    return `${formatMoney(Math.max(gap, 0))} of passive income still needed to cover the month.`;
  }, [statement]);

  if (roomCode && !member) {
    return (
      <form
        className="mx-auto grid max-w-md gap-3 px-4 py-8"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void clientApi(`/api/rooms/${roomCode}/join`, {
            method: "POST",
            body: JSON.stringify({
              displayName: data.get("displayName"),
              avatarId: data.get("avatarId"),
              profileId: data.get("profileId"),
            }),
          }).then(() => loadRoom());
        }}
      >
        <h1 className="display text-4xl">Join {roomCode}</h1>
        <input name="displayName" required placeholder="Your name" className="h-11 bg-paper px-3 text-ink" />
        <select name="avatarId" className="h-11 bg-paper px-3 text-ink" defaultValue="tide">
          <option value="tide">Tide</option>
          <option value="cedar">Cedar</option>
          <option value="brass">Brass</option>
          <option value="plum">Plum</option>
          <option value="fern">Fern</option>
          <option value="clay">Clay</option>
        </select>
        <select name="profileId" className="h-11 bg-paper px-3 text-ink" defaultValue="early-career">
          {catalog.profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>{profile.name}</option>
          ))}
        </select>
        <Button type="submit">Take a seat</Button>
      </form>
    );
  }
  if (room && room.status === "lobby") {
    return (
      <section className="mx-auto max-w-xl px-4 py-8">
        <h1 className="display text-4xl">Room {room.code}</h1>
        <p className="mt-3 text-paper/80">Share the code. The host starts when at least two people are seated. Dice and balances are decided on the server.</p>
        <ul className="mt-4 space-y-2">
          {room.members.map((member) => (
            <li key={member.playerId}>
              {member.displayName} {member.playerId === room.hostPlayerId ? "(host)" : ""} {member.connected ? "" : "(away)"}
            </li>
          ))}
        </ul>
        <Button className="mt-6" onClick={() => send({ type: "start" }, "turn")}>
          Start the room
        </Button>
        {error && <p className="mt-3 text-persimmon">{error}</p>}
      </section>
    );
  }
  if (!state || !player || !statement || !sheet) {
    return <p className="p-6">{error ?? "Setting the table…"}</p>;
  }

  return (
    <div className="grid min-h-[calc(100dvh-8rem)] grid-rows-[auto_minmax(320px,1fr)_auto] bg-felt-deep">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-sm">
        <p>
          Month {state.turnNumber}
          <span className="text-paper/60"> · {player.displayName}</span>
          <span className="ml-3">
            Cash <span data-testid="cash-balance">{formatMoney(player.cashCents)}</span>
          </span>
          <span className="ml-3 hidden sm:inline">
            Net worth <span data-testid="net-worth">{formatMoney(sheet.netWorthCents)}</span>
          </span>
        </p>
        <p className="sr-only" aria-live="polite">
          {state.phase === "awaiting_roll" ? "Ready to roll." : card ? `${card.title}. ${card.description}` : state.endingReason}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="quiet" onClick={() => settings.update({ flatView: !settings.flatView })} data-testid="flat-toggle">
            {flat ? "3D table" : "Flat table"}
          </Button>
          <Button size="sm" variant="quiet" onClick={() => setResetSignal((value) => value + 1)}>
            Reset camera
          </Button>
          <Button size="sm" variant="quiet" onClick={() => settings.update({ muted: !settings.muted })}>
            {settings.muted ? "Unmute" : "Mute"}
          </Button>
        </div>
      </div>
      <div className="grid min-h-0 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="hidden border-r border-white/10 p-4 lg:block">
          <p className="text-sm text-paper/70">{player.displayName}</p>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-sm text-paper/60">Cash</dt>
              <dd className="display text-2xl">{formatMoney(player.cashCents)}</dd>
            </div>
            <div>
              <dt className="text-sm text-paper/60">Monthly cash flow</dt>
              <dd className={netCashFlow(statement) >= 0 ? "text-sap" : "text-persimmon"}>{formatSignedMoney(netCashFlow(statement))}</dd>
            </div>
            <div>
              <dt className="text-sm text-paper/60">Net worth</dt>
              <dd>{formatMoney(sheet.netWorthCents)}</dd>
            </div>
            <div>
              <dt className="text-sm text-paper/60">Passive income</dt>
              <dd>{formatMoney(passiveIncome(statement))}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-6 text-paper/80">{goalText}</p>
          {state.players.length > 1 && (
            <ul className="mt-4 space-y-2 text-sm">
              {state.players.map((other) => (
                <li key={other.id}>
                  {other.displayName}: {formatMoney(other.cashCents)} cash
                </li>
              ))}
            </ul>
          )}
        </aside>
        <div className="relative min-h-[320px]" data-testid="board-region">
          {flat ? (
            <Board2D state={state} />
          ) : (
            <GameScene state={state} quality={settings.quality} reducedMotion={settings.reducedMotion} resetSignal={resetSignal} onArrive={onArrive} />
          )}
          {!webgl && <p className="absolute bottom-3 left-3 text-sm">WebGL is unavailable, so the flat table is on.</p>}
        </div>
        <aside className="border-t border-white/10 p-4 lg:border-t-0 lg:border-l" data-testid="decision-panel">
          {state.status === "completed" && report ? (
            <div data-testid="game-ending">
              <h2 className="display text-3xl">{report.ending?.replaceAll("_", " ")}</h2>
              <p className="mt-2 text-sm leading-6">{report.endingReason}</p>
              <p className="mt-3 text-sm">Score {report.score}. Risk care {report.riskScore} out of 100.</p>
            </div>
          ) : state.phase === "awaiting_roll" ? (
            <div>
              <h2 className="display text-3xl">Your month</h2>
              <p className="mt-2 text-sm leading-6 text-paper/80">Look at the statement, repay a debt if you want, then roll. The dice result is stored before the token moves.</p>
              <Button className="mt-4" data-testid="roll-dice" disabled={busy} onClick={() => { if (!flat) setReveal(false); void send({ type: "roll", idempotencyKey: actionKey() }, "dice"); }}>
                Roll the dice
              </Button>
            </div>
          ) : (
            cardReady && card && (
              <div>
                <p className="text-sm text-brass">{space?.name}</p>
                <h2 className="display mt-1 text-3xl">{card.title}</h2>
                <p className="mt-2 text-sm leading-6">{card.description}</p>
                <p className="mt-2 text-xs text-paper/60">Hypothetical scenario. Not a forecast or an offer.</p>
                {preview && offer && !state.pending?.optionId && (
                  <div className="mt-3 text-sm leading-6">
                    <p>Cash required {formatMoney(preview.cashRequiredCents)}</p>
                    <p>Projected cash flow {formatSignedMoney(preview.projectedCashFlowCents)} / month</p>
                    <p>Cash left {formatMoney(preview.remainingCashCents)}</p>
                    <button type="button" className="mt-1 underline" onClick={() => setDetails((value) => !value)}>
                      {details ? "Hide details" : "Review details"}
                    </button>
                    {details && (
                      <div className="mt-2 space-y-2 text-paper/80">
                        {offer.assumptions.map((item) => <p key={item}>{item}</p>)}
                        <p>Best: {preview.scenarios.best.notes}</p>
                        <p>Base: {preview.scenarios.base.notes}</p>
                        <p>Downside: {preview.scenarios.downside.notes}</p>
                        <p>{offer.educationalExplanation}</p>
                      </div>
                    )}
                  </div>
                )}
                {!state.pending?.optionId && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {card.options.map((option) => (
                    <Button
                      key={option.id}
                      data-testid={`option-${option.id}`}
                      variant={option.id === "decline" || option.id === "skip" ? "quiet" : "brass"}
                      disabled={busy}
                      onClick={() => void send({ type: "decide", idempotencyKey: actionKey(), optionId: option.id }, option.effect.type === "buy" ? "buy" : "card")}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                )}
                {state.phase === "ready_to_end" && (
                  <Button className="mt-4" data-testid="end-turn" disabled={busy} onClick={() => void send({ type: "end_turn", idempotencyKey: actionKey() }, "turn")}>
                    End the month
                  </Button>
                )}
                {card && state.phase === "ready_to_end" && <p className="mt-3 text-sm leading-6 text-paper/80">{card.educationalExplanation}</p>}
              </div>
            )
          )}
          {error && <p className="mt-3 text-sm text-persimmon">{error}</p>}
          {state.status !== "completed" && player.liabilities.length > 0 && (
            <form
              className="mt-4 flex gap-2"
              onSubmit={repayForm.handleSubmit((values) => {
                const liability = player.liabilities[0];
                if (!liability) return;
                void send({ type: "repay", idempotencyKey: actionKey(), liabilityId: liability.id, amountCents: usd(Number(values.amount)) }, "card");
              })}
            >
              <label className="text-sm">
                Repay {player.liabilities[0]?.name}
                <input className="mt-1 block h-9 w-24 bg-paper px-2 text-ink" {...repayForm.register("amount")} inputMode="decimal" />
              </label>
              <Button size="sm" type="submit" variant="quiet">Pay</Button>
            </form>
          )}
        </aside>
      </div>
      <div className="border-t border-white/10 bg-paper text-ink">
        <div className="flex gap-2 overflow-x-auto px-3 py-2 text-sm">
          {(["statement", "ledger", "goals", "rules", "coach"] as const).map((item) => (
            <button key={item} type="button" data-testid={`${item}-tab`} className={tab === item ? "bg-ink px-3 py-1 text-paper" : "px-3 py-1"} onClick={() => setTab(item)}>
              {item === "statement" ? "Statement" : item === "ledger" ? "Ledger" : item === "goals" ? "Goals" : item === "rules" ? "Rules" : "Coach"}
            </button>
          ))}
        </div>
        <div className="max-h-72 overflow-auto px-4 pb-4">
          {tab === "statement" && <FinancialStatement player={player} />}
          {tab === "ledger" && (
            <ul className="space-y-2 text-sm">
              {player.ledger.length === 0 && <li>No transactions yet. Ending the month will settle income and expenses.</li>}
              {player.ledger.map((entry) => (
                <li key={entry.id}>Month {entry.turnNumber}: {entry.description} ({formatSignedMoney(entry.accountDeltas.find((delta) => delta.account === "cash")?.deltaCents ?? 0)} cash)</li>
              ))}
            </ul>
          )}
          {tab === "goals" && (
            <div className="text-sm leading-6">
              <p>{goalText}</p>
              <p className="mt-2">{state.endingReason ?? "Win when passive income covers monthly expenses and cash is not negative. A high net worth alone is a different ending."}</p>
              {report && report.formulas.map((line) => <p key={line} className="mt-2">{line}</p>)}
            </div>
          )}
          {tab === "rules" && (
            <div className="max-w-3xl text-sm leading-6">
              <p>Each turn is one month. Roll, resolve the space, then end the month. Recurring income and expenses settle at the end, in integer cents.</p>
              <p className="mt-2">Salary is earned. Rent, distributions, and businesses marked passive count toward independence. A deal stays hypothetical until you choose Buy. Decline leaves the statement unchanged.</p>
              <p className="mt-2">If a bill is larger than cash, a hardship bridge may cover the gap up to four months of expenses. Past that, the game ends in distress. Press R to roll when the button is available.</p>
            </div>
          )}
          {tab === "coach" && (
            <div className="text-sm leading-6">
              <div className="flex flex-wrap gap-2">
                {coachPrompts().map((prompt) => (
                  <button key={prompt.id} type="button" className="border border-ink/20 px-2 py-1" onClick={() => setCoach(explainLocally(state, player.id, prompt.id).answer)}>
                    {prompt.label}
                  </button>
                ))}
              </div>
              {coach && <p className="mt-3 max-w-3xl">{coach}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
