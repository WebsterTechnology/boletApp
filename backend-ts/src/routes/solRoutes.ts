import { Router } from "express";
import { authenticate, currentUser } from "../middleware/authenticate";
import { sequelize } from "../config/database";
import { SolContribution, SolPackage, SOL_MONTHLY_AMOUNTS_CENTS } from "../models/Sol";

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
export default router;
