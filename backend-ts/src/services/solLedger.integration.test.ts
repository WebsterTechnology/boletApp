import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Sequelize, QueryTypes } from "sequelize";
import ledgerConstraints from "../migrations/20261020010000-sol-ledger-constraints";

const url = process.env.SOL_PG_TEST_URL;
const suite = url ? describe : describe.skip;

suite("Sòl wallet ledger PostgreSQL invariants", () => {
  const db = new Sequelize(url || "postgres://unused:unused@localhost/unused", {
    logging: false, pool: { max: 1, min: 0, idle: 1000 },
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
  it("rolls back a wallet change when ledger insert fails", async () => {
    await db.query('CREATE TABLE wallet_probe (id integer PRIMARY KEY, points integer NOT NULL)');
    await db.query('INSERT INTO wallet_probe VALUES (1, 50)');
    await expect(db.transaction(async t => {
      await db.query('UPDATE wallet_probe SET points = 0 WHERE id = 1', { transaction: t });
      await db.query(`INSERT INTO sol_wallet_ledger VALUES ${row(4, 1)}`, { transaction: t });
    })).rejects.toThrow();
    const [wallet] = await db.query<{ points: number }>(
      'SELECT points FROM wallet_probe WHERE id = 1', { type: QueryTypes.SELECT },
    );
    expect(wallet.points).toBe(50);
  });
});
