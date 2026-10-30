import { Router } from "express";
import { UniqueConstraintError, QueryTypes } from "sequelize";
import { authenticate, currentUser } from "../middleware/authenticate";
import { sequelize } from "../config/database";
import { SolContribution, SolPackage, SOL_MONTHLY_AMOUNTS_CENTS } from "../models/Sol";
import { SolPaymentAttempt } from "../models/SolPaymentAttempt";
import { User } from "../models/User";
import { calculateSolWalletDebit } from "../services/solWalletDebit";
import { calculateSolPayout } from "../services/solPayout";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();
router.use(authenticate);

// Phase 2: draft-only. No payment, balance deduction, activation or payout endpoints.
router.get("/packages", async (req, res) => {
  try {
    const packages = await SolPackage.findAll({ where: { userId: currentUser(req).id }, order: [["createdAt", "DESC"]] });
    res.json(packages);
  } catch (error) {
    // Log a bounded, non-sensitive diagnostic; never log SQL, credentials, or user data.
    console.error("Sòl package list query failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return res.status(500).json({ message: "Unable to load Sòl packages" });
  }
});
router.get("/packages/:id", async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id as string)) return res.status(400).json({ message: "Invalid package ID" });
    const packageId = Number(req.params.id);
    if (!Number.isSafeInteger(packageId) || packageId < 1) return res.status(400).json({ message: "Invalid package ID" });
    const item = await SolPackage.findOne({ where: { id: packageId, userId: currentUser(req).id }, include: [{ model: SolContribution, as: "contributions" }] });
    if (!item) return res.status(404).json({ message: "Package not found" });
    return res.json(item);
  } catch { return res.status(500).json({ message: "Unable to load Sòl package" }); }
});
router.post("/packages", async (req, res) => {
  const { monthlyAmountCents, dueDay } = req.body ?? {};
  if (!SOL_MONTHLY_AMOUNTS_CENTS.some(v => v === monthlyAmountCents) || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
    return res.status(400).json({ message: "Choose an allowed package and a payment day from 1 to 28" });
  }
  try {
    const item = await sequelize.transaction(async transaction => {
      const draft = await SolPackage.create({ userId: currentUser(req).id, monthlyAmountCents, dueDay, status: "draft", paidMonths: 0 }, { transaction });
      await SolContribution.bulkCreate(Array.from({ length: 12 }, (_, index) => ({
        packageId: draft.id, installmentNumber: index + 1, amountCents: monthlyAmountCents, status: "pending",
      })), { transaction });
      return draft;
    });
    return res.status(201).json({ ...item.toJSON(), message: "Draft created; no payment taken" });
  } catch { return res.status(500).json({ message: "Unable to create Sòl draft" }); }
});

