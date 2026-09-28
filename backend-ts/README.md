# backend-ts

TypeScript port of `../backend`. It serves the same `/api/*` routes with the same request and response shapes, and uses the same Postgres database.

## Run

```bash
cp .env.example .env    # fill in DATABASE_URL and JWT_SECRET
npm install
npm run dev             # tsx watch, port 8000
```

Production:

```bash
npm run build
npm start               # node dist/server.js
```

On startup the server connects to the database, runs pending migrations, then calls `sequelize.sync()` to create any tables that are missing. If any of these steps fails, the process exits with code 1. It also stops cleanly on `SIGTERM` and `SIGINT`.

## Migrations

Migrations are TypeScript modules in `src/migrations/`, run with [umzug](https://github.com/sequelize/umzug). They are listed in `src/migrations/index.ts`. They are recorded in the same `SequelizeMeta` table that `sequelize-cli` uses, under the same names, so anything `../backend` has already applied is skipped. Every migration is idempotent: it checks for tables and columns before changing them.

```bash
npm run migrate:dev     # from source
npm run migrate         # from dist/ (after build)
npm run migrate:down    # revert the last one
```

To add a migration, create a `src/migrations/<timestamp>-<name>.ts` file that exports `{ up, down }`, then add it to the list in `src/migrations/index.ts`.

## Layout

```
src/
  server.ts            HTTP + Socket.IO server, startup and shutdown
  app.ts               Express app and route mounting
  config/              env loading/validation, Sequelize instance
  models/              typed Sequelize models + associations (index.ts)
  middleware/          authenticate, adminOnly
  controllers/         request handlers
  routes/              Express routers
  migrations/          umzug migrations
  scripts/migrate.ts   CLI for migrations
data/                  disabledNumbers.json / disabledLocations.json
```

## Differences from ../backend

- The server no longer logs `DATABASE_URL` or `JWT_SECRET`. It refuses to start if either one is missing.
- `DB_SSL=false` connects without SSL, for a local database. The default is still SSL.
- `CORS_ORIGINS` sets the allowed origins for Express and Socket.IO. The default is still `*`.
- `ensureUserProfileColumns()` from `server.js` is now the migration `20260928000000-add-user-profile-columns`.
- A fresh, empty database now works. Before, startup crashed because `describeTable("users")` ran before the table existed.
- Added `GET /health`.
- Game routes run `authenticate` once instead of twice (it was applied both at the mount point and on each route).
- Not ported, because they were never mounted in `app.js`: `asaasRoutes.js`, `stripeRoutes.js` (fully commented out) and the `Bet` model (never registered). Also not ported: `GET /api/admin/bets` in `adminRoutes.js`, which `adminBetsRoutes` always answers first.
- Fixed crashes: `/api/pix/debug/users` selected a `createdAt` column that `users` doesn't have. `/api/pix/debug/pix-requests` included `User` without its alias. Login and register threw when the password arrived as a JSON number.
