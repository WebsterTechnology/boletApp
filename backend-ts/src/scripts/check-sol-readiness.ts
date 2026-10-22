/**
 * Read-only Sòl production readiness check.
 * Run with Railway's production DATABASE_URL configured:
 *   npx tsx src/scripts/check-sol-readiness.ts
 * This script NEVER migrates, inserts, updates, or deletes data.
 */
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/database";
import { migrator } from "../migrations";

const requiredMigrations = [
  "20261018000000-create-sol-foundation.js",
  "20261018010000-create-sol-payment-attempts.js",
  "20261018020000-sol-open-intent-unique-index.js",
  "20261020000000-sol-wallet-ledger.js",
  "20261020010000-sol-ledger-constraints.js",
];
const requiredTables = [
  "sol_packages",
  "sol_contributions",
  "sol_payment_attempts",
  "sol_wallet_ledger",
];
const requiredConstraints = [
  "sol_wallet_ledger_balances_valid",
];
const requiredIndexes = [
  "sol_wallet_ledger_one_payment_per_contribution",
];

async function main() {
  const failures: string[] = [];
  const report = (ok: boolean, name: string) => {
    console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
    if (!ok) failures.push(name);
  };
  // No secrets, connection strings, balances, or personal records are printed.
  try {
    await sequelize.authenticate();
    console.log("Sòl production readiness (read-only)");
    const applied = new Set((await migrator.executed()).map((migration) => migration.name));
    for (const name of requiredMigrations) report(applied.has(name), `migration ${name}`);

    const tables = await sequelize.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name IN (:names)`,
      { replacements: { names: requiredTables }, type: QueryTypes.SELECT },
    );
    const existingTables = new Set(tables.map((row) => row.table_name));
    for (const name of requiredTables) report(existingTables.has(name), `table ${name}`);

    if (existingTables.has("sol_wallet_ledger")) {
      const constraints = await sequelize.query<{ conname: string }>(
        `SELECT conname FROM pg_constraint WHERE conrelid = 'sol_wallet_ledger'::regclass`,
        { type: QueryTypes.SELECT },
      );
      const names = new Set(constraints.map((row) => row.conname));
      for (const name of requiredConstraints) report(names.has(name), `constraint ${name}`);
      const indexes = await sequelize.query<{ indexname: string }>(
        `SELECT indexname FROM pg_indexes
         WHERE schemaname = current_schema() AND tablename = 'sol_wallet_ledger'`,
        { type: QueryTypes.SELECT },
      );
      const indexNames = new Set(indexes.map((row) => row.indexname));
      for (const name of requiredIndexes) report(indexNames.has(name), `index ${name}`);
    } else {
      report(false, "ledger constraints and indexes unavailable");
    }

    const disabled = process.env.SOL_WALLET_PAYMENTS_ENABLED !== "true";
    report(disabled, "wallet payment feature flag remains disabled");
    console.log(failures.length ? `NOT READY: ${failures.length} check(s) failed` : "STRUCTURAL CHECKS PASS; do not enable payments without operational review");
    if (failures.length) process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
main().catch((error: unknown) => {
  console.error("Sòl readiness check failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
