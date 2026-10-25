# Sòl PIX: production release gates

**Status: NOT approved for customer payments.** Keep `SOL_PIX_CHECKOUT_ENABLED` and `SOL_PIX_WEBHOOK_ENABLED` disabled until every applicable gate below is verified. Never use a live customer payment as an unplanned test.

## 1. Deployment inventory (record evidence)
- [ ] Confirm Railway backend deploys `migration/backend-typescript`; record running commit SHA, health status, and deploy timestamp.
- [ ] Confirm Vercel frontend deploys `migration/frontend-typescript`; record running commit SHA and inspect any Vercel failed checks (backend-only PR previews can fail for unrelated root-directory settings).
- [ ] Confirm payment-related environment variable **names and enable/disable states** without printing secrets. Confirm checkout and webhook are both off before testing.
- [ ] Confirm the InfinitePay webhook endpoint is the **dedicated Sòl endpoint**, not the existing Loto webhook. Verify configured public URL, HTTPS and routing.
- [ ] Confirm all relevant database migrations ran successfully and that the migration history matches the deployed backend. Take a tested backup before any production migration.

## 2. Automated verification
- [ ] Run `npm ci`, `npm run typecheck`, `npm run build`, and `npm test -- --run` in `backend-ts` (or the commands specified by CI).
- [ ] Confirm GitHub Actions **Sòl backend checks** and **Sòl backend verification** both pass on the exact candidate commit.
- [ ] Verify unknown/mismatched provider references, unpaid/wrong-amount orders, malformed callbacks, payment verification outages, duplicate callbacks, provider timeouts, and concurrent settlement behavior.
- [ ] Investigate any failed external deployment checks; document the root cause instead of treating green backend tests as deployment proof.

## 3. Controlled end-to-end payment validation
Use approved provider test facilities or a controlled low-value transaction with an authorized operator. Do **not** activate customer checkout just to run tests.

- [ ] Start checkout for one known unpaid installment; verify package, owner, amount, currency and unique reference.
- [ ] Complete payment; independently verify the provider state; confirm the dedicated webhook marks exactly the matching installment paid.
- [ ] Check the package's paid-month count and immutable payment history. One payment must never credit two installments.
- [ ] Replay the same webhook; confirm idempotency (no second credit, deduction, or payout).
- [ ] Test incorrect amount, unknown reference, and provider verification outage; confirm **no settlement**.
- [ ] Close checkout prematurely and recover the existing link/reference without creating another charge.
- [ ] Test provider timeout/unknown outcome; require manual reconciliation before any new charge. Never assume a timeout means unpaid.
- [ ] Verify next-month payment becomes available only after the previous installment is confirmed, and no stale checkout is reused.
- [ ] Verify wallet installments remain unchanged, and Loto PIX/wallet deposits still use their own established routes.

## 4. Reconciliation and operator response
- [ ] Assign an operator responsible for matching provider records, `SolPaymentAttempt` and contribution records before enabling checkout.
- [ ] Prepare a procedure for payments received by InfinitePay but not reflected in Sòl (provider timeout, webhook outage, database failure).
- [ ] Define escalation contacts, audit trail, safe retry/idempotency rules, and how to stop new checkouts without obscuring existing paid transactions.
- [ ] Reconcile any interrupted/unknown payment before retrying; never manually mark an installment paid solely from a browser redirect.
- [ ] Validate refund, early-withdrawal, final-payout, accounting, and applicable regulatory obligations separately; checkout tests do not validate them.

## 5. Go / no-go and rollback
- [ ] Sign off backend, frontend, migrations, payment reconciliation, customer-support procedure and legal/compliance review.
- [ ] Enable flags only during an explicitly authorized supervised rollout after provider verification and dedicated webhook readiness are proven.
- [ ] Monitor payments, callbacks, errors and reconciliation for a defined pilot period.
- [ ] Roll back by disabling **new** Sòl PIX checkout first. Maintain the ability to verify and reconcile payments already received; do not simply disable webhook verification for in-flight payments.
- [ ] Record test evidence, deployed commit SHAs, flag changes, operator, decisions, and outstanding risks.

**No feature flags, credentials, database schema, payment amounts, wallet logic, or Loto routes are modified by this document.**
