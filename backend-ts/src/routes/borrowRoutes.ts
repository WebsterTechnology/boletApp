import { Router } from "express";
import { UniqueConstraintError, QueryTypes } from "sequelize";
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
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1789569705 || !reason || reason.length > 120)
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

const LOAN_TERM_MS = 30 * 86400000;
import { loanTotal, repaymentAllowed, allocateWalletRepayment } from "../services/borrowRepayment";

// Loan repayments are feature-flagged until ledger and settlement tests pass.
// PIX settlement requires a separate, verified payment-provider integration.
router.post("/:id/wallet-repayments", async (req, res) => {
  if (process.env.BORROW_WALLET_REPAYMENTS_ENABLED !== "true")
    return res.status(503).json({ message: "Peman prè yo poko aktive." });
  const id = Number(req.params.id);
  const amount = req.body?.amount;
  const key = req.get("Idempotency-Key");
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(amount) || amount < 1 || amount > 2147483647 ||
      !key || !/^[A-Za-z0-9_-]{16,128}$/.test(key))
    return res.status(400).json({ message: "Kantite oswa referans peman an pa valid." });
  try {
    const result = await sequelize.transaction(async transaction => {
      const loan = await BorrowRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!loan || loan.userId !== currentUser(req).id) return { code: 404, message: "Prè pa jwenn." };
      const user = await User.findByPk(loan.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) return { code: 404, message: "Kont pa jwenn." };
      const previous = await sequelize.query<{ borrowRequestId: number; userId: number; amount: number }>(
        'SELECT "borrowRequestId", "userId", amount FROM borrow_repayments WHERE "idempotencyKey" = :key LIMIT 1',
        { replacements: { key }, type: QueryTypes.SELECT, transaction }
      );
      if (previous.length) {
        if (previous[0].borrowRequestId !== id || previous[0].userId !== loan.userId || previous[0].amount !== amount)
          return { code: 409, message: "Referans peman sa a deja sèvi pou yon lòt peman." };
        return { code: 200, remaining: Math.max(0, loanTotal(loan.amount) - Number(loan.repaidPoints)), duplicate: true };
      }
      if (loan.status !== "approved" || !loan.creditedAt)
        return { code: 409, message: "Prè sa a poko kredite." };
      const total = loanTotal(Number(loan.amount));
      const remaining = total - Number(loan.repaidPoints);
      if (!Number.isSafeInteger(remaining) || remaining <= 0 || amount > remaining)
        return { code: 409, message: "Kantite a depase rès prè a oswa prè a fin peye." };
      const dueAt = new Date(loan.creditedAt).getTime() + LOAN_TERM_MS;
      if (!repaymentAllowed(amount, remaining, dueAt, Date.now()))
        return { code: 409, message: "Nan dènye jou a, ou dwe peye tout rès prè a." };
      const play = Number(user.points);
      const withdraw = Number(user.withdrawablePoints);
      const debit = allocateWalletRepayment(play, withdraw, amount);
      if (!debit) return { code: 409, message: "Balans Bolet ou pa sifi." };
      const { withdrawDebited, playDebited } = debit;
      user.withdrawablePoints = debit.withdrawAfter;
      user.points = debit.playAfter;
      loan.repaidPoints = Number(loan.repaidPoints) + amount;
      await user.save({ transaction });
      await loan.save({ transaction });
      await sequelize.query(
        'INSERT INTO borrow_repayments ("borrowRequestId","userId",amount,"playDebited","withdrawDebited","playBefore","withdrawBefore","playAfter","withdrawAfter",method,"idempotencyKey","createdAt") VALUES (:id,:userId,:amount,:playDebited,:withdrawDebited,:playBefore,:withdrawBefore,:playAfter,:withdrawAfter,\'wallet\',:key,NOW())',
        { replacements: { id, userId: user.id, amount, playDebited, withdrawDebited, playBefore: play, withdrawBefore: withdraw, playAfter: debit.playAfter, withdrawAfter: debit.withdrawAfter, key }, transaction }
      );
      return { code: 200, remaining: remaining - amount, paid: amount };
    });
    if ("message" in result) return res.status(result.code).json({ message: result.message });
    return res.status(result.code).json(result);
  } catch (error) {
    if (error instanceof UniqueConstraintError) return res.status(409).json({ message: "Peman sa a deja anrejistre." });
    console.error("borrow repayment failed", error instanceof Error ? error.name : "unknown");
    return res.status(500).json({ message: "Peman an pa pase." });
  }
});
router.get("/:id/repayments", async (req,res) => {
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1) return res.status(400).json({message:"ID pa valid."});
  try {
    const loan=await BorrowRequest.findByPk(id);
    if(!loan || (loan.userId!==currentUser(req).id && !currentUser(req).isAdmin))
      return res.status(404).json({message:"Prè pa jwenn."});
    const payments=await sequelize.query(
      'SELECT id, amount, method, "playDebited", "withdrawDebited", "playBefore", "withdrawBefore", "playAfter", "withdrawAfter", "createdAt" FROM borrow_repayments WHERE "borrowRequestId"=:id ORDER BY "createdAt" DESC',
      {replacements:{id},type:QueryTypes.SELECT}
    );
    return res.json({total:loanTotal(Number(loan.amount)),repaid:Number(loan.repaidPoints),remaining:Math.max(0,loanTotal(Number(loan.amount))-Number(loan.repaidPoints)),payments});
  } catch {return res.status(500).json({message:"Pa kapab chaje peman yo."});}
});

export default router;
