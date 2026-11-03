import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  findRequest: vi.fn(),
  findUser: vi.fn(),
  transaction: vi.fn(),
  currentUser: vi.fn(() => ({ id: 999 })),
}));
vi.mock("../middleware/authenticate", () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  currentUser: mocks.currentUser,
}));
vi.mock("../middleware/adminOnly", () => ({
  adminOnly: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../models", () => ({
  BorrowRequest: { findByPk: mocks.findRequest, findAll: vi.fn(), findOne: vi.fn(), create: vi.fn() },
  User: { findByPk: mocks.findUser },
  sequelize: { transaction: mocks.transaction },
}));
import borrowRoutes from "../routes/borrowRoutes";

const app = express();
app.use(express.json());
app.use("/api/borrow-requests", borrowRoutes);

const makeRequest = (status: "pending" | "approved" | "rejected" = "pending", creditedAt: Date | null = null) => ({
  id: 7, userId: 10, amount: 50, reason: "Bezwen pèsonèl", status,
  creditedAt, creditedBy: null, borrowableBefore: null, withdrawableBefore: null,
  reviewedAt: null, reviewedBy: null, save: vi.fn().mockResolvedValue(undefined),
});
const makeUser = (limit = 100, cash = 265) => ({
  id: 10, borrowablePoints: limit, withdrawablePoints: cash,
  save: vi.fn().mockResolvedValue(undefined),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async (callback: (t: unknown) => Promise<unknown>) =>
    callback({ LOCK: { UPDATE: "UPDATE" } }));
});

describe("Borrow approval wallet credit", () => {
  it("atomically moves 50 of 100 available points into withdrawable (265 to 315)", async () => {
    const borrow = makeRequest();
    const user = makeUser();
    mocks.findRequest.mockResolvedValue(borrow);
    mocks.findUser.mockResolvedValue(user);
    const response = await request(app).patch("/api/borrow-requests/admin/7/decision").send({ decision: "approved" });
    expect(response.status).toBe(200);
    expect(borrow.status).toBe("approved");
    expect(borrow.creditedAt).toBeInstanceOf(Date);
    expect(borrow.creditedBy).toBe(999);
    expect(borrow.borrowableBefore).toBe(100);
    expect(borrow.withdrawableBefore).toBe(265);
    expect(user.borrowablePoints).toBe(50);
    expect(user.withdrawablePoints).toBe(315);
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(borrow.save).toHaveBeenCalled();
    expect(mocks.findRequest.mock.calls[0][1]).toEqual(expect.objectContaining({ lock: "UPDATE" }));
    expect(mocks.findUser.mock.calls[0][1]).toEqual(expect.objectContaining({ lock: "UPDATE" }));
  });
  it("rejects without touching balances", async () => {
    const borrow = makeRequest();
    const user = makeUser();
    mocks.findRequest.mockResolvedValue(borrow);
    mocks.findUser.mockResolvedValue(user);
    const response = await request(app).patch("/api/borrow-requests/admin/7/decision").send({ decision: "rejected" });
    expect(response.status).toBe(200);
    expect(borrow.status).toBe("rejected");
    expect(borrow.creditedAt).toBeNull();
    expect(user.borrowablePoints).toBe(100);
    expect(user.withdrawablePoints).toBe(265);
    expect(user.save).not.toHaveBeenCalled();
  });
  it("refuses approval of a previously decided request", async () => {
    const borrow = makeRequest("approved", new Date());
    mocks.findRequest.mockResolvedValue(borrow);
    const response = await request(app).patch("/api/borrow-requests/admin/7/decision").send({ decision: "approved" });
    expect(response.status).toBe(409);
    expect(mocks.findUser).not.toHaveBeenCalled();
  });
  it("credits an older approved request exactly once", async () => {
    const borrow = makeRequest("approved");
    const user = makeUser();
    mocks.findRequest.mockResolvedValue(borrow);
    mocks.findUser.mockResolvedValue(user);
    const first = await request(app).patch("/api/borrow-requests/admin/7/credit").send({});
    expect(first.status).toBe(200);
    expect(user.borrowablePoints).toBe(50);
    expect(user.withdrawablePoints).toBe(315);
    const second = await request(app).patch("/api/borrow-requests/admin/7/credit").send({});
    expect(second.status).toBe(409);
    expect(user.borrowablePoints).toBe(50);
    expect(user.withdrawablePoints).toBe(315);
  });
  it("does not approve when the remaining allowance is lower than the request", async () => {
    const borrow = makeRequest();
    const user = makeUser(40, 265);
    mocks.findRequest.mockResolvedValue(borrow);
    mocks.findUser.mockResolvedValue(user);
    const response = await request(app).patch("/api/borrow-requests/admin/7/decision").send({ decision: "approved" });
    expect(response.status).toBe(409);
    expect(user.withdrawablePoints).toBe(265);
    expect(user.save).not.toHaveBeenCalled();
  });
  it("rejects a second credit if the balance would overflow the database integer", async () => {
    const borrow = makeRequest("approved");
    const user = makeUser(100, 2147483640);
    mocks.findRequest.mockResolvedValue(borrow);
    mocks.findUser.mockResolvedValue(user);
    const response = await request(app).patch("/api/borrow-requests/admin/7/credit").send({});
    expect(response.status).toBe(409);
    expect(user.borrowablePoints).toBe(100);
    expect(user.save).not.toHaveBeenCalled();
  });
});
