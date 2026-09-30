/**
 * Local PostgreSQL integration check for atomic bet rollback.
 * Run with: npx tsx scripts/test-transaction-rollback.ts
 *
 * Uses the configured DATABASE_URL. Never run this against production.
 * The test intentionally makes DeChif.create fail validation inside the same
 * transaction after the user's points have been decremented in memory/saved.
 */
import { DeChif, sequelize, User } from "../src/models";
import { createBetWithPoints } from "../src/utils/betTransaction";

async function main() {
  if (/railway|render|koyeb|neon|supabase/i.test(process.env.DATABASE_URL || "")) {
    throw new Error("Refusing to run rollback integration test against a hosted database.");
  }

  await sequelize.authenticate();

  const user = await User.findOne({ where: { phone: "6135550001" } });
  if (!user) throw new Error("Local test user 6135550001 was not found.");

  const before = user.points;
  const receiptId = `ROLLBACK-INTEGRATION-${Date.now()}`;

  let failedAsExpected = false;
  try {
    await createBetWithPoints(user.id, 10, DeChif, {
      // Invalid DeChif value: model validation fails after balance save.
      number: "INVALID",
      location: "New York",
      receiptId,
    });
  } catch {
    failedAsExpected = true;
  }

  if (!failedAsExpected) {
    throw new Error("Expected bet creation to fail, but it succeeded.");
  }

  const afterUser = await User.findByPk(user.id);
  if (!afterUser) throw new Error("Test user disappeared.");

  const persistedBet = await DeChif.findOne({ where: { receiptId } });

  console.log(`Balance before: ${before}`);
  console.log(`Balance after:  ${afterUser.points}`);
  console.log(`Failed bet persisted: ${persistedBet ? "YES" : "NO"}`);

  if (afterUser.points !== before) {
    throw new Error(`ROLLBACK FAILED: balance changed from ${before} to ${afterUser.points}`);
  }
  if (persistedBet) {
    throw new Error("ROLLBACK FAILED: invalid bet was persisted.");
  }

  console.log("PASS: PostgreSQL rolled back both the point deduction and failed bet.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
