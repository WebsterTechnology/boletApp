import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  currentUser: () => ({ id: 7 }),
  findAll: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  bulkCreate: vi.fn(),
  contributionsFindAll: vi.fn(),
  contributionsDestroy: vi.fn(),
  paymentAttemptsFindAll: vi.fn(),
  paymentAttemptFindOne: vi.fn(),
  paymentAttemptCreate: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("../middleware/authenticate", () => ({ authenticate: mocks.authenticate, currentUser: mocks.currentUser }));
vi.mock("../config/database", () => ({ sequelize: { transaction: mocks.transaction } }));
vi.mock("../models/Sol", () => ({
  SOL_MONTHLY_AMOUNTS_CENTS: [10000, 20000, 50000, 100000],
  SolPackage: { findAll: mocks.findAll, findOne: mocks.findOne, create: mocks.create },
  SolContribution: { bulkCreate: mocks.bulkCreate, findAll: mocks.contributionsFindAll, destroy: mocks.contributionsDestroy },
}));
vi.mock("../models/SolPaymentAttempt", () => ({ SolPaymentAttempt: { findAll: mocks.paymentAttemptsFindAll, findOne: mocks.paymentAttemptFindOne, create: mocks.paymentAttemptCreate } }));
import express from "express";
import request from "supertest";
import solRoutes from "../routes/solRoutes";

