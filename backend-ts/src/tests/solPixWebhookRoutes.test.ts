import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  paymentCheck: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("axios", () => ({ default: { post: mocks.paymentCheck } }));
vi.mock("../config/database", () => ({ sequelize: { transaction: mocks.transaction } }));
vi.mock("../config/env", () => ({ env: { infinitepayHandle: "test-merchant" } }));
vi.mock("../models/Sol", () => ({ SolPackage: {}, SolContribution: {} }));
vi.mock("../models/SolPaymentAttempt", () => ({ SolPaymentAttempt: {} }));
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
});
