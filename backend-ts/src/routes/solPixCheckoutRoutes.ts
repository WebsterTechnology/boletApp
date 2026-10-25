import axios from "axios";
import { Router } from "express";
import { authenticate, currentUser } from "../middleware/authenticate";
import { sequelize } from "../config/database";
import { env } from "../config/env";
import { SolPackage, SolContribution } from "../models/Sol";
import { SolPaymentAttempt } from "../models/SolPaymentAttempt";
import { buildSolPixCheckoutPayload, parseSolPixCheckoutUrl, solPixOrderNsu } from "../services/solPixCheckout";

const router = Router();
router.use(authenticate);

/**
 * Sòl-specific PIX checkout initiation. OFF by default.
 * Requires an existing Sòl PIX intent, never accepts client-supplied prices,
 * and never uses the Loto credit endpoint.
 *
 * Do not enable SOL_PIX_CHECKOUT_ENABLED until the separate verified Sòl
 * webhook settlement is deployed and end-to-end tested.
 */
router.post("/packages/:id/pix-checkout", async (req, res) => {
  if (process.env.SOL_PIX_CHECKOUT_ENABLED !== "true") {
    return res.status(503).json({ message: "Sòl PIX checkout is not enabled" });
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
    // Reserve the provider order before requesting checkout so any fast webhook
    // can correlate its order_nsu to a persisted attempt.
    const reserved = await sequelize.transaction(async transaction => {
      const item = await SolPackage.findOne({
        where: { id: Number(rawId), userId }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!item) return { code: 404, message: "Package not found" } as const;
      if (item.status !== "draft" && item.status !== "active") {
        return { code: 409, message: "Package is not eligible" } as const;
      }
      const attempt = await SolPaymentAttempt.findOne({
        where: { userId, packageId: item.id, idempotencyKey: key, method: "pix" },
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!attempt || attempt.status !== "created" || attempt.currency !== "BRL") {
        return { code: 409, message: "Valid pending Sòl PIX intent required" } as const;
      }
      const contributions = await SolContribution.findAll({
        where: { packageId: item.id }, order: [["installmentNumber", "ASC"]],
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (contributions.length !== 12) return { code: 409, message: "Invalid installment schedule" } as const;
      const next = contributions.find(i => i.status === "pending" && !i.paidAt && !i.paymentReference);
      if (!next || next.id !== attempt.contributionId ||
          next.installmentNumber !== item.paidMonths + 1 ||
          next.amountCents !== item.monthlyAmountCents ||
          next.amountCents !== attempt.amountCents) {
        return { code: 409, message: "Sòl installment does not match payment intent" } as const;
      }
      const orderNsu = solPixOrderNsu(attempt.id);
      // Avoid creating duplicate checkout links on repeated calls. The caller
      // must not initiate a second payment while this order remains open.
      if (attempt.providerReference) {
        return { code: 409, message: "PIX checkout already requested; contact support if the link was lost" } as const;
      }
      const payload = buildSolPixCheckoutPayload(attempt, {
        handle: env.infinitepayHandle,
        redirectUrl: process.env.SOL_PIX_REDIRECT_URL || "",
        webhookUrl: process.env.SOL_PIX_WEBHOOK_URL || "",
      });
      attempt.providerReference = orderNsu;
      await attempt.save({ transaction });
      return { code: 200, payload } as const;
    });
    if (!reserved.payload) return res.status(reserved.code).json({ message: reserved.message });
    const payload = reserved.payload;
    // Never hold database locks across an external network call.
    const { data } = await axios.post("https://api.checkout.infinitepay.io/links", payload, {
      timeout: 10000,
      headers: { "Content-Type": "application/json" },
    });
    const checkoutUrl = parseSolPixCheckoutUrl(
      data?.url || data?.checkout_url || data?.checkoutUrl || data?.link || data?.payment_url,
    );
    return res.json({ checkoutUrl, orderNsu: payload.order_nsu, status: "pending" });
  } catch (error) {
    console.error("Sòl PIX checkout initiation failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    // A reserved intent must not be automatically released: provider creation
    // might have succeeded even if the response was lost.
    return res.status(502).json({ message: "Unable to start Sòl PIX checkout; contact support before retrying" });
  }
});

export default router;
