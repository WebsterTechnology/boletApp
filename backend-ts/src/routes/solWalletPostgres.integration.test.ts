import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { QueryTypes } from "sequelize";
import { sequelize, User, SolPackage, SolContribution, SolPaymentAttempt } from "../models";
import solLedger from "../migrations/20261020000000-sol-wallet-ledger";
import solConstraints from "../migrations/20261020010000-sol-ledger-constraints";

// Run only against the disposable PostgreSQL database configured in CI.
// Never create or destroy tables in an application/production database.
const testDb = process.env.SOL_PG_TEST_URL;
const suite = testDb && process.env.DATABASE_URL === testDb ? describe : describe.skip;

vi.mock("../middleware/authenticate", () => ({
  authenticate: (req: { headers: { authorization?: string }; user?: { id: number } }, res: { status: (code: number) => { json: (body: object) => void } }, next: () => void) => {
    if (req.headers.authorization !== "Bearer sol-pg-test-token") {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    req.user = { id: 1 };
    next();
  },
  currentUser: (req: { user?: { id: number } }) => req.user,
}));

import solRoutes from "./solRoutes";
const app = express();
app.use(express.json());
app.use("/api/sol", solRoutes);
const payUrl = "/api/sol/packages/1/wallet-payments";
const key = "solpostgrespayment00001";
const headers = (req: request.Test) => req.set("Authorization", "Bearer sol-pg-test-token").set("Idempotency-Key", key);

suite("Sòl wallet payment HTTP + real PostgreSQL settlement", () => {
  const oldFlag = process.env.SOL_WALLET_PAYMENTS_ENABLED;
  beforeAll(async () => {
    process.env.SOL_WALLET_PAYMENTS_ENABLED = "true";
    // This is a disposable CI-only database, never a live environment.
    await User.sync({ force: true });
    await SolPackage.sync({ force: true });
    await SolContribution.sync({ force: true });
    await SolPaymentAttempt.sync({ force: true });
    const context = { name: "sol-ci-ledger", context: sequelize.getQueryInterface() };
    await solLedger.up(context);
    await solConstraints.up(context);
    await sequelize.query(`INSERT INTO users (id, phone, password, points, "withdrawablePoints", "profileOnboardingDone", "isAdmin")
      VALUES (1, 'sol-test-user', 'test-hash', 50, 735, false, false)`);
    await sequelize.query(`INSERT INTO sol_packages (id, "userId", "monthlyAmountCents", "dueDay", status, "paidMonths", "createdAt", "updatedAt")
      VALUES (1, 1, 10000, 15, 'draft', 0, NOW(), NOW())`);
    for (let n = 1; n <= 12; n++) {
      await sequelize.query(`INSERT INTO sol_contributions ("packageId", "installmentNumber", "amountCents", status, "createdAt", "updatedAt")
        VALUES (1, :n, 10000, 'pending', NOW(), NOW())`, { replacements: { n } });
    }
    await sequelize.query(`INSERT INTO sol_payment_attempts (id, "userId", "packageId", "contributionId", "amountCents", currency, method, status, "idempotencyKey", "createdAt", "updatedAt")
      VALUES (1, 1, 1, 1, 10000, 'BRL', 'wallet', 'created', :key, NOW(), NOW())`, { replacements: { key } });
  });
  afterAll(async () => {
    if (oldFlag === undefined) delete process.env.SOL_WALLET_PAYMENTS_ENABLED;
    else process.env.SOL_WALLET_PAYMENTS_ENABLED = oldFlag;
    if (!testDb || process.env.DATABASE_URL !== testDb) return;
    await sequelize.query('DROP TABLE IF EXISTS sol_wallet_ledger CASCADE');
    await SolPaymentAttempt.drop();
    await SolContribution.drop();
    await SolPackage.drop();
    await User.drop();
    await sequelize.close();
  });

  it("settles 50 play + 735 withdrawable as 0 play + 685 withdrawable and records first installment", async () => {
    const res = await headers(request(app).post(payUrl));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      pointsDebited: 100, playDebited: 50, withdrawDebited: 50,
      playBalance: 0, withdrawBalance: 685, paidMonths: 1,
      status: "confirmed", alreadyProcessed: false,
    });
    const [wallet] = await sequelize.query<{ points: number; withdrawablePoints: number }>(
      'SELECT points, "withdrawablePoints" FROM users WHERE id = 1', { type: QueryTypes.SELECT });
    expect(wallet).toEqual({ points: 0, withdrawablePoints: 685 });
    const [pkg] = await sequelize.query<{ paidMonths: number; status: string }>(
      'SELECT "paidMonths", status FROM sol_packages WHERE id = 1', { type: QueryTypes.SELECT });
    expect(pkg).toMatchObject({ paidMonths: 1, status: "active" });
    const [contribution] = await sequelize.query<{ status: string; paymentReference: string }>(
      'SELECT status, "paymentReference" FROM sol_contributions WHERE id = 1', { type: QueryTypes.SELECT });
    expect(contribution).toMatchObject({ status: "paid", paymentReference: "sol-wallet-1" });
    const [count] = await sequelize.query<{ total: string }>(
      'SELECT COUNT(*)::text AS total FROM sol_wallet_ledger', { type: QueryTypes.SELECT });
    expect(count.total).toBe("1");
  });

  it("replays the same idempotency key without a second deduction", async () => {
    const res = await headers(request(app).post(payUrl));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ alreadyProcessed: true, playBalance: 0, withdrawBalance: 685 });
    const [count] = await sequelize.query<{ total: string }>(
      'SELECT COUNT(*)::text AS total FROM sol_wallet_ledger', { type: QueryTypes.SELECT });
    expect(count.total).toBe("1");
  });

  it("rejects a second installment with insufficient funds without modifying the wallet or ledger", async () => {
    await sequelize.query(`INSERT INTO sol_payment_attempts (id, "userId", "packageId", "contributionId", "amountCents", currency, method, status, "idempotencyKey", "createdAt", "updatedAt")
      VALUES (2, 1, 1, 2, 10000, 'BRL', 'wallet', 'created', 'solpostgrespayment00002', NOW(), NOW())`);
    await sequelize.query('UPDATE users SET "withdrawablePoints" = 25 WHERE id = 1');
    const res = await request(app).post(payUrl)
      .set("Authorization", "Bearer sol-pg-test-token")
      .set("Idempotency-Key", "solpostgrespayment00002");
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/insufficient/i);
    const [wallet] = await sequelize.query<{ points: number; withdrawablePoints: number }>(
      'SELECT points, "withdrawablePoints" FROM users WHERE id = 1', { type: QueryTypes.SELECT });
    expect(wallet).toEqual({ points: 0, withdrawablePoints: 25 });
    const [count] = await sequelize.query<{ total: string }>(
      'SELECT COUNT(*)::text AS total FROM sol_wallet_ledger', { type: QueryTypes.SELECT });
    expect(count.total).toBe("1");
  });
});
