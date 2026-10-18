import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  currentUser: () => ({ id: 7 }),
  findAll: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  bulkCreate: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("../middleware/authenticate", () => ({ authenticate: mocks.authenticate, currentUser: mocks.currentUser }));
vi.mock("../config/database", () => ({ sequelize: { transaction: mocks.transaction } }));
vi.mock("../models/Sol", () => ({
  SOL_MONTHLY_AMOUNTS_CENTS: [10000, 20000, 50000, 100000],
  SolPackage: { findAll: mocks.findAll, findOne: mocks.findOne, create: mocks.create },
  SolContribution: { bulkCreate: mocks.bulkCreate },
}));
import express from "express";
import request from "supertest";
import solRoutes from "../routes/solRoutes";

const app = express();
app.use(express.json());
app.use("/api/sol", solRoutes);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async (callback: (t: object) => Promise<unknown>) => callback({}));
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
  it("rejects malformed package identifiers", async () => {
    expect((await request(app).get("/api/sol/packages/not-an-id")).status).toBe(400);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });
});
