# WealthQuest 3D

A browser board game about turning a paycheck into income that shows up again. The board, cards, and deals are original. Every investment is a labeled simulation. Nothing in the game is a forecast, an offer, or financial, tax, or legal advice.

The product name is configurable with `NEXT_PUBLIC_BRAND_NAME` and `NEXT_PUBLIC_BRAND_PRODUCT`.

## Run it locally

Node.js 22 is required. This repo was installed with npm 11 because npm 10 can fail while resolving Vitest.

```bash
npm install -g npm@11
npm ci
npm run dev
```

Open http://localhost:3000. No database, account, or API key is required. Games save as JSON under `.data/`.

A local account, if you want one, accepts any email and the password `playlocal` on `/profile`.

## Commands

```bash
npm run dev          # development server
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm test             # financial engine and room tests
npm run build        # production build
npm run start        # serve the production build
npm run test:e2e     # Playwright against the dev server
npm run db:migrate   # no-op unless DATABASE_URL is set
npm run db:seed      # no-op unless DATABASE_URL is set
```

## Environment

Copy `.env.example` to `.env.local`. Every variable is optional.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres. When set, each save also writes normalized rows. File saves still succeed if the write fails. |
| `AUTH_SECRET` or `NEXTAUTH_SECRET` | Session signing. A documented local default is used when both are unset. |
| `NEXTAUTH_URL` | Public URL for Auth.js, for example `http://localhost:3000`. |
| `NEXT_PUBLIC_BRAND_NAME` | Short name. Default `WealthQuest`. |
| `NEXT_PUBLIC_BRAND_PRODUCT` | Product title. Default `WealthQuest 3D`. |
| `NEXT_PUBLIC_MULTIPLAYER_ENABLED` | Set to `false` to turn private rooms off. |
| `GAME_DATA_DIR` | Directory for JSON saves. Default `.data`. |

## Database

Local play does not need Postgres.

```bash
docker compose up db
```

Then set:

```bash
DATABASE_URL=postgresql://wealthquest:wealthquest@localhost:5432/wealthquest
```

```bash
npm run db:migrate
npm run db:seed
```

`docker compose up --build` starts Postgres and the app together. The image migrates and seeds on boot.

## Tests

```bash
npm test
npm run test:e2e
```

The browser test starts a duplex challenge, buys the fictional Maple Street listing, checks the statement, ends the month, and reloads the saved game. A second test uses a phone-sized viewport, the flat board, and the R key.

## Deploy

The app is a Next.js server that also writes `.data/`. On Vercel, attach a Postgres database and set `DATABASE_URL` plus `AUTH_SECRET`. File saves on a serverless disk do not persist, so cloud play needs the database. Set `NEXTAUTH_URL` to the deployment URL.

Private rooms use HTTP polling. They do not require Redis or a WebSocket server.

## More

- [Architecture](docs/architecture.md)
- [Financial calculations](docs/financial-calculations.md)
