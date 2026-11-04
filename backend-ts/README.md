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

## Borrowing allowance (stage 1)

A separate `users.borrowablePoints` INTEGER column defaults to zero for every account. The database migration is registered as `20261103000000-add-borrowable-points.js` and runs through the normal backend startup migrator. `GET /api/users/me`, auth responses and `GET /api/admin/users` return `borrowablePoints`. An authenticated admin can choose `balanceType: "borrow"` when calling `POST /api/admin/users/:id/add-pwen` or `/remove-pwen` to change this limit, without changing `points` or `withdrawablePoints`. The customer's Balans view displays it as **Disponib pou prete**. **This is only an allowance, not disbursed cash or spendable betting funds.** No borrow/disburse, loan agreement, interest, repayment, PIX or withdrawal logic is enabled by this step. Validate legal requirements before enabling loans.

## Borrow request + administrator decision (stage 2)

The `20261103010000-borrow-requests.js` migration creates `borrow_requests` with one pending request per customer (unique partial index). Endpoints are authenticated:
- `GET /api/borrow-requests/mine`: own request statuses.
- `POST /api/borrow-requests`: submit `{amount: positive integer, reason: string <=120 chars}` while within `borrowablePoints`. Only one pending request per customer; no wallet effect.
- `GET /api/borrow-requests/admin`: admin-only list, with customer identification.
- `PATCH /api/borrow-requests/admin/:id/decision`: admin-only `{decision:"approved"|"rejected"}`, only when pending. Approval validates the user's current limit again, sets reviewer/time and **does not disburse credit or change balances**.

Do not interpret approval as a real loan or legal commitment. This release has no disbursement, repayment, gambling-credit usage, fees, interest, or debt creation. Any real-money lending must undergo legal and operational review before enabling it.

## Borrow approvals credit the withdrawable wallet (stage 3)

Migration `20261103020000-borrow-credit-audit.js` adds `creditedAt`, `creditedBy`, `borrowableBefore`, and `withdrawableBefore` to `borrow_requests`. An admin approval of a *pending* request now locks the request and user wallet in one PostgreSQL transaction. Given a 100-pwen borrowing allowance, a 50-pwen approval atomically decreases `borrowablePoints` to 50 and increases `withdrawablePoints` by 50. A credit audit timestamp and prior balances are saved in that same transaction; repeat approvals are rejected. Invalid/insufficient/overflowing balances are rejected without moving points. Rejection leaves both balances untouched.

Previously approved records are intentionally **not automatically credited** on migration. Admin must separately use `PATCH /api/borrow-requests/admin/:id/credit` to fund an older approved, not-yet-credited request. This endpoint checks status, allowance, audit marker and locks rows; repeat releases are rejected. New approvals use `PATCH /api/borrow-requests/admin/:id/decision` with `{decision:"approved"}` and do not require a second click. Test on a controlled account before production use. Real-money loans may require a legally compliant loan agreement, credit underwriting and repayment record; this code does not implement those requirements.

## Loan repayment API (work in progress)

The 30-day repayment deadline starts when a loan is credited. Total due is principal plus 20%, rounded up to whole points. Partial repayments are allowed before the last 24 hours; only the full outstanding balance is allowed during the final 24 hours.

`GET /api/borrow-requests/:id/repayment-status` returns the countdown, outstanding balance and payment-method availability. `GET /api/borrow-requests/:id/repayments` returns the repayment ledger. Wallet repayments use `POST /api/borrow-requests/:id/wallet-repayments` with an `Idempotency-Key` header and require `BORROW_WALLET_REPAYMENTS_ENABLED=true`.

InfinitePay checkout for PIX and credit cards, provider-side `payment_check` verification, webhook reconciliation, and transaction-safe loan ledger settlement are implemented behind feature flags. **A hosted checkout link or browser redirect is never proof of payment.** The repayment is recorded only after a verified PIX payment matches the expected amount and order. Keep customer access disabled until a controlled end-to-end payment and duplicate callback test pass.

### Loan PIX rollout checklist

- Configure `INFINITEPAY_HANDLE`, `BORROW_PIX_REDIRECT_URL`, and `BORROW_PIX_WEBHOOK_URL` (HTTPS URL ending in `/api/borrow-pix/webhook`). Reuse the existing InfinitePay merchant `INFINITEPAY_HANDLE` from standard Bolet purchases; the checkout-link endpoint does not require a new API key. InfinitePay always offers cards alongside PIX and cannot disable cards. Show customers both methods are available and verify a completed `pix` or `credit_card` transaction before updating the loan ledger. If configured, `INFINITEPAY_API_KEY` remains optional; never expose it to the frontend.
- Apply both loan repayment database migrations before enabling any repayment flag.
- Confirm InfinitePay checkout creation, the callback payload fields, and the `payment_check` response against the merchant account in a safe test environment. The callback must match a stored order and the expected amount and PIX method.
- Test partial payment, full payment during the final 24 hours, duplicate callbacks, failed verification, overpayment prevention, and simultaneous wallet/PIX attempts.
- Keep `BORROW_PIX_CHECKOUT_ENABLED`, `BORROW_PIX_WEBHOOK_ENABLED`, `BORROW_PIX_SETTLEMENT_READY`, and `BORROW_PIX_CUSTOMER_ACCESS_ENABLED` disabled until all checks pass. `BORROW_WALLET_REPAYMENTS_ENABLED` is independently controlled.
- Customer controls appear in **Balans**. `Peye ak PIX` is shown only when the backend advertises PIX availability. Configure `BORROW_PIX_REDIRECT_URL=https://htnovatech.com/balans` and `BORROW_PIX_WEBHOOK_URL=https://boletapp-production.up.railway.app/api/borrow-pix/webhook`. Checkout redirects do not mark a loan paid; only verified server-side settlement does.
