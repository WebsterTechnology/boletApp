import { Router } from "express";
import { UniqueConstraintError } from "sequelize";
import { authenticate, currentUser } from "../middleware/authenticate";
import { sequelize } from "../config/database";
import { SolContribution, SolPackage, SOL_MONTHLY_AMOUNTS_CENTS } from "../models/Sol";
import { SolPaymentAttempt } from "../models/SolPaymentAttempt";

const router = Router();
router.use(authenticate);

// Phase 2: draft-only. No payment, balance deduction, activation or payout endpoints.
router.get("/packages", async (req, res) => {
  try {
    const packages = await SolPackage.findAll({ where: { userId: currentUser(req).id }, order: [["createdAt", "DESC"]] });
    res.json(packages);
  } catch { res.status(500).json({ message: "Unable to load Sòl packages" }); }
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

export default router;
