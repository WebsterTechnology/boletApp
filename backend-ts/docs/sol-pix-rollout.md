# Sòl PIX — deployment and payment verification runbook

**Status:** not approved for customer payments. All PIX flags remain OFF until a controlled end-to-end test is complete. This runbook does not authorize activation.

## Deploy safely

1. Deploy the latest `migration/backend-typescript` backend and `migration/frontend-typescript` frontend to their respective services. Confirm the running versions include the Sòl checkout and webhook routes.
2. Run the backend database migrations using the project's established Railway release process (`npm run migrate` from `backend-ts`, against the **intended** `DATABASE_URL`). Check migration history, especially `20261025060000-sol-pix-checkout-recovery` (adds nullable `sol_payment_attempts.checkoutUrl`). **Do not run destructive down migrations.**
3. Confirm the dedicated `POST /api/sol-pix/webhook` is publicly reachable over HTTPS at the actual backend hostname, without routing it to `/api/infinitepay/webhook` (Loto). A 503 while disabled is expected, not a successful payment.
4. Configure `SOL_PIX_WEBHOOK_URL=https://<actual-backend-host>/api/sol-pix/webhook` and `SOL_PIX_REDIRECT_URL=https://<actual-frontend-host>/`. Both must be HTTPS. The webhook URL must have exactly the path `/api/sol-pix/webhook` and no query or fragment. Confirm `INFINITEPAY_HANDLE` belongs to the intended merchant.
5. Keep `SOL_PIX_CHECKOUT_ENABLED=false`, `SOL_PIX_WEBHOOK_ENABLED=false`, and `VITE_SOL_PIX_ENABLED=false` for normal customers. Note that Vite frontend environment variables are embedded at build time: changing `VITE_SOL_PIX_ENABLED` requires a frontend rebuild/redeploy.

## Controlled verification (authorized test only)

**Do not turn on production payments for all customers to run a test.** Use an isolated test deployment/account and provider-supported test mode where available, or an explicitly authorized controlled low-value real payment after confirming provider conditions, merchant access, and refund/reconciliation procedures.

- Create a Sòl package with a server-approved monthly amount; confirm the next installment is pending.
- Check wallet payment remains functional and separate from Sòl PIX. Do not create a live wallet/PIX race without a deliberate test plan.
- Enable the two backend PIX flags only in the controlled test environment, then the frontend flag for that environment. Verify `POST /api/sol/packages/:id/payment-intents` followed by `POST /api/sol/packages/:id/pix-checkout` with the **same** `Idempotency-Key`.
- Verify the provider order starts `sol-pix-`, uses the exact installment amount in cents, and points to the Sòl webhook (never Loto).
- Complete one authorized payment. Independently verify InfinitePay `payment_check` and database state: exactly one contribution marked paid, one confirmed attempt, `paidMonths` incremented once, no changes to Loto points or wallet balances.
- Replay the same verified webhook and ensure `alreadyProcessed:true` without extra writes. Test unpaid, wrong amount, wrong order, and stale installment: all must fail without settlement.
- Retry checkout with the same key: an existing saved URL must be reused, not a new provider order. If the provider reference exists but the URL is missing, expect 409 and **manual reconciliation** before any new attempt.
- Confirm return/redirect does not mark an installment paid; only the verified webhook can settle it.
- Check failed, timed-out and interrupted checkout paths. An open PIX attempt can block a new wallet or PIX attempt for the same installment until reconciled. Do not delete or expire a potentially payable order without provider-confirmed cancellation or expiry.
- Confirm payment records and logs contain no secrets and that all production alerts/monitoring and support procedures are ready.

## Go/no-go

**GO** only after migrations, deployed versions, webhook reachability, isolated tests, idempotency, incorrect-amount rejection, and reconciliation workflow are independently confirmed. Record the test order reference, deployment versions, and approver without storing secrets in Git.

**NO-GO:** missing migration; unknown provider behavior; unreachable callback; any wallet/Loto credit from Sòl PIX; inconsistent amount; unresolved pending order; or inability to safely reconcile an interrupted checkout.

Rollback: immediately turn OFF `VITE_SOL_PIX_ENABLED` (redeploy frontend) and `SOL_PIX_CHECKOUT_ENABLED` to prevent new checkouts. **Do not blindly turn off `SOL_PIX_WEBHOOK_ENABLED` while any previously issued payable links remain unsettled**; continue verified settlement or reconcile each outstanding order first. Disabling a webhook cannot cancel an InfinitePay payment link. Never roll back the checkoutUrl database column while deployed code expects it.
