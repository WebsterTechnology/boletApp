import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  paymentCheck: vi.fn(),
  transaction: vi.fn(),
  attemptFindByPk: vi.fn(),
  packageFindOne: vi.fn(),
  contributionsFindAll: vi.fn(),
}));
vi.mock("axios", () => ({ default: { post: mocks.paymentCheck } }));
vi.mock("../config/database", () => ({ sequelize: { transaction: mocks.transaction } }));
vi.mock("../config/env", () => ({ env: { infinitepayHandle: "test-merchant" } }));
vi.mock("../models/Sol", () => ({ SolPackage: { findOne: mocks.packageFindOne }, SolContribution: { findAll: mocks.contributionsFindAll } }));
vi.mock("../models/SolPaymentAttempt", () => ({ SolPaymentAttempt: { findByPk: mocks.attemptFindByPk } }));
import solPixWebhookRoutes from "../routes/solPixWebhookRoutes";

const app = express();
app.use(express.json());
app.use("/api/sol-pix", solPixWebhookRoutes);
const callback = { order_nsu: "sol-pix-12", transaction_nsu: "txn-123", invoice_slug: "invoice-123" };

describe("Sòl PIX webhook request boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SOL_PIX_WEBHOOK_ENABLED;
  });
  it("stays disabled by default and never calls the provider", async () => {
    const response = await request(app).post("/api/sol-pix/webhook").send(callback);
    expect(response.status).toBe(503);
    expect(mocks.paymentCheck).not.toHaveBeenCalled();
  });
  it.each([
    { ...callback, order_nsu: "user-12" },
    { ...callback, order_nsu: "sol-pix-0" },
    { ...callback, order_nsu: "sol-pix-" + "9".repeat(80) },
    { ...callback, transaction_nsu: "" },
    { ...callback, transaction_nsu: "x".repeat(256) },
    { ...callback, invoice_slug: "x".repeat(256) },
    { ...callback, invoice_slug: null },
  ])("rejects malformed callback before contacting InfinitePay", async payload => {
    process.env.SOL_PIX_WEBHOOK_ENABLED = "true";
    const response = await request(app).post("/api/sol-pix/webhook").send(payload);
    expect(response.status).toBe(400);
    expect(mocks.paymentCheck).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rejects unpaid provider responses without database mutation", async () => {
    process.env.SOL_PIX_WEBHOOK_ENABLED = "true";
    mocks.paymentCheck.mockResolvedValue({ data: { success: true, paid: false, amount: 10000 } });
    const response = await request(app).post("/api/sol-pix/webhook").send(callback);
    expect(response.status).toBe(400);
    expect(mocks.paymentCheck).toHaveBeenCalledWith(
      "https://api.checkout.infinitepay.io/payment_check",
      { handle: "test-merchant", order_nsu: "sol-pix-12", transaction_nsu: "txn-123", slug: "invoice-123" },
      expect.objectContaining({ timeout: 5000 }),
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("settles exactly one verified installment and safely acknowledges a duplicate callback", async () => {
    process.env.SOL_PIX_WEBHOOK_ENABLED = "true";
    const savePackage = vi.fn().mockResolvedValue(undefined);
    const saveAttempt = vi.fn().mockResolvedValue(undefined);
    const saveContribution = vi.fn().mockResolvedValue(undefined);
    const pkg = { id: 4, userId: 7, status: "active", paidMonths: 1, save: savePackage };
    const attempt = { id: 12, userId: 7, packageId: 4, contributionId: 31,
      amountCents: 20000, currency: "BRL", method: "pix", status: "created",
      providerReference: "sol-pix-12", confirmedAt: null, save: saveAttempt };
    const contributions = Array.from({ length: 12 }, (_, i) => ({
      id: 30 + i, installmentNumber: i + 1, amountCents: 20000,
      status: i === 0 ? "paid" : "pending",
      paidAt: i === 0 ? new Date() : null,
      paymentReference: i === 0 ? "sol-wallet-9" : null,
      save: saveContribution,
    }));
    mocks.paymentCheck.mockResolvedValue({ data: { success: true, paid: true, amount: 20000 } });
    mocks.transaction.mockImplementation(async (cb: (t: object) => Promise<unknown>) =>
      cb({ LOCK: { UPDATE: "UPDATE" } }));
    mocks.attemptFindByPk.mockImplementation(async () => attempt);
    mocks.packageFindOne.mockImplementation(async () => pkg);
    mocks.contributionsFindAll.mockImplementation(async () => contributions);
    const first = await request(app).post("/api/sol-pix/webhook").send(callback);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ success: true, alreadyProcessed: false });
    expect(contributions[1].status).toBe("paid");
    expect(contributions[1].paymentReference).toBe("sol-pix-12");
    expect(pkg.paidMonths).toBe(2);
    expect(attempt.status).toBe("confirmed");
    expect(saveContribution).toHaveBeenCalledTimes(1);
    expect(savePackage).toHaveBeenCalledTimes(1);
    expect(saveAttempt).toHaveBeenCalledTimes(1);
    const second = await request(app).post("/api/sol-pix/webhook").send(callback);
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ success: true, alreadyProcessed: true });
    expect(saveContribution).toHaveBeenCalledTimes(1);
    expect(savePackage).toHaveBeenCalledTimes(1);
    expect(saveAttempt).toHaveBeenCalledTimes(1);
  });

  it("does not settle when provider confirms the wrong installment amount", async () => {
    process.env.SOL_PIX_WEBHOOK_ENABLED = "true";
    mocks.paymentCheck.mockResolvedValue({ data: { success: true, paid: true, amount: 19999 } });
    mocks.transaction.mockImplementation(async (cb: (t: object) => Promise<unknown>) =>
      cb({ LOCK: { UPDATE: "UPDATE" } }));
    const save = vi.fn();
    mocks.attemptFindByPk.mockResolvedValue({ id: 12, userId: 7, packageId: 4, contributionId: 31,
      amountCents: 20000, currency: "BRL", method: "pix", status: "created",
      providerReference: "sol-pix-12", save });
    mocks.packageFindOne.mockResolvedValue({ id: 4, userId: 7, status: "draft", paidMonths: 0, save });
    mocks.contributionsFindAll.mockResolvedValue(Array.from({ length: 12 }, (_, i) => ({
      id: 31 + i, installmentNumber: i + 1, amountCents: 20000,
      status: "pending", paidAt: null, paymentReference: null, save,
    })));
    const response = await request(app).post("/api/sol-pix/webhook").send(callback);
    expect(response.status).toBe(409);
    expect(save).not.toHaveBeenCalled();
  });

  it("never settles an unrecognized provider order even when payment_check says paid", async () => {
    process.env.SOL_PIX_WEBHOOK_ENABLED = "true";
    mocks.paymentCheck.mockResolvedValue({ data: { success: true, paid: true, amount: 20000 } });
    mocks.transaction.mockImplementation(async (cb: (t: object) => Promise<unknown>) =>
      cb({ LOCK: { UPDATE: "UPDATE" } }));
    mocks.attemptFindByPk.mockResolvedValue(null);
    const response = await request(app).post("/api/sol-pix/webhook").send(callback);
    expect(response.status).toBe(404);
    expect(mocks.packageFindOne).not.toHaveBeenCalled();
    expect(mocks.contributionsFindAll).not.toHaveBeenCalled();
  });
  it("never settles when order reference differs from the stored reserved provider order", async () => {
    process.env.SOL_PIX_WEBHOOK_ENABLED = "true";
    mocks.paymentCheck.mockResolvedValue({ data: { success: true, paid: true, amount: 20000 } });
    mocks.transaction.mockImplementation(async (cb: (t: object) => Promise<unknown>) =>
      cb({ LOCK: { UPDATE: "UPDATE" } }));
    mocks.attemptFindByPk.mockResolvedValue({
      id: 12, userId: 7, packageId: 4, contributionId: 31,
      method: "pix", providerReference: "sol-pix-99",
    });
    const response = await request(app).post("/api/sol-pix/webhook").send(callback);
    expect(response.status).toBe(404);
    expect(mocks.packageFindOne).not.toHaveBeenCalled();
    expect(mocks.contributionsFindAll).not.toHaveBeenCalled();
  });
  it("returns a retryable response without touching the database when provider verification fails", async () => {
    process.env.SOL_PIX_WEBHOOK_ENABLED = "true";
    mocks.paymentCheck.mockRejectedValue(new Error("InfinitePay timeout"));
    const response = await request(app).post("/api/sol-pix/webhook").send(callback);
    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ success: false });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

});
