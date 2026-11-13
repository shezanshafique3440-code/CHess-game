# Sangat Chess monorepo

An npm workspaces monorepo with the existing bilingual, offline-capable local chess app and a new authentication API. Local chess gameplay is unchanged and does not require an account or server. This step adds a protected account lobby, not online games, matchmaking, server-side move handling, or rating updates.

```text
apps/web/                  React + TypeScript + Vite; existing chess app
  src/App.tsx              Existing local gameplay (unchanged)
  src/AuthShell.tsx         Public local chess and hash-based account routes
  src/auth/                Zustand auth store and English/Urdu auth copy
  src/components/          Existing components plus auth/lobby screens
apps/server/               Node + TypeScript + Express
  src/                     API, configuration, validation
  prisma/schema.prisma     User, Game, Move schema
  prisma/migrations/       Checked-in SQL generated from that schema
  scripts/                 SQL migration and isolated test runners
  tests/                   Auth endpoint and validation tests
scripts/setup-env.mjs       Creates local .env files and a random JWT secret
docker-compose.yml        Local PostgreSQL 16 with persistent data
```

## Local setup (Windows PowerShell)

Install **Node.js 22.12+ (Node 24 recommended)**, **Git**, and **Docker Desktop**. Start Docker Desktop and use Linux containers. Run these commands from the repository root:

```powershell
git pull
npm.cmd run setup:env
npm.cmd ci
docker compose up -d --wait postgres
npm.cmd run db:migrate
npm.cmd run dev
```

For a fresh clone, first run `git clone https://github.com/shezanshafique3440-code/CHess-game.git` and `cd CHess-game`. On macOS/Linux, use `npm` in place of `npm.cmd`.

- Open **http://localhost:5173**. Local chess is still the default screen.
- **Sign in / Create account / Play as guest** lead to the account lobby. Direct lobby navigation redirects anonymous visitors to sign-in.
- The API runs at **http://localhost:3001**, with a basic `/health` endpoint. Vite proxies `/api/*` to this API, removing `/api`.
- `npm run dev` starts both applications and terminates the other process if one fails. Ctrl+C stops the servers. `docker compose stop` stops PostgreSQL without deleting data.
- To use just the existing local chess app: `npm run dev:web`. It works when PostgreSQL or the API is unavailable, including its existing offline PWA behavior.

`setup:env` creates `apps/server/.env` and `apps/web/.env` only when they do not exist. It generates a random JWT secret locally and preserves existing files. It uses only built-in Node modules, so it works before dependency installation. `.env` files are ignored by Git. Both apps include `.env.example` files for manual configuration.

Use **localhost**, not a LAN IP, for HTTP development: browsers allow Secure cookies on localhost. Real deployments require HTTPS; Secure cookies are never disabled in this app.

### PostgreSQL and migrations

The Compose service binds PostgreSQL to **127.0.0.1:5432**, creates the `sangat` development database and `sangat_test` test database, and keeps data in a named volume. The checked-in username/password are **local development defaults only**. A database already using port 5432 must be stopped or configured on a different port with matching `.env` URLs.

If a pre-existing volume does not contain the test database, create it without deleting the development database:

```powershell
docker compose exec postgres createdb -U sangat sangat_test
```

Prisma uses its JavaScript query engine with `@prisma/adapter-pg`. `npm ci` generates the client and copies the existing Stockfish worker/WASM into `apps/web/public/engine/`.

`npm run db:migrate` applies the checked-in Prisma-generated SQL through a small `pg` runner. It serializes runs with a PostgreSQL advisory lock, applies each migration in a transaction, and stores SHA-256 checksums in `_sangat_migrations`. It is safe to repeat and rejects edits to already-applied migrations. This avoids native Prisma schema-engine downloads and an unsupported PostgreSQL type in Prisma 6's experimental JS migration adapter. **Use this runner for deployment, not `prisma migrate deploy`; their migration ledgers are different.** Never edit an applied migration; add a new migration directory for future schema changes. These migrations currently target the `public` schema.

The initial SQL was generated using `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` in `apps/server`. The Prisma config enables its JS adapter for schema generation/diff; the runtime client is built with `engineType = "client"`.

## API

All paths below are relative to the API origin; use `/api/auth/...` through the web development proxy. Responses use `{ user: ... }`, or `{ code: ... }` for errors. Password hashes and JWTs are never returned in JSON.

| Method | Path             | Body                                                                                           | Success                                         |
| ------ | ---------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| POST   | `/auth/register` | `{ "username": "player_one", "email": "player@example.com", "password": "a-unique-password" }` | 201 + session cookie                            |
| POST   | `/auth/login`    | `{ "email": "player@example.com", "password": "a-unique-password" }`                           | 200 + session cookie                            |
| POST   | `/auth/guest`    | `{}`                                                                                           | 201 + temporary guest + session cookie          |
| POST   | `/auth/logout`   | none                                                                                           | 204 + cleared cookie                            |
| GET    | `/auth/me`       | none                                                                                           | 200 + current user; 401 without a valid session |

