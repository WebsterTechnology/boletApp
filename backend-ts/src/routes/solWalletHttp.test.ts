import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Isolate HTTP request validation from the database. These tests never debit a wallet.
import { sequelize } from "../config/database";
const transaction = vi.spyOn(sequelize, "transaction");
vi.mock("../middleware/authenticate", () => ({
  authenticate: (req: { headers: { authorization?: string }; user?: { id: number } }, res: { status: (code: number) => { json: (body: object) => void } }, next: () => void) => {
    if (req.headers.authorization !== "Bearer sol-test-token") {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    req.user = { id: 1 };
    next();
  },
  currentUser: (req: { user?: { id: number } }) => req.user,
}));

import solRoutes from "./solRoutes";
import { SolPackage, SolPaymentAttempt } from "../models";

const app = express();
app.use(express.json());
app.use("/api/sol", solRoutes);
const url = "/api/sol/packages/1/wallet-payments";
const key = "soltestidempotency00001";

describe("Sòl wallet payment HTTP guards", () => {
  const previousFlag = process.env.SOL_WALLET_PAYMENTS_ENABLED;
  beforeEach(() => { transaction.mockReset(); delete process.env.SOL_WALLET_PAYMENTS_ENABLED; });
  afterEach(() => {
    if (previousFlag === undefined) delete process.env.SOL_WALLET_PAYMENTS_ENABLED;
    else process.env.SOL_WALLET_PAYMENTS_ENABLED = previousFlag;
  });

  it("does not reveal or debit another user's package", async () => {
    process.env.SOL_WALLET_PAYMENTS_ENABLED = "true";
    transaction.mockImplementation(async (callback: (t: { LOCK: { UPDATE: string } }) => Promise<unknown>) =>
      callback({ LOCK: { UPDATE: "UPDATE" } }));
    const packageLookup = vi.spyOn(SolPackage, "findOne").mockResolvedValueOnce(null);
    const attemptLookup = vi.spyOn(SolPaymentAttempt, "findOne");
    try {
      const res = await request(app).post(url)
        .set("Authorization", "Bearer sol-test-token").set("Idempotency-Key", key);
      expect(res.status).toBe(404);
      expect(packageLookup).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 1, userId: 1 },
      }));
      expect(attemptLookup).not.toHaveBeenCalled();
    } finally {
      packageLookup.mockRestore();
      attemptLookup.mockRestore();
    }
  });

  it("rejects a missing wallet intent without any debit", async () => {
    process.env.SOL_WALLET_PAYMENTS_ENABLED = "true";
    transaction.mockImplementation(async (callback: (t: { LOCK: { UPDATE: string } }) => Promise<unknown>) =>
      callback({ LOCK: { UPDATE: "UPDATE" } }));
    const packageLookup = vi.spyOn(SolPackage, "findOne").mockResolvedValueOnce({ id: 1 } as SolPackage);
    const attemptLookup = vi.spyOn(SolPaymentAttempt, "findOne").mockResolvedValueOnce(null);
    try {
      const res = await request(app).post(url)
        .set("Authorization", "Bearer sol-test-token").set("Idempotency-Key", key);
      expect(res.status).toBe(404);
      expect(attemptLookup).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 1, idempotencyKey: key },
      }));
    } finally {
      packageLookup.mockRestore();
      attemptLookup.mockRestore();
    }
  });

  it("refuses payments by default and never opens a database transaction", async () => {
    const res = await request(app).post(url).set("Authorization", "Bearer sol-test-token").set("Idempotency-Key", key);
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/not enabled/i);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests even when the feature flag is enabled", async () => {
    process.env.SOL_WALLET_PAYMENTS_ENABLED = "true";
    const res = await request(app).post(url).set("Idempotency-Key", key);
    expect(res.status).toBe(401);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each(["0", "abc", "9007199254740992"])("rejects invalid package ID %s before a debit", async id => {
    process.env.SOL_WALLET_PAYMENTS_ENABLED = "true";
    const res = await request(app).post(`/api/sol/packages/${id}/wallet-payments`)
      .set("Authorization", "Bearer sol-test-token").set("Idempotency-Key", key);
    expect(res.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each(["short", "bad key!", ""])("rejects malformed idempotency key before a debit", async badKey => {
    process.env.SOL_WALLET_PAYMENTS_ENABLED = "true";
    const req = request(app).post(url).set("Authorization", "Bearer sol-test-token");
    if (badKey) req.set("Idempotency-Key", badKey);
    const res = await req;
    expect(res.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
});
