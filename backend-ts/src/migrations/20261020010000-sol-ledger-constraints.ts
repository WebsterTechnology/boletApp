import { QueryTypes } from "sequelize";
import type { Migration } from "./types";

/**
 * Database-enforced Sòl wallet safety invariants.
 * Does not modify Loto balances, payment processing or existing Loto tables.
 * Fail closed if historical ledger entries violate the invariants.
 */
const migration: Migration = {
  async up({ context: qi }) {
    await qi.sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "sol_wallet_ledger_one_payment_per_contribution" ON "sol_wallet_ledger" ("contributionId")',
      { type: QueryTypes.RAW },
    );
    await qi.sequelize.query(
      'ALTER TABLE "sol_wallet_ledger" ADD CONSTRAINT "sol_wallet_ledger_balances_valid" CHECK ("pointsDebited" > 0 AND "playDebited" >= 0 AND "withdrawDebited" >= 0 AND "playBefore" >= 0 AND "withdrawBefore" >= 0 AND "playAfter" >= 0 AND "withdrawAfter" >= 0 AND "pointsDebited" = "playDebited" + "withdrawDebited" AND "playBefore" = "playAfter" + "playDebited" AND "withdrawBefore" = "withdrawAfter" + "withdrawDebited")',
      { type: QueryTypes.RAW },
    );
  },
  async down({ context: qi }) {
    await qi.sequelize.query('ALTER TABLE "sol_wallet_ledger" DROP CONSTRAINT IF EXISTS "sol_wallet_ledger_balances_valid"', { type: QueryTypes.RAW });
    await qi.sequelize.query('DROP INDEX IF EXISTS "sol_wallet_ledger_one_payment_per_contribution"', { type: QueryTypes.RAW });
  },
};
export default migration;