router.delete("/packages/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!/^\d+$/.test(req.params.id as string) || !Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ message: "Invalid package ID" });
  }
  try {
    const removed = await sequelize.transaction(async transaction => {
      const draft = await SolPackage.findOne({
        where: { id, userId: currentUser(req).id, status: "draft" },
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!draft) return false;
      // Only pristine drafts can be deleted. Never remove a package with payment activity.
      const installments = await SolContribution.findAll({ where: { packageId: id }, transaction, lock: transaction.LOCK.UPDATE });
      if (draft.paidMonths !== 0 || installments.length !== 12 || installments.some(i => i.status !== "pending" || i.paidAt || i.paymentReference)) return false;
      // Payment attempts are audit records with RESTRICT foreign keys.
      // Never delete an installment/package after an intent was recorded.
      const recordedAttempt = await SolPaymentAttempt.findOne({
        where: { packageId: id }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (recordedAttempt) return false;
      await SolContribution.destroy({ where: { packageId: id }, transaction });
      await draft.destroy({ transaction });
      return true;
    });
    if (!removed) return res.status(404).json({ message: "Draft not found or cannot be deleted" });
    return res.status(204).send();
  } catch { return res.status(500).json({ message: "Unable to delete Sòl draft" }); }
});

/**
 * Phase 3 payment preflight only. The server is authoritative for price and
 * installment selection. No checkout, wallet debit or payment capture occurs.
 */
router.get("/packages/:id/payment-preview", async (req, res) => {
  const rawId = req.params.id as string;
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(Number(rawId)) || Number(rawId) < 1) {
    return res.status(400).json({ message: "Invalid package ID" });
  }
  try {
    const item = await SolPackage.findOne({ where: { id: Number(rawId), userId: currentUser(req).id } });
    if (!item) return res.status(404).json({ message: "Package not found" });
    if (item.status !== "draft" && item.status !== "active") return res.status(409).json({ message: "Package is not eligible" });
    const installments = await SolContribution.findAll({ where: { packageId: item.id }, order: [["installmentNumber", "ASC"]] });
    const next = installments.find(i => i.status === "pending" && !i.paidAt && !i.paymentReference);
    if (!next || next.amountCents !== item.monthlyAmountCents) return res.status(409).json({ message: "No eligible installment" });
    return res.json({
      packageId: item.id,
      installmentNumber: next.installmentNumber,
      amountCents: next.amountCents,
      currency: "BRL",
      methods: ["wallet", "pix"],
      paymentEnabled: false,
      message: "Preview only: payment collection is not enabled",
    });
  } catch { return res.status(500).json({ message: "Unable to prepare payment preview" }); }
});

/**
 * Read-only transaction history. Payment attempts are never created or marked
 * successful by this route; the response excludes provider secrets and keys.
 */

/** Read-only wallet preview; no balance updates or payment confirmations. */
router.get("/packages/:id/wallet-preview", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "Invalid package ID" });
  try {
    const userId = currentUser(req).id;
    const item = await SolPackage.findOne({ where: { id, userId } });
    if (!item) return res.status(404).json({ message: "Package not found" });
    if (!["draft", "active"].includes(item.status)) return res.status(409).json({ message: "Package is not eligible" });
    const contributions = await SolContribution.findAll({ where: { packageId: id }, order: [["installmentNumber", "ASC"]] });
    const next = contributions.find(i => i.status === "pending" && !i.paidAt && !i.paymentReference);
    if (!next || next.amountCents !== item.monthlyAmountCents) return res.status(409).json({ message: "No eligible installment" });
    const wallet = await User.findByPk(userId);
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    const playPoints = Number(wallet.points);
    const withdrawablePoints = Number(wallet.withdrawablePoints);
    if (![playPoints, withdrawablePoints].every(n => Number.isSafeInteger(n) && n >= 0)) {
      return res.status(409).json({ message: "Wallet balance needs review" });
    }
    const proposedPoints = next.amountCents / 100;
    const fromPlay = Math.min(playPoints, proposedPoints);
    const fromWithdrawable = Math.min(withdrawablePoints, proposedPoints - fromPlay);
    return res.json({
      packageId: id, installmentNumber: next.installmentNumber,
      amountCents: next.amountCents, currency: "BRL",
      playPoints, withdrawablePoints, proposedPoints,
      proposedFromPlay: fromPlay, proposedFromWithdrawable: fromWithdrawable,
      sufficientUnderProposal: fromPlay + fromWithdrawable === proposedPoints,
      proposedConversion: "1 point = 1 BRL",
      paymentEnabled: process.env.SOL_WALLET_PAYMENTS_ENABLED === "true",
      message: "Simulation only; no payment processed",
    });
  } catch (err) {
    console.error("Wallet preview failed", err);
    return res.status(500).json({ message: "Unable to preview wallet" });
  }
});

/**
 * Read-only Sòl wallet receipts. Scoped to the authenticated package owner.
 * Exposes settled balance snapshots for audit without touching Loto payments.
 */
