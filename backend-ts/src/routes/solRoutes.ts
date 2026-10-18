import { Router } from "express";
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
export default router;