- Zod validates strict payloads. Usernames are normalized to lowercase and contain 3–24 ASCII letters/numbers/underscores; the `guest_` prefix is reserved. Emails are trimmed and lowercased. Passwords contain 8–128 characters and are not trimmed.
- Passwords use Argon2id (19 MiB memory, 2 iterations, parallelism 1). Login failures do not distinguish an unknown email from an incorrect password.
- Sessions use HS256 JWTs with issuer/audience validation in a **Secure, HttpOnly, SameSite=Lax, host-only** cookie. Signed-in state lives in a Zustand memory store and is restored through `/auth/me`; tokens are not stored in JavaScript/localStorage. Account API responses are `no-store` and are not cached by the PWA.
- Registered sessions last seven days. Logout clears the cookie and increments the user's `authVersion`, invalidating all their existing sessions, including replayed tokens.
- Guests get random unique names, no email/password, and a 24-hour expiry. Expired guests cannot authenticate, even with an unexpired token. Guest records are not automatically deleted because they may be referenced by games; background cleanup is outside this step. Guest-to-member conversion is not implemented.
- Auth routes share a limit of 60 requests / 15 minutes per IP. Account/guest creation additionally shares 15 requests / hour; failed logins have a 10 / 15 minute limit. Limit responses are JSON with HTTP 429. The current stores are per-process memory; multi-instance deployment needs a shared rate-limit store.
- CORS permits the exact configured `WEB_ORIGIN` with credentials. POST requests with a different Origin are rejected. SameSite cookies and the Origin check protect browser mutations; CLI requests without an Origin are allowed.

### Schema

`User` contains the requested identity, unique username/email, password hash, default 1200 rating, and creation timestamp, plus `isGuest`, `expiresAt`, and `authVersion`. Email and passwordHash are nullable to represent guests; registration always supplies both.

`Game` contains UUID player relations, time control, typed status/result/reason, PGN/final FEN, both players' ratings before/after, and start/end timestamps. Results, final ratings, and ending fields remain nullable until completion. `Move` contains game relation, ply, SAN, FEN and time left in milliseconds, with a unique `(gameId, ply)` constraint and cascading removal with its game. Player deletion is restricted while games reference them.

The models prepare the database for future work. This API does not save local games, accept game moves, match players, or calculate ratings.

## Configuration and deployment

| Server variable     | Purpose                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`      | PostgreSQL development/deployment database URL                                     |
| `TEST_DATABASE_URL` | Separate disposable database whose name ends in `_test`                            |
| `JWT_SECRET`        | Random secret of at least 32 characters; placeholder values are rejected           |
| `WEB_ORIGIN`        | Exact browser origin, no trailing slash; HTTPS required in production              |
| `PORT`              | API port, default 3001                                                             |
| `NODE_ENV`          | `development`, `test`, or `production`                                             |
| `TRUST_PROXY_HOPS`  | Trusted reverse-proxy hop count, default 0; set only for your known proxy topology |

Web `VITE_API_URL` defaults to `/api`. For deployment, serve the built web app over HTTPS and proxy `/api` to Express (removing the `/api` prefix), or use an HTTPS API on a **same-site** origin such as `api.example.com` with the web app at `app.example.com`. Set `VITE_API_URL` before the web build for a separate API origin, and set `WEB_ORIGIN` to the exact web origin. Unrelated cross-site domains are not supported by SameSite=Lax session cookies. No secret belongs in a `VITE_*` variable.

```sh
npm ci
npm run build
npm run db:migrate
npm run start --workspace @sangat/server
```

Set production environment variables before starting the server. Web output is **apps/web/dist**; server output is **apps/server/dist**. See [local chess/PWA documentation](apps/web/README.md) for gameplay, Stockfish assets, offline checks, subdirectory builds and third-party licenses. Do not cache auth requests in a reverse proxy or CDN. No application deployment has been published automatically.

## Tests

With PostgreSQL running and `.env` files created:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run test:auth:e2e
npm.cmd run format:check
```

- `npm test`: existing web unit tests, then auth endpoint/validation tests against **real PostgreSQL**.
- `npm run test:e2e`: existing local chess browser tests against a production preview, including offline Stockfish play.
- `npm run test:auth:e2e`: browser tests for protected lobby, register/login/logout, guest sessions, real Secure cookies, reload restoration, Urdu UI and local chess access. They start their own API (3002) and web (5174) against the test database.
- Server test runners refuse a database not ending in `_test`, or one matching the development database. Auth endpoint tests clear test tables; never put real data in the test database.
- Browser tests use `/usr/bin/chromium` when present, otherwise Playwright Chromium. Install it with `npx.cmd playwright install chromium` on Windows (`npx playwright install chromium` elsewhere), or set `CHROMIUM_PATH` to your browser executable.

For focused runs: `npm run test:web` or `npm run test:server`. If dependency installation scripts were disabled, run `npm run db:generate` and `node apps/web/scripts/copy-engine.mjs` before building.
