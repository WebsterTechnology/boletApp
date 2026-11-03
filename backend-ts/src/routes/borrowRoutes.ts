import { Router } from "express";
import { UniqueConstraintError } from "sequelize";
import { authenticate, currentUser } from "../middleware/authenticate";
import { adminOnly } from "../middleware/adminOnly";
import { BorrowRequest, User, sequelize } from "../models";
import type { Transaction } from "sequelize";

const router = Router();
router.use(authenticate);

// Customer: current user's requests only.
router.get("/mine", async (req, res) => {
  try {
    const rows = await BorrowRequest.findAll({ where: { userId: currentUser(req).id }, order: [["createdAt","DESC"],["id","DESC"]], limit: 50 });
    return res.json(rows);
  } catch { return res.status(500).json({ message: "Pa kapab chaje demann prè yo." }); }
});

// Submission records a request. It never credits a wallet or disburses money.
router.post("/", async (req, res) => {
  const amount = req.body?.amount;
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (!Number.isSafeInteger(amount) || amount <= 0 || !reason || reason.length > 120)
    return res.status(400).json({ message: "Antre yon kantite pwen valid ak yon rezon." });
  try {
    const result = await sequelize.transaction(async transaction => {
      const user = await User.findByPk(currentUser(req).id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) return { error: "Kont sa a pa egziste.", status: 404 };
      if (amount > Number(user.borrowablePoints ?? 0)) return { error: "Kantite a depase limit ou disponib.", status: 400 };
      const pending = await BorrowRequest.findOne({ where: { userId: user.id, status: "pending" }, transaction });
      if (pending) return { error: "Ou deja gen yon demann prè annatant.", status: 409 };
      const request = await BorrowRequest.create({ userId: user.id, amount, reason }, { transaction });
      return { request };
    });
    if ("error" in result) return res.status(result.status ?? 400).json({ message: result.error });
    return res.status(201).json(result.request);
  } catch (error) {
    if (error instanceof UniqueConstraintError) return res.status(409).json({ message: "Ou deja gen yon demann prè annatant." });
    console.error("borrow request create failed", error instanceof Error ? error.name : "unknown");
    return res.status(500).json({ message: "Pa kapab voye demann prè a." });
  }
});

// Administrator: list with customer identification.
router.get("/admin", adminOnly, async (_req, res) => {
  try {
    const requests = await BorrowRequest.findAll({
      include: [{ model: User, as: "customer", attributes: ["id","fullName","phone","borrowablePoints"] }],
      order: [["createdAt","DESC"],["id","DESC"]], limit: 300,
    });
    return res.json(requests);
  } catch { return res.status(500).json({ message: "Pa kapab chaje demann prè yo." }); }
});

// The request row and customer wallet row are locked in the same database transaction.
// A creditedAt audit marker on the locked request prevents a second credit on retries.
async function creditApprovedRequest(request: BorrowRequest, user: User, adminId: number, transaction: Transaction) {
  if (request.creditedAt) return { status: 409, message: "Prè sa a deja kredite." };
  const amount = Number(request.amount);
  const allowance = Number(user.borrowablePoints ?? 0);
  const withdrawable = Number(user.withdrawablePoints ?? 0);
  if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(allowance) || allowance < amount)
    return { status: 409, message: "Limit prè kliyan an pa sifi pou demann sa a." };
  if (!Number.isSafeInteger(withdrawable) || withdrawable < 0 || !Number.isSafeInteger(withdrawable + amount) || withdrawable + amount > 2147483647)
    return { status: 409, message: "Balans retrè kliyan an pa ka resevwa kantite sa a." };

  user.borrowablePoints = allowance - amount;
  user.withdrawablePoints = withdrawable + amount;
  request.borrowableBefore = allowance;
  request.withdrawableBefore = withdrawable;
  request.creditedAt = new Date();
  request.creditedBy = adminId;
  await user.save({ transaction });
  await request.save({ transaction });
  return null;
}

// Approvals now atomically move the approved amount into withdrawable points.
router.patch("/admin/:id/decision", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  const decision = req.body?.decision;
  if (!Number.isSafeInteger(id) || id <= 0 || !["approved","rejected"].includes(decision))
    return res.status(400).json({ message: "Desizyon an pa valid." });
  try {
    const result = await sequelize.transaction(async transaction => {
      const request = await BorrowRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!request) return { status: 404, message: "Demann pa jwenn." };
      if (request.status !== "pending") return { status: 409, message: "Demann sa a deja gen yon desizyon." };
      const user = await User.findByPk(request.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) return { status: 404, message: "Kliyan pa jwenn." };
      if (decision === "approved" && request.amount > Number(user.borrowablePoints ?? 0))
        return { status: 409, message: "Limit kliyan an chanje; demann nan depase limit aktyèl la." };
      if (decision === "approved") {
        const error = await creditApprovedRequest(request, user, currentUser(req).id, transaction);
        if (error) return error;
      }
      request.status = decision;
      request.reviewedBy = currentUser(req).id;
      request.reviewedAt = new Date();
      await request.save({ transaction });
      return { request, wallet: {
        borrowablePoints: Number(user.borrowablePoints ?? 0),
        withdrawablePoints: Number(user.withdrawablePoints ?? 0),
      } };
    });
    if ("message" in result) return res.status(result.status ?? 400).json({ message: result.message });
    return res.json(result.request);
  } catch (error) {
    console.error("borrow decision failed", error instanceof Error ? error.name : "unknown");
    return res.status(500).json({ message: "Pa kapab anrejistre desizyon an." });
  }
});
// Older approved requests predate wallet crediting. Require a separate explicit
// administrator click rather than silently crediting historical requests during deployment.
router.patch("/admin/:id/credit", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "ID demann lan pa valid." });
  try {
    const result = await sequelize.transaction(async transaction => {
      const request = await BorrowRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!request) return { status: 404, message: "Demann pa jwenn." };
      if (request.status !== "approved") return { status: 409, message: "Se sèlman prè apwouve ki ka kredite." };
      if (request.creditedAt) return { status: 409, message: "Prè sa a deja kredite." };
      const user = await User.findByPk(request.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) return { status: 404, message: "Kliyan pa jwenn." };
      const error = await creditApprovedRequest(request, user, currentUser(req).id, transaction);
      if (error) return error;
      return { request, wallet: {
        borrowablePoints: Number(user.borrowablePoints ?? 0),
        withdrawablePoints: Number(user.withdrawablePoints ?? 0),
      } };
    });
    if ("message" in result) return res.status(result.status ?? 400).json({ message: result.message });
    return res.json(result);
  } catch (error) {
    console.error("borrow credit failed", error instanceof Error ? error.name : "unknown");
    return res.status(500).json({ message: "Pa kapab kredite prè a." });
  }
});
export default router;
