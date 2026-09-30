/**
 * Local PostgreSQL concurrency integration checks.
 * Run with: npx tsx scripts/test-concurrency.ts
 * Never run against production.
 */
import { DeChif, Katchif, Maryaj, sequelize, User } from "../src/models";
import { createBetWithPoints, InsufficientPointsError, lockBetLimit } from "../src/utils/betTransaction";

function refuseHostedDb() {
  const url = process.env.DATABASE_URL || "";
  if (/railway|render|koyeb|neon|supabase/i.test(url)) {
    throw new Error("Refusing to run concurrency integration test against a hosted database.");
  }
}

async function balanceConcurrency(user: User) {
  const original = user.points;
  const testBalance = 10;
  await user.update({ points: testBalance });

  const prefix = `CONC-BAL-${Date.now()}`;
  try {
    const attempts = [1, 2].map((n) =>
      createBetWithPoints(user.id, 10, DeChif, {
        number: "38",
        location: "New York",
        receiptId: `${prefix}-${n}`,
      })
    );
    const results = await Promise.allSettled(attempts);
    const successes = results.filter((r) => r.status === "fulfilled").length;
    const insufficient = results.filter(
      (r) => r.status === "rejected" && r.reason instanceof InsufficientPointsError
    ).length;
    const fresh = await User.findByPk(user.id);
    const bets = await DeChif.count({ where: { userId: user.id, receiptId: [`${prefix}-1`, `${prefix}-2`] } });

    console.log(`Balance concurrency: successes=${successes}, insufficient=${insufficient}, balance=${fresh?.points}, bets=${bets}`);
    if (successes !== 1 || insufficient !== 1 || fresh?.points !== 0 || bets !== 1) {
      throw new Error("BALANCE CONCURRENCY FAILED");
    }
  } finally {
    await DeChif.destroy({ where: { userId: user.id, receiptId: [`${prefix}-1`, `${prefix}-2`] } });
    await User.update({ points: original }, { where: { id: user.id } });
  }
}

async function cappedConcurrency(user: User, kind: "katchif" | "maryaj") {
  const prefix = `CONC-${kind.toUpperCase()}-${Date.now()}`;
  const original = user.points;
  await user.update({ points: Math.max(original, 100) });

  try {
    if (kind === "katchif") {
      const number = "9876";
      const location = "Georgia";
      await Katchif.destroy({ where: { number, location } });

      const place = (n: number) =>
        createBetWithPoints(user.id, 15, Katchif, { number, location, receiptId: `${prefix}-${n}` }, async (transaction) => {
          await lockBetLimit(transaction, `katchif:${number}:${location}`);
          const total = (await Katchif.sum("pwen", { where: { number, location }, transaction })) || 0;
          if (15 > Math.max(0, 20 - total)) throw new Error("LIMIT");
        });

      const results = await Promise.allSettled([place(1), place(2)]);
      const successes = results.filter((r) => r.status === "fulfilled").length;
      const total = (await Katchif.sum("pwen", { where: { number, location } })) || 0;
      console.log(`Kat Chif cap concurrency: successes=${successes}, total=${total}`);
      if (successes !== 1 || total !== 15) throw new Error("KATCHIF CAP CONCURRENCY FAILED");
      await Katchif.destroy({ where: { number, location } });
    } else {
      const part1 = "91", part2 = "92", location = "Georgia";
      await Maryaj.destroy({ where: { part1, part2, location } });

      const place = (n: number) =>
        createBetWithPoints(user.id, 15, Maryaj, { part1, part2, location, receiptId: `${prefix}-${n}` }, async (transaction) => {
          await lockBetLimit(transaction, `maryaj:${part1}:${part2}:${location}`);
          const total = (await Maryaj.sum("pwen", { where: { part1, part2, location }, transaction })) || 0;
          if (15 > Math.max(0, 20 - total)) throw new Error("LIMIT");
        });

      const results = await Promise.allSettled([place(1), place(2)]);
      const successes = results.filter((r) => r.status === "fulfilled").length;
      for (const [index, result] of results.entries()) {
        if (result.status === "rejected") {
          console.log(`Maryaj attempt ${index + 1} rejected:`, result.reason);
        }
      }
      const total = (await Maryaj.sum("pwen", { where: { part1, part2, location } })) || 0;
      console.log(`Maryaj cap concurrency: successes=${successes}, total=${total}`);
      if (successes !== 1 || total !== 15) throw new Error("MARYAJ CAP CONCURRENCY FAILED");
      await Maryaj.destroy({ where: { part1, part2, location } });
    }
  } finally {
    await Katchif.destroy({ where: { receiptId: [`${prefix}-1`, `${prefix}-2`] } });
    await Maryaj.destroy({ where: { receiptId: [`${prefix}-1`, `${prefix}-2`] } });
    await User.update({ points: original }, { where: { id: user.id } });
  }
}

async function main() {
  refuseHostedDb();
  await sequelize.authenticate();
  const user = await User.findOne({ where: { phone: "6135550001" } });
  if (!user) throw new Error("Local test user 6135550001 was not found.");

  await balanceConcurrency(user);
  await cappedConcurrency(user, "katchif");
  await cappedConcurrency(user, "maryaj");

  console.log("PASS: PostgreSQL concurrency protections are working.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