router.get("/packages/:id/wallet-receipts", async (req, res) => {
  const rawId = req.params.id as string;
  if (!/^[0-9]+$/.test(rawId) || !Number.isSafeInteger(Number(rawId)) || Number(rawId) < 1) {
    return res.status(400).json({ message: "Invalid package ID" });
  }
  try {
    const userId = currentUser(req).id;
    const item = await SolPackage.findOne({ where: { id: Number(rawId), userId } });
    if (!item) return res.status(404).json({ message: "Package not found" });
    const receipts = await sequelize.query<{
      attemptId: number; contributionId: number; installmentNumber: number;
      amountCents: number; pointsDebited: number; playDebited: number;
      withdrawDebited: number; playBefore: number; withdrawBefore: number;
      playAfter: number; withdrawAfter: number; createdAt: Date;
    }>(
      'SELECT l."attemptId", l."contributionId", c."installmentNumber", c."amountCents", l."pointsDebited", l."playDebited", l."withdrawDebited", l."playBefore", l."withdrawBefore", l."playAfter", l."withdrawAfter", l."createdAt" FROM "sol_wallet_ledger" l JOIN "sol_contributions" c ON c.id = l."contributionId" JOIN "sol_payment_attempts" a ON a.id = l."attemptId" WHERE l."packageId" = :packageId AND l."userId" = :userId AND a."userId" = :userId AND a.status = \'confirmed\' ORDER BY l."createdAt" DESC, l.id DESC LIMIT 100',
      { type: QueryTypes.SELECT, replacements: { packageId: item.id, userId } },
    );
    return res.json(receipts.map(receipt => ({
      ...receipt,
      balancesReconcile: receipt.pointsDebited === receipt.playDebited + receipt.withdrawDebited &&
        receipt.playBefore - receipt.playDebited === receipt.playAfter &&
        receipt.withdrawBefore - receipt.withdrawDebited === receipt.withdrawAfter &&
        receipt.amountCents === receipt.pointsDebited * 100,
    })));
  } catch (error) {
    console.error("Sòl wallet receipt lookup failed", error);
    return res.status(500).json({ message: "Unable to load Sòl wallet receipts" });
  }
});

