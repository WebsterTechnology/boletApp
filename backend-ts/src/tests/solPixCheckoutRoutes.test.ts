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
});
