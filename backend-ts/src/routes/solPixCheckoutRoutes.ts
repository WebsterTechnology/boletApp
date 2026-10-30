import axios from "axios";
import { Router } from "express";
import { QueryTypes } from "sequelize";
import { authenticate, currentUser } from "../middleware/authenticate";
import { sequelize } from "../config/database";
import { env } from "../config/env";
import { SolPackage, SolContribution } from "../models/Sol";
import { SolPaymentAttempt } from "../models/SolPaymentAttempt";
import { buildSolPixCheckoutPayload, parseSolPixCheckoutUrl, solPixOrderNsu } from "../services/solPixCheckout";

const router = Router();
router.use(authenticate);

// All real Sòl PIX checkout remains admin-only until controlled testing ends.
const solPixCustomerAllowed = (isAdmin: boolean): boolean =>
  process.env.SOL_PIX_CUSTOMER_ACCESS_ENABLED === "true" || isAdmin;


/**
 * Safe read-only availability for the Sòl checkout button.
 * This is an operational UI signal, NOT proof of database readiness;
 * the checkout and verified webhook retain their independent safeguards.
 */
router.get("/pix-availability", async (req, res) => {
  if (!solPixCustomerAllowed(currentUser(req).isAdmin === true)) return res.json({ enabled: false });
  res.setHeader("Cache-Control", "no-store");
  let configured = false;
  try {
    const webhookUrl = new URL(process.env.SOL_PIX_WEBHOOK_URL || "");
    const redirectUrl = new URL(process.env.SOL_PIX_REDIRECT_URL || "");
    configured = webhookUrl.protocol === "https:" &&
      webhookUrl.pathname === "/api/sol-pix/webhook" &&
      !webhookUrl.search && !webhookUrl.hash &&
      !webhookUrl.username && !webhookUrl.password &&
      redirectUrl.protocol === "https:" &&
      !redirectUrl.username && !redirectUrl.password &&
      Boolean(env.infinitepayHandle?.trim());
  } catch {
    configured = false;
  }
  if (process.env.SOL_PIX_CHECKOUT_ENABLED !== "true" ||
      process.env.SOL_PIX_WEBHOOK_ENABLED !== "true" || !configured) {
    return res.json({ enabled: false });
  }
  try {
    // Query the *actual* PostgreSQL database configured in DATABASE_URL (Render
    // in production). Do not infer readiness from successful Railway deploys.
    const result = await sequelize.query<{ ready: boolean }>(
      `SELECT (
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = current_schema()
             AND table_name = 'sol_payment_attempts'
             AND column_name = 'checkoutUrl'
         )
         AND EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = current_schema()
             AND table_name = 'SequelizeMeta'
         )
       ) AS "ready"`,
      { type: QueryTypes.SELECT },
    );
    // A missing migration record must also block checkout visibility.
    if (result[0]?.ready !== true) return res.json({ enabled: false });
    const rows = await sequelize.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM "SequelizeMeta"
         WHERE name = '20261025060000-sol-pix-checkout-recovery.js'
       ) AS "exists"`,
      { type: QueryTypes.SELECT },
    );
    return res.json({ enabled: rows[0]?.exists === true });
  } catch {
    // Fail closed on database errors or mismatched schema.
    return res.json({ enabled: false });
  }
});

/** A read-only admin check, independent of the Sòl payment feature flags. */
router.get("/pix-readiness", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!currentUser(req).isAdmin) return res.sendStatus(403);
  let urlsConfigured = false;
  try {
    const webhook = new URL(process.env.SOL_PIX_WEBHOOK_URL || "");
    const redirect = new URL(process.env.SOL_PIX_REDIRECT_URL || "");
    urlsConfigured = webhook.protocol === "https:" &&
      webhook.pathname === "/api/sol-pix/webhook" &&
      !webhook.search && !webhook.hash &&
      !webhook.username && !webhook.password &&
      redirect.protocol === "https:" &&
      !redirect.username && !redirect.password &&
      Boolean(env.infinitepayHandle?.trim());
  } catch { /* Missing or invalid URLs remain unavailable. */ }
  const pixConfig = {
    urlsConfigured,
    checkoutEnabled: process.env.SOL_PIX_CHECKOUT_ENABLED === "true",
    webhookEnabled: process.env.SOL_PIX_WEBHOOK_ENABLED === "true",
  };
  let columnExists = false;
  let migrationRecorded = false;
  try {
    const columns = await sequelize.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'sol_payment_attempts' AND column_name = 'checkoutUrl') AS "exists"`,
      { type: QueryTypes.SELECT },
    );
    columnExists = columns[0]?.exists === true;
    const migration = await sequelize.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM "SequelizeMeta" WHERE name = '20261025060000-sol-pix-checkout-recovery.js') AS "exists"`,
      { type: QueryTypes.SELECT },
    );
    migrationRecorded = migration[0]?.exists === true;
  } catch {
    return res.json({ databaseReady: false, columnExists, migrationRecorded, ...pixConfig });
  }
  return res.json({ databaseReady: columnExists && migrationRecorded, columnExists, migrationRecorded, ...pixConfig });
});

/**
 * Sòl-specific PIX checkout initiation. OFF by default.
 * Requires an existing Sòl PIX intent, never accepts client-supplied prices,
 * and never uses the Loto credit endpoint.
 *
 * Do not enable SOL_PIX_CHECKOUT_ENABLED until the separate verified Sòl
 * webhook settlement is deployed and end-to-end tested.
 */
router.post("/packages/:id/pix-checkout", async (req, res) => {
  if (!solPixCustomerAllowed(currentUser(req).isAdmin === true)) {
    return res.status(403).json({ message: "Sòl PIX is currently restricted to controlled testing" });
  }
  // Never issue a payable link unless the settlement receiver is enabled too.
  if (process.env.SOL_PIX_CHECKOUT_ENABLED !== "true" || process.env.SOL_PIX_WEBHOOK_ENABLED !== "true") {
    return res.status(503).json({ message: "Sòl PIX checkout is not enabled" });
  }
  // Enforce the Render database migration server-side as well as in the UI.
  // A direct API caller must never initiate a payable Sòl order without the
  // checkout recovery column and migration record.
  try {
    const columns = await sequelize.query<{ ready: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'sol_payment_attempts'
           AND column_name = 'checkoutUrl'
       ) AS "ready"`,
      { type: QueryTypes.SELECT },
    );
    if (columns[0]?.ready !== true) {
      return res.status(503).json({ message: "Sòl PIX database migration is not ready" });
    }
    const migration = await sequelize.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM "SequelizeMeta"
         WHERE name = '20261025060000-sol-pix-checkout-recovery.js'
       ) AS "exists"`,
      { type: QueryTypes.SELECT },
    );
    if (migration[0]?.exists !== true) {
      return res.status(503).json({ message: "Sòl PIX migration is not recorded" });
    }
  } catch {
    return res.status(503).json({ message: "Sòl PIX database readiness could not be verified" });
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
        if (attempt.providerReference === orderNsu && attempt.checkoutUrl) {
          return { code: 200, existingUrl: parseSolPixCheckoutUrl(attempt.checkoutUrl), orderNsu } as const;
        }
        return { code: 409, message: "PIX checkout is pending; contact support to reconcile an unavailable link" } as const;
      }
      const webhookUrl = process.env.SOL_PIX_WEBHOOK_URL || "";
      // A misconfigured callback would collect money without settling Sòl.
      const callback = new URL(webhookUrl);
      if (callback.pathname !== "/api/sol-pix/webhook" || callback.search || callback.hash) {
        throw new Error("Sòl PIX webhook must target /api/sol-pix/webhook");
      }
      const payload = buildSolPixCheckoutPayload(attempt, {
        handle: env.infinitepayHandle,
        redirectUrl: process.env.SOL_PIX_REDIRECT_URL || "",
        webhookUrl,
      });
      attempt.providerReference = orderNsu;
      await attempt.save({ transaction });
      return { code: 200, payload } as const;
    });
    if ("existingUrl" in reserved && reserved.existingUrl) {
      return res.json({ checkoutUrl: reserved.existingUrl, orderNsu: reserved.orderNsu, status: "pending" });
    }
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
    // Store the validated URL only if the same unpaid PIX attempt remains open.
    // A concurrent webhook may have already confirmed this installment.
    const stillPending = await sequelize.transaction(async transaction => {
      const attempt = await SolPaymentAttempt.findOne({
        where: { providerReference: payload.order_nsu, userId, packageId: Number(rawId), status: "created", method: "pix" },
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!attempt) return false;
      attempt.checkoutUrl = checkoutUrl;
      await attempt.save({ transaction });
      return true;
    });
    // A fast verified webhook may have already settled the installment while
    // InfinitePay was creating the link. Never invite another payment then.
    if (!stillPending) {
      return res.status(409).json({ message: "Sòl PIX order changed during checkout; refresh payment status" });
    }
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
