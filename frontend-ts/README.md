# frontend-ts

TypeScript port of `../frontend` (React 19 + Vite). Same pages, same UI, same API calls. It talks to `backend-ts`.

## Run

```bash
cp .env.example .env     # set VITE_API_URL to your backend-ts URL
npm install
npm run dev              # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck (`tsc`), then a production build into `dist/` |
| `npm run typecheck` | `tsc` only (strict mode, covers `src` and `tests`) |
| `npm run lint` | ESLint with typescript-eslint |
| `npm test` | Vitest, run once |

`backend-ts` only accepts browser origins listed in its `CORS_ORIGINS`. Its default includes `http://localhost:5173`, so `npm run dev` works locally. In production, add the deployed frontend domain to `CORS_ORIGINS` on the backend.

## Layout

```
src/
  api/types.ts        Request/response types for every backend-ts endpoint the app uses
  types/bet.ts        Cart bet type (BetContext)
  context/            BetContext, NotificationContext (typed, throw if used outside the provider)
  utils/axios.ts      Axios instance with the Bearer token and the 401 logout handler
  utils/submitAllBets.ts   Maps cart bets to backend-ts requests (one receipt per location)
  components/, pages/ Same files as ../frontend, now .tsx
tests/
  *.test.ts(x)        Unit and component tests (jsdom)
  contract/           Frontend ↔ backend-ts contract tests (see below)
```

## Tests

- **`submitAllBets.test.ts`**: the request body for each game, one receipt per location, the balance check, and that the cart is kept when the API rejects a bet.
- **`BetContext.test.tsx`**: adding, editing and deleting cart bets, the running total, and the bet slip.
- **`games.test.tsx`**: all 5 game forms. Each adds a bet and submits it for several locations, and is checked for blocking disabled numbers and locations and for asking to buy points.
- **`auth.test.tsx`**: login and register requests and what they store in localStorage, redirects for admins and incomplete profiles, and the route guards.
- **`contract/routes.test.ts`**: loads the real `backend-ts` app and calls every endpoint the frontend uses (listed in `contract/endpoints.ts`). Each one must be routed. It also checks auth (401), CORS for the dev origin, and the response shapes of public endpoints.
- **`contract/live.test.ts`**: end to end on a real Postgres. Registers users, places bets for every game with the app's own `submitAllBets`, and checks that every response has exactly the keys declared in `src/api/types.ts`.

The contract tests need the `backend-ts` source with its dependencies installed. They look in `../backend-ts` and skip with a warning when it isn't there. Point them elsewhere with `BACKEND_TS_DIR`:

```bash
BACKEND_TS_DIR=/path/to/backend-ts npm test
# also run the live test (creates tables; use a throwaway database):
BACKEND_TS_DIR=/path/to/backend-ts BACKEND_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/test npm test
```

## Differences from ../frontend

This is a type-only migration. Behavior is unchanged except for the points below.

- Removed commented-out old versions of components (dead code).
- Paste artifacts fixed (they don't compile in TypeScript):
  - `TwaChif`: a stray block of ``` around the "not enough points" branch made it throw a `TypeError` instead of sending the user to `/buy-credits`. It now behaves like the other four games.
  - `TwaChif` showed a literal ``` on screen. `RegisterModal` showed a literal `\n\n` twice.
- Removed unused variables and the unused `checkDebugInfo` debug helper in `PixPayment` (its button was already commented out).
- `useBet()` and `useNotifications()` now throw a clear error when used outside their provider.
- Not ported: `GameTypeList.jsx` (empty file) and `CodeVerification.jsx` (a fragment with undefined variables that was never imported).

## Known gaps carried over from ../frontend

These are covered by the contract test, so it fails when one gets fixed:

| Call | Where | Problem |
|---|---|---|
| `GET /api/auth/verify` | `PlayPage` | No such backend route. The URL is relative, so in production it hits the frontend host and always "passes". |
| `POST http://localhost:3001/api/stripe` | `CreditCardForm` | Hardcoded localhost, and the backend has no Stripe route. Credit-card checkout can't work. |
| `GET /api/users/:id` | `PixPayment` | Backend only has `/api/users/me`, so the balance refresh after a PIX payment fails. |
| `POST /api/admin/claims/:id/credit-points`, `/mark-paid` | `AdminClaims` | Not implemented in the backend. The page also reads fields (`choice`, `amountPoints`, status `requested`) that `GET /api/admin/claims` doesn't return. |

Other things to know:
- **Remaining points:** Maryaj and Katchif always check the remaining points for "New York", even when the player picks Florida or Georgia.
- **Unused files:** `BetCart`, `BetList` and `DepositPix` are not used anywhere. `BetCart` would also fail against backend-ts because it doesn't send `receiptId`.
