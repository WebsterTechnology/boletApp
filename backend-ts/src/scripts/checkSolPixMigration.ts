import { QueryTypes } from "sequelize";
import { sequelize } from "../config/database";
import { migrator } from "../migrations";

// Read-only operational check. It never runs migrator.up/down, logs secrets,
// modifies the schema, or enables payment feature flags.
const RECOVERY_MIGRATION = "20261025060000-sol-pix-checkout-recovery.js";

async function main() {
  const [executed, pending, columns] = await Promise.all([
    migrator.executed(),
    migrator.pending(),
    sequelize.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'sol_payment_attempts'
           AND column_name = 'checkoutUrl'
       ) AS "exists"`,
      { type: QueryTypes.SELECT },
    ),
  ]);
  const applied = executed.some(item => item.name === RECOVERY_MIGRATION);
  const isPending = pending.some(item => item.name === RECOVERY_MIGRATION);
  const columnExists = columns[0]?.exists === true;
  const ready = applied && !isPending && columnExists;
  console.log(JSON.stringify({
    check: "sol_pix_checkout_recovery",
    migration: RECOVERY_MIGRATION,
    applied,
    pending: isPending,
    columnExists,
    ready,
    pendingMigrationNames: pending.map(item => item.name),
  }, null, 2));
  if (!ready) process.exitCode = 2;
}

main()
  .catch(error => {
    console.error("Sòl migration inspection failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    process.exitCode = 1;
  })
  .finally(async () => { await sequelize.close(); });