const app = express();
app.use(express.json());
app.use("/api/sol", solRoutes);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async (callback: (t: object) => Promise<unknown>) => callback({ LOCK: { UPDATE: "UPDATE" } }));
});
describe("Sòl draft package API", () => {
  it.each([10000, 20000, 50000, 100000])("accepts approved amount %i cents and creates 12 pending installments", async amount => {
    mocks.create.mockResolvedValue({ id: 42, toJSON: () => ({ id: 42 }) });
    const response = await request(app).post("/api/sol/packages").send({ monthlyAmountCents: amount, dueDay: 15 });
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, monthlyAmountCents: amount, status: "draft" }), expect.anything());
    expect(mocks.bulkCreate).toHaveBeenCalledWith(expect.arrayContaining([{ packageId: 42, installmentNumber: 1, amountCents: amount, status: "pending" }]), expect.anything());
    expect(mocks.bulkCreate.mock.calls[0][0]).toHaveLength(12);
  });
  it.each([{ monthlyAmountCents: 9999, dueDay: 15 }, { monthlyAmountCents: 10000, dueDay: 0 }, { monthlyAmountCents: 10000, dueDay: 29 }, { monthlyAmountCents: "10000", dueDay: 15 }, { monthlyAmountCents: 10000, dueDay: 1.5 }])("rejects invalid draft payload %#", async payload => {
    const response = await request(app).post("/api/sol/packages").send(payload);
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("lists only authenticated user's packages", async () => {
    mocks.findAll.mockResolvedValue([]);
    expect((await request(app).get("/api/sol/packages")).status).toBe(200);
    expect(mocks.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 7 } }));
  });
  it("does not expose another user's package", async () => {
    mocks.findOne.mockResolvedValue(null);
    expect((await request(app).get("/api/sol/packages/88")).status).toBe(404);
    expect(mocks.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 88, userId: 7 } }));
  });
  it("deletes only a pristine draft belonging to the user", async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    mocks.findOne.mockResolvedValue({ paidMonths: 0, destroy });
    mocks.contributionsFindAll.mockResolvedValue(Array.from({ length: 12 }, () => ({ status: "pending", paidAt: null, paymentReference: null })));
    const response = await request(app).delete("/api/sol/packages/42");
    expect(response.status).toBe(204);
    expect(mocks.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42, userId: 7, status: "draft" } }));
    expect(mocks.contributionsDestroy).toHaveBeenCalledWith(expect.objectContaining({ where: { packageId: 42 } }));
    expect(destroy).toHaveBeenCalled();
  });
  it("refuses to delete a draft with recorded payment activity", async () => {
    const destroy = vi.fn();
    mocks.findOne.mockResolvedValue({ paidMonths: 0, destroy });
    mocks.contributionsFindAll.mockResolvedValue(Array.from({ length: 12 }, (_, i) => ({ status: i === 0 ? "paid" : "pending" })));
    expect((await request(app).delete("/api/sol/packages/42")).status).toBe(404);
    expect(mocks.contributionsDestroy).not.toHaveBeenCalled();
    expect(destroy).not.toHaveBeenCalled();
  });
  it("does not delete another customer's draft", async () => {
    mocks.findOne.mockResolvedValue(null);
    expect((await request(app).delete("/api/sol/packages/42")).status).toBe(404);
    expect(mocks.contributionsDestroy).not.toHaveBeenCalled();
  });
  it("returns a server-priced preview without collecting payment", async () => {
    mocks.findOne.mockResolvedValue({ id: 42, monthlyAmountCents: 10000, status: "draft" });
    mocks.contributionsFindAll.mockResolvedValue([{ installmentNumber: 1, amountCents: 10000, status: "pending", paidAt: null, paymentReference: null }]);
    const response = await request(app).get("/api/sol/packages/42/payment-preview");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ amountCents: 10000, installmentNumber: 1, paymentEnabled: false, currency: "BRL" });
    expect(mocks.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42, userId: 7 } }));
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not preview another customer's package", async () => {
    mocks.findOne.mockResolvedValue(null);
    expect((await request(app).get("/api/sol/packages/42/payment-preview")).status).toBe(404);
  });
  it("rejects invalid preview IDs", async () => {
    expect((await request(app).get("/api/sol/packages/abc/payment-preview")).status).toBe(400);
  });
  it("returns only own package payment history with safe public fields", async () => {
    mocks.findOne.mockResolvedValue({ id: 42 });
    mocks.paymentAttemptsFindAll.mockResolvedValue([]);
    const response = await request(app).get("/api/sol/packages/42/payment-attempts");
    expect(response.status).toBe(200);
    expect(mocks.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42, userId: 7 } }));
    expect(mocks.paymentAttemptsFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { packageId: 42, userId: 7 },
      attributes: expect.not.arrayContaining(["idempotencyKey", "providerReference"]),
    }));
  });
  it("does not expose another customer's payment history", async () => {
    mocks.findOne.mockResolvedValue(null);
    expect((await request(app).get("/api/sol/packages/42/payment-attempts")).status).toBe(404);
    expect(mocks.paymentAttemptsFindAll).not.toHaveBeenCalled();
  });
  it("rejects malformed payment history IDs", async () => {
    expect((await request(app).get("/api/sol/packages/nope/payment-attempts")).status).toBe(400);
  });
  it("creates a payment intent using locked server-side installment price without charging", async () => {
    mocks.findOne.mockResolvedValue({ id: 42, monthlyAmountCents: 10000, status: "draft" });
    mocks.paymentAttemptFindOne.mockResolvedValue(null);
    mocks.contributionsFindAll.mockResolvedValue([{ id: 81, installmentNumber: 1, amountCents: 10000, status: "pending" }]);
    mocks.paymentAttemptCreate.mockResolvedValue({ id: 5, packageId: 42, contributionId: 81, amountCents: 10000, currency: "BRL", method: "pix", status: "created" });
    const response = await request(app).post("/api/sol/packages/42/payment-intents").set("Idempotency-Key", "unique_request_1234").send({ method: "pix", amountCents: 1 });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ amountCents: 10000, paymentEnabled: false, status: "created" });
    expect(mocks.paymentAttemptCreate).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 10000, contributionId: 81, userId: 7 }), expect.anything());
  });
  it("replays the same idempotency key without creating a new attempt", async () => {
    mocks.findOne.mockResolvedValue({ id: 42 });
    mocks.paymentAttemptFindOne.mockResolvedValue({ id: 5, packageId: 42, contributionId: 81, amountCents: 10000, currency: "BRL", method: "pix", status: "created" });
    const response = await request(app).post("/api/sol/packages/42/payment-intents").set("Idempotency-Key", "unique_request_1234").send({ method: "pix" });
    expect(response.status).toBe(200);
    expect(mocks.paymentAttemptCreate).not.toHaveBeenCalled();
  });
  it("rejects short idempotency keys", async () => {
    const response = await request(app).post("/api/sol/packages/42/payment-intents").set("Idempotency-Key", "short").send({ method: "pix" });
    expect(response.status).toBe(400);
  });
  it("rejects malformed package identifiers", async () => {
    expect((await request(app).get("/api/sol/packages/not-an-id")).status).toBe(400);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });
});
