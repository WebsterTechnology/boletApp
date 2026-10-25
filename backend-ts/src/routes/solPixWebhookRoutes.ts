import axios from "axios";
import { Router } from "express";
import { sequelize } from "../config/database";
import { env } from "../config/env";
import { SolPackage, SolContribution } from "../models/Sol";
import { SolPaymentAttempt } from "../models/SolPaymentAttempt";
import { canSettleSolPixInstallment } from "../services/solPixSettlementGuard";

const router = Router();

/**
 * Dedicated unauthenticated InfinitePay callback for Sòl only.
 * Authentication is via a server-to-server payment_check, not callback claims.
 * NEVER credits Loto points or touches wallet balances.
 */
router.post("/webhook", async (req, res) => {
  if (process.env.SOL_PIX_WEBHOOK_ENABLED !== "true") {
    return res.status(503).json({ success: false, message: "Sòl PIX settlement disabled" });
  }
  const { order_nsu: orderNsu, transaction_nsu: transactionNsu, invoice_slug: invoiceSlug } = req.body ?? {};
  if (typeof orderNsu !== "string" || orderNsu.length > 40 || !/^sol-pix-[1-9][0-9]*$/.test(orderNsu) ||
      typeof transactionNsu !== "string" || !transactionNsu || transactionNsu.length > 255 ||
      typeof invoiceSlug !== "string" || !invoiceSlug || invoiceSlug.length > 255) {
    return res.status(400).json({ success: false, message: "Invalid Sòl payment callback" });
  }
  const attemptId = Number(orderNsu.slice("sol-pix-".length));
  if (!Number.isSafeInteger(attemptId)) return res.status(400).json({ success: false, message: "Invalid payment reference" });

  try {
    // Verify independently with InfinitePay before touching a database row.
    const { data: verification } = await axios.post(
      "https://api.checkout.infinitepay.io/payment_check",
      { handle: env.infinitepayHandle, order_nsu: orderNsu, transaction_nsu: transactionNsu, slug: invoiceSlug },
      { headers: { "Content-Type": "application/json" }, timeout: 5000 },
    );
    if (verification?.success !== true || verification?.paid !== true) {
      return res.status(400).json({ success: false, message: "Payment not verified" });
    }

    const result = await sequelize.transaction(async transaction => {
      // Lock package first: same lock order as Sòl wallet settlement.
      const lookup = await SolPaymentAttempt.findByPk(attemptId, { transaction });
      if (!lookup || lookup.method !== "pix" || lookup.providerReference !== orderNsu) {
        return { code: 404, message: "Unknown Sòl PIX order" };
      }
      const item = await SolPackage.findOne({
        where: { id: lookup.packageId, userId: lookup.userId },
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!item) return { code: 404, message: "Package not found" };
      const attempt = await SolPaymentAttempt.findByPk(attemptId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!attempt || attempt.packageId !== item.id || attempt.userId !== item.userId) {
        return { code: 409, message: "Payment ownership mismatch" };
      }
      const installments = await SolContribution.findAll({
        where: { packageId: item.id }, order: [["installmentNumber", "ASC"]],
        transaction, lock: transaction.LOCK.UPDATE,
      });
      const contribution = installments.find(i => i.id === attempt.contributionId);
      if (!contribution || installments.length !== 12) {
        return { code: 409, message: "Installment schedule mismatch" };
      }
      // Retry after a completed transaction is idempotent, but only when all
      // stored references still reconcile with the verified provider amount.
      if (attempt.status === "confirmed") {
        if (attempt.method === "pix" && attempt.providerReference === orderNsu &&
            contribution.status === "paid" && contribution.paymentReference === orderNsu &&
            contribution.paidAt && attempt.confirmedAt &&
            verification.amount === attempt.amountCents &&
            contribution.amountCents === attempt.amountCents) {
          return { code: 200, alreadyProcessed: true };
        }
        return { code: 409, message: "Confirmed Sòl payment requires reconciliation" };
      }
      if (!canSettleSolPixInstallment({
        packageId: item.id,
        contributionId: contribution.id,
        packageStatus: item.status,
        paidMonths: item.paidMonths,
        installmentNumber: contribution.installmentNumber,
        installmentAmountCents: contribution.amountCents,
        contributionStatus: contribution.status,
        contributionPaidAt: contribution.paidAt ?? null,
        contributionPaymentReference: contribution.paymentReference ?? null,
        attemptId: attempt.id,
        attemptPackageId: attempt.packageId,
        attemptContributionId: attempt.contributionId,
        attemptAmountCents: attempt.amountCents,
        attemptCurrency: attempt.currency,
        attemptMethod: attempt.method,
        attemptStatus: attempt.status,
        attemptProviderReference: attempt.providerReference ?? null,
        providerOrderNsu: orderNsu,
      }, verification)) {
        return { code: 409, message: "Sòl PIX payment requires reconciliation" };
      }
      const paidAt = new Date();
      contribution.status = "paid";
      contribution.paidAt = paidAt;
      contribution.paymentReference = orderNsu;
      await contribution.save({ transaction });
      const paidMonths = installments.filter(i => i.status === "paid").length;
      item.paidMonths = paidMonths;
      item.status = paidMonths === 12 ? "completed" : "active";
      await item.save({ transaction });
      attempt.status = "confirmed";
      attempt.confirmedAt = paidAt;
      await attempt.save({ transaction });
      return { code: 200, alreadyProcessed: false };
    });
    if (result.code !== 200) return res.status(result.code).json({ success: false, message: result.message });
    return res.json({ success: true, alreadyProcessed: result.alreadyProcessed });
  } catch (error) {
    console.error("Sòl PIX webhook failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return res.status(500).json({ success: false, message: "Payment confirmation unavailable; retry later" });
  }
});

export default router;