router.get("/packages/:id/payment-attempts", async (req, res) => {
  const rawId = req.params.id as string;
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(Number(rawId)) || Number(rawId) < 1) {
    return res.status(400).json({ message: "Invalid package ID" });
  }
  try {
    const userId = currentUser(req).id;
    const item = await SolPackage.findOne({ where: { id: Number(rawId), userId } });
    if (!item) return res.status(404).json({ message: "Package not found" });
    const attempts = await SolPaymentAttempt.findAll({
      where: { packageId: item.id, userId },
      attributes: ["id", "contributionId", "amountCents", "currency", "method", "status", "confirmedAt", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    return res.json(attempts);
  } catch { return res.status(500).json({ message: "Unable to load payment history" }); }
});

/**
 * Create an idempotent payment INTENT only. Does not debit a wallet, call
 * InfinitePay, activate a package or confirm a contribution.
 * The request never supplies an amount: the locked installment is authoritative.
 */
router.post("/packages/:id/payment-intents", async (req, res) => {
  const rawId = req.params.id as string;
  const method = req.body?.method;
  const key = req.get("Idempotency-Key");
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(Number(rawId)) || Number(rawId) < 1) {
    return res.status(400).json({ message: "Invalid package ID" });
  }
  if (method !== "wallet" && method !== "pix") return res.status(400).json({ message: "Invalid payment method" });
  if (method === "pix" && process.env.SOL_PIX_CUSTOMER_ACCESS_ENABLED !== "true" && currentUser(req).isAdmin !== true) {
    return res.status(403).json({ message: "Sòl PIX is restricted to controlled testing" });
  }
  // Do not create an unpayable PIX intent that would block wallet payment
  // for this installment while checkout or settlement is disabled.
  if (method === "pix" && (process.env.SOL_PIX_CHECKOUT_ENABLED !== "true" || process.env.SOL_PIX_WEBHOOK_ENABLED !== "true")) {
    return res.status(503).json({ message: "Sòl PIX payments are not enabled" });
  }
  if (!key || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) return res.status(400).json({ message: "Invalid Idempotency-Key" });
  const userId = currentUser(req).id;
  try {
    const result = await sequelize.transaction(async transaction => {
      // Lock package to serialize concurrent requests for its next installment.
      const item = await SolPackage.findOne({ where: { id: Number(rawId), userId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!item) return { code: 404, message: "Package not found" };
      // Idempotency keys cannot be reused for different requests, even across packages.
      const existing = await SolPaymentAttempt.findOne({ where: { userId, idempotencyKey: key }, transaction });
      if (existing) {
        if (existing.packageId !== item.id || existing.method !== method) return { code: 409, message: "Idempotency key already used for a different request" };
        return { code: 200, attempt: existing };
      }
      if (item.status !== "draft" && item.status !== "active") return { code: 409, message: "Package is not eligible" };
      const contributions = await SolContribution.findAll({ where: { packageId: item.id }, order: [["installmentNumber", "ASC"]], transaction, lock: transaction.LOCK.UPDATE });
      const next = contributions.find(i => i.status === "pending" && !i.paidAt && !i.paymentReference);
      if (!next || next.amountCents !== item.monthlyAmountCents) return { code: 409, message: "No eligible installment" };
      // One unresolved intent per installment. A new key must not create a
      // second payable request while an earlier attempt is still open.
      const openAttempt = await SolPaymentAttempt.findOne({
        where: { contributionId: next.id, status: "created" },
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (openAttempt) return { code: 409, message: "An existing payment intent is pending for this installment" };
      const attempt = await SolPaymentAttempt.create({
        userId, packageId: item.id, contributionId: next.id,
        amountCents: next.amountCents, method, idempotencyKey: key,
        currency: "BRL", status: "created",
      }, { transaction });
      return { code: 201, attempt };
    });
    if (!result.attempt) return res.status(result.code).json({ message: result.message });
    return res.status(result.code).json({
      id: result.attempt.id, packageId: result.attempt.packageId,
      contributionId: result.attempt.contributionId, amountCents: result.attempt.amountCents,
      currency: result.attempt.currency, method: result.attempt.method,
      status: result.attempt.status, paymentEnabled: false,
      message: "Payment intent saved; no money moved",
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) return res.status(409).json({ message: "Duplicate payment request; retry using the original key" });
    return res.status(500).json({ message: "Unable to create payment intent" });
  }
});


/**
 * Real wallet settlement is feature-flagged OFF by default.
 * Requires migration for sol_wallet_ledger and independently verified tests.
 * Request must reference an existing idempotent wallet intent; never trust
 * client-provided amounts, balance values, installment numbers or user IDs.
 */
router.post("/packages/:id/wallet-payments", async (req, res) => {
  if (process.env.SOL_WALLET_PAYMENTS_ENABLED !== "true") {
    return res.status(503).json({ message: "Sòl wallet payments are not enabled" });
  }
  const rawId = req.params.id as string;
  const key = req.get("Idempotency-Key");
  if (!/^[0-9]+$/.test(rawId) || !Number.isSafeInteger(Number(rawId)) || Number(rawId) < 1) {
    return res.status(400).json({ message: "Invalid package ID" });
  }
  if (!key || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) {
    return res.status(400).json({ message: "Invalid Idempotency-Key" });
  }
  const userId = currentUser(req).id;
  try {
    const result = await sequelize.transaction(async transaction => {
      const item = await SolPackage.findOne({
        where: { id: Number(rawId), userId }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!item) return { code: 404, message: "Package not found" };
      const attempt = await SolPaymentAttempt.findOne({
        where: { userId, idempotencyKey: key }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!attempt || attempt.packageId !== item.id || attempt.method !== "wallet") {
        return { code: 404, message: "Matching wallet payment intent not found" };
      }
      if (attempt.status === "confirmed") {
        // Never acknowledge a retry as paid if the immutable debit record is
        // missing or does not reconcile with the confirmed contribution.
        const ledger = await sequelize.query<{
          pointsDebited: number; playDebited: number; withdrawDebited: number;
          playBefore: number; withdrawBefore: number; playAfter: number; withdrawAfter: number;
        }>(
          'SELECT "pointsDebited", "playDebited", "withdrawDebited", "playBefore", "withdrawBefore", "playAfter", "withdrawAfter" FROM "sol_wallet_ledger" WHERE "attemptId" = :attemptId AND "userId" = :userId AND "packageId" = :packageId AND "contributionId" = :contributionId',
          { transaction, type: QueryTypes.SELECT, replacements: {
            attemptId: attempt.id, userId, packageId: item.id, contributionId: attempt.contributionId,
          } },
        );
        const record = ledger[0];
        const contribution = await SolContribution.findByPk(attempt.contributionId, { transaction });
        if (!record || ledger.length !== 1 || !contribution ||
            contribution.status !== "paid" || contribution.paymentReference !== attempt.providerReference ||
            attempt.amountCents !== record.pointsDebited * 100 ||
            record.pointsDebited !== record.playDebited + record.withdrawDebited ||
            record.playBefore - record.playDebited !== record.playAfter ||
            record.withdrawBefore - record.withdrawDebited !== record.withdrawAfter) {
          return { code: 409, message: "Sòl payment record requires reconciliation" };
        }
        return { code: 200, receipt: {
          attemptId: attempt.id, contributionId: attempt.contributionId, amountCents: attempt.amountCents,
          pointsDebited: record.pointsDebited, playDebited: record.playDebited, withdrawDebited: record.withdrawDebited,
          playBalance: record.playAfter, withdrawBalance: record.withdrawAfter,
          status: "confirmed", alreadyProcessed: true,
        } };
      }
      if (attempt.status !== "created") return { code: 409, message: "Payment intent cannot be processed" };
      if (item.status !== "draft" && item.status !== "active") return { code: 409, message: "Package not eligible" };
      const installments = await SolContribution.findAll({
        where: { packageId: item.id }, order: [["installmentNumber", "ASC"]],
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (installments.length !== 12) return { code: 409, message: "Invalid installment schedule" };
      const next = installments.find(i => i.status === "pending" && !i.paidAt && !i.paymentReference);
      if (!next || next.id !== attempt.contributionId || next.amountCents !== item.monthlyAmountCents ||
          attempt.amountCents !== next.amountCents || attempt.currency !== "BRL" ||
          !Number.isSafeInteger(next.amountCents) || next.amountCents % 100 !== 0) {
        return { code: 409, message: "Payment intent does not match the next installment" };
      }
      const wallet = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!wallet) return { code: 404, message: "Wallet not found" };
      const playBefore = Number(wallet.points);
      const withdrawBefore = Number(wallet.withdrawablePoints);
      if (![playBefore, withdrawBefore].every(n => Number.isSafeInteger(n) && n >= 0)) {
        return { code: 409, message: "Wallet requires reconciliation" };
      }
      const debit = calculateSolWalletDebit(playBefore, withdrawBefore, next.amountCents);
      if (!debit) return { code: 409, message: "Insufficient balance" };
      const { pointsDebited: requiredPoints, playDebited: fromPlay, withdrawDebited: fromWithdraw, playAfter, withdrawAfter } = debit;
      // User row lock serializes debits; all changes and ledger commit atomically.
      wallet.points = playAfter;
      wallet.withdrawablePoints = withdrawAfter;
      await wallet.save({ transaction });
      const reference = "sol-wallet-" + attempt.id;
      next.status = "paid";
      next.paidAt = new Date();
      next.paymentReference = reference;
      await next.save({ transaction });
      const paidMonths = installments.filter(i => i.status === "paid").length;
      item.paidMonths = paidMonths;
      item.status = paidMonths === 12 ? "completed" : "active";
      await item.save({ transaction });
      attempt.status = "confirmed";
      attempt.providerReference = reference;
      attempt.confirmedAt = next.paidAt;
      await attempt.save({ transaction });
      await sequelize.query(
        'INSERT INTO sol_wallet_ledger ("userId", "packageId", "contributionId", "attemptId", "pointsDebited", "playDebited", "withdrawDebited", "playBefore", "withdrawBefore", "playAfter", "withdrawAfter", "createdAt") VALUES (:userId, :packageId, :contributionId, :attemptId, :pointsDebited, :playDebited, :withdrawDebited, :playBefore, :withdrawBefore, :playAfter, :withdrawAfter, NOW())',
        { transaction, type: QueryTypes.INSERT, replacements: {
          userId, packageId: item.id, contributionId: next.id, attemptId: attempt.id,
          pointsDebited: requiredPoints, playDebited: fromPlay, withdrawDebited: fromWithdraw,
          playBefore, withdrawBefore, playAfter, withdrawAfter,
        } },
      );
      return { code: 200, receipt: {
        attemptId: attempt.id, contributionId: next.id, amountCents: next.amountCents,
        pointsDebited: requiredPoints, playDebited: fromPlay, withdrawDebited: fromWithdraw,
        playBalance: playAfter, withdrawBalance: withdrawAfter, paidMonths, status: "confirmed",
        alreadyProcessed: false,
      } };
    });
    if (!result.receipt) return res.status(result.code).json({ message: result.message });
    return res.status(result.code).json(result.receipt);
  } catch (error) {
    console.error("Sòl wallet settlement failed", error);
    return res.status(500).json({ message: "Wallet payment could not be completed" });
  }
});


/**
 * One-time Sòl settlement into the existing Bolet withdrawable balance.
 * Users then submit their PIX key through Bolet's existing Retire Pwen form.
 * No automatic PIX transfer is initiated here.
 */
router.post("/packages/:id/request-withdrawal", async (req,res) => {
 if(process.env.SOL_WITHDRAWALS_ENABLED!=="true")return res.status(503).json({message:"Sòl withdrawals are not yet enabled"});
 const raw=req.params.id as string,id=Number(raw),userId=currentUser(req).id;
 if(!/^[0-9]+$/.test(raw)||!Number.isSafeInteger(id)||id<1)return res.status(400).json({message:"Invalid package"});
 try {
  const outcome=await sequelize.transaction(async transaction=>{
   const pkg=await SolPackage.findOne({where:{id,userId},transaction,lock:transaction.LOCK.UPDATE});
   if(!pkg)return {code:404,message:"Package not found"};
   if(!["active","completed"].includes(pkg.status))return {code:409,message:"Package is not eligible"};
   const contributions=await SolContribution.findAll({where:{packageId:id},transaction,lock:transaction.LOCK.UPDATE});
   if(contributions.length!==12||contributions.some(c=>c.amountCents!==pkg.monthlyAmountCents))return {code:409,message:"Installments need review"};
   const paid=contributions.filter(c=>c.status==="paid"&&Boolean(c.paidAt));
   if(!paid.length||paid.length!==pkg.paidMonths||(pkg.status==="completed")!==(paid.length===12))return {code:409,message:"Payments need review"};
   const unsettled=await SolPaymentAttempt.findOne({where:{packageId:id,method:"pix",status:["created","pending","processing"]},transaction});
   if(unsettled)return {code:409,message:"PIX payments pending reconciliation"};
   const previous=await sequelize.query<{id:number}>('SELECT id FROM sol_withdrawal_requests WHERE "packageId"=:id LIMIT 1',{replacements:{id},type:QueryTypes.SELECT,transaction});
   if(previous.length)return {code:409,message:"Withdrawal already requested"};
   const {grossCents,penaltyCents,netCents}=calculateSolPayout(pkg.monthlyAmountCents,paid.length);
   const [record]=await sequelize.query<{id:number}>('INSERT INTO sol_withdrawal_requests ("packageId","userId","grossCents","penaltyCents","netCents","status","createdAt") VALUES (:id,:userId,:grossCents,:penaltyCents,:netCents,\'pending\',NOW()) RETURNING id',{replacements:{id,userId,grossCents,penaltyCents,netCents},type:QueryTypes.SELECT,transaction});
   pkg.status="withdrawal_pending";await pkg.save({transaction});
   return {code:201,id:record.id,netCents,status:"pending"};
  });
  return res.status(outcome.code).json(outcome);
 }catch(error){console.error("Sòl withdrawal request failed",error instanceof Error?error.name:"UnknownError");return res.status(500).json({message:"Cannot request Sòl withdrawal"});}
});
router.get("/withdrawals/mine",async(req,res)=>{
 try{
  const rows=await sequelize.query('SELECT id,"packageId","netCents",status,"createdAt","paidAt" FROM sol_withdrawal_requests WHERE "userId"=:userId AND "archivedAt" IS NULL ORDER BY id DESC LIMIT 100',{replacements:{userId:currentUser(req).id},type:QueryTypes.SELECT});
  return res.json(rows);
 }catch{return res.status(500).json({message:"Cannot load Sòl withdrawals"});}
});
router.get("/admin/withdrawals",adminOnly,async(_req,res)=>{
 try{
  const rows=await sequelize.query('SELECT r.id,r."packageId",r."userId",r."grossCents",r."penaltyCents",r."netCents",r.status,r."createdAt",u."fullName",u.phone FROM sol_withdrawal_requests r JOIN users u ON u.id=r."userId" WHERE r."archivedAt" IS NULL ORDER BY r.id DESC LIMIT 300',{type:QueryTypes.SELECT});
  return res.json(rows);
 }catch{return res.status(500).json({message:"Cannot load Sòl withdrawals"});}
});
router.patch("/admin/withdrawals/:id/paid",adminOnly,async(req,res)=>{
 const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({message:"Invalid withdrawal"});
 try{
  const outcome=await sequelize.transaction(async transaction=>{
   const rows=await sequelize.query<{packageId:number}>(`WITH updated AS (
     UPDATE sol_withdrawal_requests SET status='paid',"paidAt"=NOW()
     WHERE id=:id AND status='pending' AND "archivedAt" IS NULL
     RETURNING "packageId"
   ) SELECT "packageId" FROM updated`,{replacements:{id},type:QueryTypes.SELECT,transaction});
   if(rows.length!==1)return false;
   const pkg=await SolPackage.findByPk(rows[0].packageId,{transaction,lock:transaction.LOCK.UPDATE});
   if(!pkg||pkg.status!=="withdrawal_pending")throw new Error("CONTRACT_NOT_PENDING");
   pkg.status="paid_out";await pkg.save({transaction});
   return true;
  });
  if(!outcome)return res.status(409).json({message:"Request is not pending"});
  return res.json({status:"paid"});
 }catch{return res.status(500).json({message:"Cannot mark Sòl withdrawal paid"});}
});
router.delete("/admin/withdrawals/:id",adminOnly,async(req,res)=>{
 const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({message:"Invalid withdrawal"});
 try{
  const rows=await sequelize.query<{id:number}>(`WITH archived AS (
    UPDATE sol_withdrawal_requests SET "archivedAt"=NOW()
    WHERE id=:id AND status='paid' AND "archivedAt" IS NULL RETURNING id
  ) SELECT id FROM archived`,{replacements:{id},type:QueryTypes.SELECT});
  if(rows.length!==1)return res.status(409).json({message:"Only paid requests may be archived"});
  return res.status(204).send();
 }catch{return res.status(500).json({message:"Cannot archive Sòl withdrawal"});}
});

export default router;
