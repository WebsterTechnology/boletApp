import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Sequelize, QueryTypes } from "sequelize";
import ledgerConstraints from "../migrations/20261020010000-sol-ledger-constraints";

const url = process.env.SOL_PG_TEST_URL;
const suite = url ? describe : describe.skip;

suite("Sòl wallet ledger PostgreSQL invariants", () => {
  const db = new Sequelize(url || "postgres://unused:unused@localhost/unused", {
    logging: false, pool: { max: 3, min: 0, idle: 1000 },
  });
  const schema = "sol_ledger_ci";
  const row = (attemptId: number, contributionId: number) =>
    `(${attemptId}, ${contributionId}, 100, 50, 50, 50, 735, 0, 685)`;

  beforeAll(async () => {
    await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query(`SET search_path TO "${schema}"`);
    await db.query(`CREATE TABLE sol_wallet_ledger (
      "attemptId" integer NOT NULL UNIQUE,
      "contributionId" integer NOT NULL,
      "pointsDebited" integer NOT NULL, "playDebited" integer NOT NULL,
      "withdrawDebited" integer NOT NULL, "playBefore" integer NOT NULL,
      "withdrawBefore" integer NOT NULL, "playAfter" integer NOT NULL,
      "withdrawAfter" integer NOT NULL
    )`);
    await ledgerConstraints.up({ context: db.getQueryInterface() } as Parameters<typeof ledgerConstraints.up>[0]);
  });
  afterAll(async () => {
    await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => {});
    await db.close();
  });

  it("accepts valid 50 + 735 -> 0 + 685 split", async () => {
    await db.query(`INSERT INTO sol_wallet_ledger VALUES ${row(1, 1)}`);
    const [record] = await db.query<{ playAfter: number; withdrawAfter: number }>(
      'SELECT "playAfter", "withdrawAfter" FROM sol_wallet_ledger WHERE "attemptId" = 1',
      { type: QueryTypes.SELECT },
    );
    expect(record).toEqual({ playAfter: 0, withdrawAfter: 685 });
  });
  it("rejects another debit for the same installment", async () => {
    await expect(db.query(`INSERT INTO sol_wallet_ledger VALUES ${row(2, 1)}`)).rejects.toThrow();
  });
  it("rejects ledger arithmetic that does not reconcile", async () => {
    await expect(db.query(
      'INSERT INTO sol_wallet_ledger VALUES (3, 3, 100, 50, 50, 50, 735, 0, 700)',
    )).rejects.toThrow();
  });
  it("rejects negative ending balances even when arithmetic reconciles", async () => {
    await expect(db.query(
      'INSERT INTO sol_wallet_ledger VALUES (5, 5, 100, 100, 0, 50, 735, -50, 735)',
    )).rejects.toThrow();
  });
  it("rejects a mismatch between total debit and split debit", async () => {
    await expect(db.query(
      'INSERT INTO sol_wallet_ledger VALUES (6, 6, 100, 50, 40, 50, 735, 0, 695)',
    )).rejects.toThrow();
  });
  it("does not allow a second ledger record for a confirmed installment", async () => {
    await expect(db.query(
      'INSERT INTO sol_wallet_ledger VALUES (7, 1, 100, 50, 50, 50, 735, 0, 685)',
    )).rejects.toThrow();
    const [count] = await db.query<{ total: string }>(
      'SELECT COUNT(*)::text AS total FROM sol_wallet_ledger WHERE "contributionId" = 1',
      { type: QueryTypes.SELECT },
    );
    expect(count.total).toBe("1");
  });
  it("serializes simultaneous wallet debits with a row lock", async () => {
    await db.query('CREATE TABLE concurrent_wallet_probe (id integer PRIMARY KEY, points integer NOT NULL)');
    await db.query('INSERT INTO concurrent_wallet_probe VALUES (1, 100)');
    const debit = () => db.transaction(async transaction => {
      const [wallet] = await db.query<{ points: number }>(
        'SELECT points FROM concurrent_wallet_probe WHERE id = 1 FOR UPDATE',
        { transaction, type: QueryTypes.SELECT },
      );
      if (wallet.points < 100) return false;
      await db.query('UPDATE concurrent_wallet_probe SET points = points - 100 WHERE id = 1', { transaction });
      return true;
    });
    const outcomes = await Promise.all([debit(), debit()]);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    const [wallet] = await db.query<{ points: number }>(
      'SELECT points FROM concurrent_wallet_probe WHERE id = 1',
      { type: QueryTypes.SELECT },
    );
    expect(wallet.points).toBe(0);
  });
  it("rolls back a wallet change when ledger insert fails", async () => {
    await db.query('CREATE TABLE wallet_probe (id integer PRIMARY KEY, points integer NOT NULL, withdrawable integer NOT NULL)');
    await db.query('CREATE TABLE installment_probe (id integer PRIMARY KEY, status text NOT NULL)');
    await db.query('CREATE TABLE attempt_probe (id integer PRIMARY KEY, status text NOT NULL)');
    await db.query('INSERT INTO wallet_probe VALUES (1, 50, 735)');
    await db.query("INSERT INTO installment_probe VALUES (1, 'pending')");
    await db.query("INSERT INTO attempt_probe VALUES (1, 'created')");
    await expect(db.transaction(async t => {
      await db.query('UPDATE wallet_probe SET points = 0, withdrawable = 685 WHERE id = 1', { transaction: t });
      await db.query("UPDATE installment_probe SET status = 'paid' WHERE id = 1", { transaction: t });
      await db.query("UPDATE attempt_probe SET status = 'confirmed' WHERE id = 1", { transaction: t });
      // Duplicate contributionId=1 violates the unique index, aborting the transaction.
      await db.query(`INSERT INTO sol_wallet_ledger VALUES ${row(4, 1)}`, { transaction: t });
    })).rejects.toThrow();
    const [wallet] = await db.query<{ points: number; withdrawable: number }>(
      'SELECT points, withdrawable FROM wallet_probe WHERE id = 1', { type: QueryTypes.SELECT },
    );
    const [installment] = await db.query<{ status: string }>(
      'SELECT status FROM installment_probe WHERE id = 1', { type: QueryTypes.SELECT },
    );
    const [attempt] = await db.query<{ status: string }>(
      'SELECT status FROM attempt_probe WHERE id = 1', { type: QueryTypes.SELECT },
    );
    expect(wallet).toEqual({ points: 50, withdrawable: 735 });
    expect(installment.status).toBe("pending");
    expect(attempt.status).toBe("created");
  });
});
