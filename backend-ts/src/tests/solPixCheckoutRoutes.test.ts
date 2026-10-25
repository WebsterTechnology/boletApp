import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  providerPost: vi.fn(),
  transaction: vi.fn(),
  packageFindOne: vi.fn(),
  attemptFindOne: vi.fn(),
  contributionsFindAll: vi.fn(),
}));
vi.mock("axios", () => ({ default: { post: mocks.providerPost } }));
vi.mock("../middleware/authenticate", () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  currentUser: () => ({ id: 7 }),
}));
vi.mock("../config/database", () => ({ sequelize: { transaction: mocks.transaction } }));
vi.mock("../config/env", () => ({ env: { infinitepayHandle: "test-merchant" } }));
vi.mock("../models/Sol", () => ({
  SolPackage: { findOne: mocks.packageFindOne },
  SolContribution: { findAll: mocks.contributionsFindAll },
}));
vi.mock("../models/SolPaymentAttempt", () => ({
  SolPaymentAttempt: { findOne: mocks.attemptFindOne },
}));
import checkoutRoutes from "../routes/solPixCheckoutRoutes";

const app = express();
app.use(express.json());
app.use("/api/sol", checkoutRoutes);
const path = "/api/sol/packages/4/pix-checkout";
const key = "unique_pix_request_1234";
const checkoutUrl = "https://checkout.infinitepay.io/pay/123";

