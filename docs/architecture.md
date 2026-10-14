# Architecture

WealthQuest keeps the rules in plain TypeScript. React and Three.js render a state object they do not calculate.

## Modules

- `src/features/game/finance.ts` — accounts, ledger, purchases, loans, cash shortfalls.
- `src/features/game/engine.ts` — turn machine: roll, decide, repay, end the month.
- `src/features/game/content/` — profiles, 32 board spaces, cards, offers, challenges.
- `src/features/game/rooms.ts` — private-room membership and server-side actions.
- `src/features/game/coach.ts` — rule-based explanations. No model API.
- `src/server/store.ts` — JSON files under `.data`, with a keyed lock around each mutation.
- `src/server/project.ts` — optional copy of a finished state into Postgres.
- `src/components/three/GameScene.tsx` — procedural board. The dice animation is cosmetic; the result is already in state.
- `src/components/game/Board2D.tsx` — flat board used when WebGL is missing or the player asks for it.

Rules version is `2026.1`. A saved game stores that version with the seed and the random cursor.

## Turn

Phases are `awaiting_roll`, `awaiting_decision`, `ready_to_end`, and `completed`.

1. The client sends `{ type: "roll" }` with an idempotency key. The server rolls from the seed, moves the token, and draws a card.
2. The player chooses an option. Buy is a separate confirmation. Opening the card does not purchase anything.
3. End the month. Loans amortize, then recurring cash flow settles. A hardship bridge created during settlement is not amortized in that same month.
4. The engine checks the challenge, independence, the tutorial script, and the month limit.

A repeated idempotency key returns the same state. A failed purchase does not store the key. Another player’s id is rejected.

## Persistence

The file in `.data/games` is what solo play loads. When `DATABASE_URL` is set, `projectGame` writes users, sessions, players, accounts, transactions, assets, liabilities, events, and a snapshot inside one SQL transaction. A projection error is logged and does not undo the file save.

Guest identity is the httpOnly cookie `wq_gid`. Mutations require the header `x-wealthquest-request: 1`.

## Multiplayer

`POST /api/rooms` creates a code. The host starts when two people have joined. `actInRoom` forces the actor id from the session, then calls the same `dispatch` function as solo play. Clients poll about every two seconds. WebSockets are not implemented; the room service is the place to add them.

Set `NEXT_PUBLIC_MULTIPLAYER_ENABLED=false` to refuse new rooms.

## What the client is allowed to send

Actions: roll, decide, repay, end the month, and room start. The client never sends a balance, a dice total, or an owned-asset list. Those come back from the server.
