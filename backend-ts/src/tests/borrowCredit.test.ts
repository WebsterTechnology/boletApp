import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  findRequest: vi.fn(),
  findUser: vi.fn(),
  transaction: vi.fn(),
  query: vi.fn(),
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
  sequelize: { transaction: mocks.transaction, query: mocks.query },
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

describe("Borrow wallet repayment HTTP transaction", () => {
  const key = "repaymentTestKey00000001";
  it("returns disabled without modifying the wallet when the feature flag is off", async () => {
    const previous = process.env.BORROW_WALLET_REPAYMENTS_ENABLED;
    delete process.env.BORROW_WALLET_REPAYMENTS_ENABLED;
    try {
      const response = await request(app).post("/api/borrow-requests/7/wallet-repayments")
        .set("Idempotency-Key",key).send({amount:10});
      expect(response.status).toBe(503);
      expect(mocks.transaction).not.toHaveBeenCalled();
    } finally {
      if(previous===undefined) delete process.env.BORROW_WALLET_REPAYMENTS_ENABLED;
      else process.env.BORROW_WALLET_REPAYMENTS_ENABLED=previous;
    }
  });
  it("atomically debits 10 points and refuses duplicate debit on retry", async () => {
    const previous = process.env.BORROW_WALLET_REPAYMENTS_ENABLED;
    process.env.BORROW_WALLET_REPAYMENTS_ENABLED="true";
    const borrow = {...makeRequest("approved",new Date()),repaidPoints:0};
    const user = {...makeUser(50,315),points:1600};
    mocks.currentUser.mockReturnValue({id:10});
    mocks.findRequest.mockResolvedValue(borrow);
    mocks.findUser.mockResolvedValue(user);
    let saved = false;
    mocks.query.mockImplementation(async (sql:string) => {
      if(sql.includes('WHERE "idempotencyKey"')) return saved ? [{borrowRequestId:7,userId:10,amount:10}] : [];
      if(sql.includes('SELECT amount FROM borrow_repayments')) return saved ? [{amount:10}] : [];
      if(sql.includes('SELECT amount, "playDebited"')) return saved ? [{
        amount:10,playDebited:0,withdrawDebited:10,playBefore:1600,withdrawBefore:315,
        playAfter:1600,withdrawAfter:305
      }] : [];
      if(sql.includes('SELECT points FROM borrow_pix_attempts')) return [];
      if(sql.includes('INSERT INTO borrow_repayments')) {saved=true;return [];}
      throw new Error("Unexpected query");
    });
    try {
      const first = await request(app).post("/api/borrow-requests/7/wallet-repayments")
        .set("Idempotency-Key",key).send({amount:10});
      expect(first.status).toBe(200);
      expect(first.body).toEqual(expect.objectContaining({remaining:50,paid:10}));
      expect(user.withdrawablePoints).toBe(305);
      expect(user.points).toBe(1600);
      expect(borrow.repaidPoints).toBe(10);
      const second = await request(app).post("/api/borrow-requests/7/wallet-repayments")
        .set("Idempotency-Key",key).send({amount:10});
      expect(second.status).toBe(200);
      expect(second.body).toEqual(expect.objectContaining({remaining:50,duplicate:true}));
      expect(user.withdrawablePoints).toBe(305);
      expect(borrow.repaidPoints).toBe(10);
      expect(user.save).toHaveBeenCalledTimes(1);
    } finally {
      if(previous===undefined) delete process.env.BORROW_WALLET_REPAYMENTS_ENABLED;
      else process.env.BORROW_WALLET_REPAYMENTS_ENABLED=previous;
    }
  });
});
