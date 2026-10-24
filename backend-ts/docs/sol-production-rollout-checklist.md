# Sòl wallet-payment production rollout checklist

Scope: Sòl only. Do not change Loto / InfinitePay payment behavior or enable wallet deductions during verification.

## Deployment and database safety

- Production source branch: `migration/backend-typescript`; Railway root directory: `/backend-ts`.
- The backend startup in `src/server.ts` calls `migrator.up()` after database authentication. **Deploying a newer commit can apply pending migrations automatically.** The absence of a Railway pre-deploy command does not mean migrations are skipped.
- Review the Sòl migrations and ensure a verified production database backup and rollback/recovery plan before deploying.
- The production feature flag `SOL_WALLET_PAYMENTS_ENABLED` must remain unset or `false` until readiness and operational sign-off.
- Deploy the latest branch commit; redeploying an older Railway deployment does not necessarily fetch newer GitHub code.
- After deployment, confirm the actual deployed commit, startup logs, database migration success, and normal existing Loto operations.

## Read-only Sòl readiness verification

With production `DATABASE_URL` supplied securely, run the read-only checker from a trusted environment with dependencies installed:

```sh
cd backend-ts
npx tsx src/scripts/check-sol-readiness.ts
```

This checks required Sòl migrations, tables, ledger constraint and index, and that the feature flag remains disabled. Do not paste secrets or database connection strings into tickets or logs.

**A passing structural check is not permission to enable live payments.** Separately verify authorization, ownership, wallet debit order, sufficient-funds rejection, idempotent retries, concurrency protection, immutable receipts/ledger, and operational monitoring using safe test conditions.

## Outage recovery

If Railway missed GitHub auto-deploy events during an outage, verify the connected branch and deployment history before taking action. A documentation-only merge may produce a new GitHub push but does **not** guarantee Railway will deploy. Do not repeatedly restart or redeploy the old release. If the new push is still not detected, investigate the Railway/GitHub integration through official support and audit deployment events.

## Security

Follow any Railway incident guidance to rotate potentially exposed production credentials and revoke prior credentials through the appropriate providers. Plan rotation carefully to avoid interrupting existing Loto payments. Never include secrets in screenshots.

## Rollout decision

Leave Sòl wallet payments disabled until the latest backend version is deployed, structural checks pass, and an operator explicitly approves a controlled activation. Keep Loto payment code and frontend unchanged.