describe("Sòl PIX checkout recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SOL_PIX_CHECKOUT_ENABLED = "true";
    process.env.SOL_PIX_WEBHOOK_ENABLED = "true";
    process.env.SOL_PIX_WEBHOOK_URL = "https://api.example.com/api/sol-pix/webhook";
    process.env.SOL_PIX_REDIRECT_URL = "https://htnovatech.com/";
    mocks.transaction.mockImplementation(async (cb: (t: object) => Promise<unknown>) =>
      cb({ LOCK: { UPDATE: "UPDATE" } }));
    mocks.packageFindOne.mockResolvedValue({ id: 4, userId: 7, status: "active", paidMonths: 1, monthlyAmountCents: 20000 });
    mocks.contributionsFindAll.mockResolvedValue(Array.from({ length: 12 }, (_, i) => ({
      id: 30 + i, installmentNumber: i + 1, amountCents: 20000,
      status: i === 0 ? "paid" : "pending",
      paidAt: i === 0 ? new Date() : null,
      paymentReference: i === 0 ? "sol-wallet-9" : null,
    })));
  });
  it("recovers the original checkout URL without a second provider call", async () => {
    mocks.attemptFindOne.mockResolvedValue({
      id: 12, userId: 7, packageId: 4, contributionId: 31,
      amountCents: 20000, currency: "BRL", method: "pix", status: "created",
      providerReference: "sol-pix-12", checkoutUrl, idempotencyKey: key,
    });
    const response = await request(app).post(path).set("Idempotency-Key", key);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ checkoutUrl, orderNsu: "sol-pix-12", status: "pending" });
    expect(mocks.providerPost).not.toHaveBeenCalled();
  });
  it("fails closed when a provider order is reserved but its URL was lost", async () => {
    mocks.attemptFindOne.mockResolvedValue({
      id: 12, userId: 7, packageId: 4, contributionId: 31,
      amountCents: 20000, currency: "BRL", method: "pix", status: "created",
      providerReference: "sol-pix-12", checkoutUrl: null,
    });
    const response = await request(app).post(path).set("Idempotency-Key", key);
    expect(response.status).toBe(409);
    expect(mocks.providerPost).not.toHaveBeenCalled();
  });
  it("refuses checkout if settlement is disabled", async () => {
    process.env.SOL_PIX_WEBHOOK_ENABLED = "false";
    const response = await request(app).post(path).set("Idempotency-Key", key);
    expect(response.status).toBe(503);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.providerPost).not.toHaveBeenCalled();
  });
  it("rejects malformed idempotency keys before any provider activity", async () => {
    const response = await request(app).post(path).set("Idempotency-Key", "short");
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.providerPost).not.toHaveBeenCalled();
  });
  it("creates one server-priced checkout, persists its URL, and reuses it on retry", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const attempt = {
      id: 12, userId: 7, packageId: 4, contributionId: 31,
      amountCents: 20000, currency: "BRL", method: "pix", status: "created",
      providerReference: null as string | null, checkoutUrl: null as string | null, save,
    };
    mocks.attemptFindOne.mockImplementation(async () => attempt);
    mocks.providerPost.mockResolvedValue({ data: { url: checkoutUrl } });
    const first = await request(app).post(path).set("Idempotency-Key", key)
      .send({ amountCents: 1 });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ checkoutUrl, orderNsu: "sol-pix-12", status: "pending" });
    expect(mocks.providerPost).toHaveBeenCalledTimes(1);
    expect(mocks.providerPost).toHaveBeenCalledWith(
      "https://api.checkout.infinitepay.io/links",
      expect.objectContaining({
        order_nsu: "sol-pix-12",
        webhook_url: "https://api.example.com/api/sol-pix/webhook",
        items: [{ quantity: 1, price: 20000, description: "Sol package 4 installment 31" }],
      }),
      expect.objectContaining({ timeout: 10000 }),
    );
    expect(attempt.providerReference).toBe("sol-pix-12");
    expect(attempt.checkoutUrl).toBe(checkoutUrl);
    expect(save).toHaveBeenCalledTimes(2);
    const replay = await request(app).post(path).set("Idempotency-Key", key);
    expect(replay.status).toBe(200);
    expect(replay.body.checkoutUrl).toBe(checkoutUrl);
    expect(mocks.providerPost).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(2);
  });
  it("rejects a misconfigured Loto webhook before reserving a provider order", async () => {
    process.env.SOL_PIX_WEBHOOK_URL = "https://api.example.com/api/infinitepay/webhook";
    const save = vi.fn();
    const attempt = {
      id: 12, userId: 7, packageId: 4, contributionId: 31,
      amountCents: 20000, currency: "BRL", method: "pix", status: "created",
      providerReference: null, checkoutUrl: null, save,
    };
    mocks.attemptFindOne.mockResolvedValue(attempt);
    const response = await request(app).post(path).set("Idempotency-Key", key);
    expect(response.status).toBe(502);
    expect(save).not.toHaveBeenCalled();
    expect(mocks.providerPost).not.toHaveBeenCalled();
  });

  it("does not issue a second order after an InfinitePay network timeout", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const attempt = {
      id: 12, userId: 7, packageId: 4, contributionId: 31,
      amountCents: 20000, currency: "BRL", method: "pix", status: "created",
      providerReference: null as string | null, checkoutUrl: null, save,
    };
    mocks.attemptFindOne.mockResolvedValue(attempt);
    mocks.providerPost.mockRejectedValue(new Error("provider timeout"));
    const first = await request(app).post(path).set("Idempotency-Key", key);
    expect(first.status).toBe(502);
    expect(attempt.providerReference).toBe("sol-pix-12");
    expect(save).toHaveBeenCalledTimes(1);
    const retry = await request(app).post(path).set("Idempotency-Key", key);
    expect(retry.status).toBe(409);
    expect(mocks.providerPost).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });
  it("rejects an untrusted checkout URL without clearing the reserved order", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const attempt = {
      id: 12, userId: 7, packageId: 4, contributionId: 31,
      amountCents: 20000, currency: "BRL", method: "pix", status: "created",
      providerReference: null as string | null, checkoutUrl: null, save,
    };
    mocks.attemptFindOne.mockResolvedValue(attempt);
    mocks.providerPost.mockResolvedValue({ data: { url: "https://checkout.infinitepay.io.evil.example/pay" } });
    const response = await request(app).post(path).set("Idempotency-Key", key);
    expect(response.status).toBe(502);
    expect(attempt.providerReference).toBe("sol-pix-12");
    expect(attempt.checkoutUrl).toBeNull();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("does not redirect to a payable link after a concurrent webhook settles the installment", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const attempt = {
      id: 12, userId: 7, packageId: 4, contributionId: 31,
      amountCents: 20000, currency: "BRL", method: "pix", status: "created",
      providerReference: null as string | null, checkoutUrl: null as string | null, save,
    };
    mocks.attemptFindOne
      .mockResolvedValueOnce(attempt)
      .mockResolvedValueOnce(null);
    mocks.providerPost.mockResolvedValue({ data: { url: checkoutUrl } });
    const response = await request(app).post(path).set("Idempotency-Key", key);
    expect(response.status).toBe(409);
    expect(response.body.checkoutUrl).toBeUndefined();
    expect(mocks.providerPost).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

});
