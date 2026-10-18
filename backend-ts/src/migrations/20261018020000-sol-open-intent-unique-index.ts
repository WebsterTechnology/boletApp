import { QueryTypes } from "sequelize";
import type { Migration } from "./types";

/**
 * PostgreSQL-enforced guard against two simultaneous open Sòl payment intents
 * for the same installment. Application locks alone are not a durable
 * substitute for a unique constraint.
 */
const migration: Migration = {
  async up({ context: qi }) {
    // Fail closed if historical duplicates exist; do not silently discard
    // audit records or choose a winner.
    await qi.sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "sol_payment_attempts_one_open_per_contribution" ON "sol_payment_attempts" ("contributionId") WHERE "status" = \'created\'',
      { type: QueryTypes.RAW },
    );
  },
  async down({ context: qi }) {
    await qi.sequelize.query('DROP INDEX IF EXISTS "sol_payment_attempts_one_open_per_contribution"', { type: QueryTypes.RAW });
  },
};
export default migration;
