import axios from "axios";
import type { Request, Response } from "express";
import { env } from "../config/env";
import { currentUser } from "../middleware/authenticate";
import { PixPayment, PixPaymentRequest, sequelize, User } from "../models";
import { errorMessage, providerErrorData } from "../utils/errors";

const INFINITEPAY_LINKS_URL = "https://api.checkout.infinitepay.io/links";
const INFINITEPAY_CHECK_URL = "https://api.checkout.infinitepay.io/payment_check";
const REDIRECT_URL = "https://ht-lotodigital.com/";
const WEBHOOK_URL = "https://boletapp-production.up.railway.app/api/infinitepay/webhook";

interface LinkPayload {
  handle: string;
  items: { quantity: number; price: number; description: string }[];
  order_nsu: string;
  redirect_url: string;
  webhook_url: string;
  customer?: { name: string; email: string; phone_number: string };
}

interface PaymentCheckResponse {
  success?: boolean;
  paid?: boolean;
  /** Cents. */
  amount?: number;
  /** Cents. */
  paid_amount?: number;
}

export async function test(_req: Request, res: Response) {
  return res.json({ success: true, message: "InfinitePay controller is working!" });
}

export async function createPayment(req: Request, res: Response) {
  try {
    const userId = currentUser(req).id;
    const { amountBRL, description, name, email, phone } = req.body ?? {};

    const amount = Number(amountBRL);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "amountBRL must be > 0" });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const orderNsu = `${user.id}-${Date.now()}`;

    const payload: LinkPayload = {
      handle: env.infinitepayHandle,
      items: [
        { quantity: 1, price: Math.round(amount * 100), description: description || "Credits" },
      ],
      order_nsu: orderNsu,
      redirect_url: REDIRECT_URL,
      webhook_url: WEBHOOK_URL,
    };

    if (name || email || phone || user.phone) {
      payload.customer = {
        name: name || `User ${user.id}`,
        email: email || `user${user.id}@example.com`,
        phone_number: phone || user.phone || "",
      };
    }

    const { data } = await axios.post(INFINITEPAY_LINKS_URL, payload);

    const checkoutUrl: string | null =
      data.url || data.checkout_url || data.checkoutUrl || data.link || data.payment_url || null;

    if (!checkoutUrl) {
      return res.status(500).json({
        error: "InfinitePay did not return checkout URL",
        providerResponse: data,
      });
    }

    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 0, 0);

    const local = await PixPayment.create({
      userId: user.id,
      providerRef: orderNsu,
      amountBRL: amount,
      points: Math.floor(amount),
      status: "pending",
      expiresAt,
      rawPayload: { provider: "infinitepay", request: payload, response: data, checkoutUrl },
    });

    await PixPaymentRequest.create({
      userId: user.id,
      phoneNumber: user.phone || phone || "",
      amount,
      isPaid: false,
    });

    return res.status(200).json({
      success: true,
      paymentId: local.id,
      providerPaymentId: orderNsu,
      checkoutUrl,
      url: checkoutUrl,
      status: "pending",
      userId: user.id,
    });
  } catch (err) {
    console.error("🔥 INFINITEPAY CREATE PAYMENT ERROR:", providerErrorData(err));
    return res.status(500).json({ error: providerErrorData(err) });
  }
}

/** Sent from inside the transaction to leave it and answer the webhook. */
class WebhookReject extends Error {}

export async function webhook(req: Request, res: Response) {
  const body = req.body || {};
  const orderNsu: string | undefined = body.order_nsu;
  const transactionNsu: string | undefined = body.transaction_nsu;
  const invoiceSlug: string | undefined = body.invoice_slug;

  if (!orderNsu || !transactionNsu || !invoiceSlug) {
    console.warn("❌ InfinitePay webhook missing verification fields");
    return res.status(400).json({ success: false, message: "Missing payment verification fields" });
  }

  try {
    // Never trust the webhook body alone for a balance-changing operation.
    // Confirm the transaction directly with InfinitePay before crediting points.
    const { data: verification } = await axios.post<PaymentCheckResponse>(
      INFINITEPAY_CHECK_URL,
      {
        handle: env.infinitepayHandle,
        order_nsu: orderNsu,
        transaction_nsu: transactionNsu,
        slug: invoiceSlug,
      },
      { headers: { "Content-Type": "application/json" }, timeout: 5000 }
    );

    if (verification?.success !== true || verification?.paid !== true) {
      console.warn("❌ InfinitePay did not confirm payment:", orderNsu);
      return res.status(400).json({ success: false, message: "Payment not confirmed" });
    }

    const result = await sequelize.transaction(async (t) => {
      const pay = await PixPayment.findOne({
        where: { providerRef: orderNsu },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!pay) throw new WebhookReject("Order not found");

      const expectedAmountCents = Math.round(Number(pay.amountBRL) * 100);
      const verifiedAmountCents = Number(verification.amount);

      if (!Number.isFinite(verifiedAmountCents) || verifiedAmountCents !== expectedAmountCents) {
        console.warn("❌ InfinitePay amount mismatch:", {
          orderNsu,
          expectedAmountCents,
          verifiedAmountCents,
        });
        throw new WebhookReject("Payment amount mismatch");
      }

      if (pay.status === "credited") return { alreadyCredited: true as const };

      const user = await User.findByPk(pay.userId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!user) throw new WebhookReject("User not found");

      const points = Number(pay.points || pay.amountBRL || 0);
      user.points = Number(user.points || 0) + points;
      await user.save({ transaction: t });

      pay.status = "credited";
      pay.rawPayload = {
        ...(pay.rawPayload || {}),
        webhook: body,
        verification,
        transactionNsu,
        invoiceSlug,
        receiptUrl: body.receipt_url,
      };

      const paidAmountCents = Number(verification.paid_amount);
      if (Number.isFinite(paidAmountCents)) {
        pay.netValueBRL = paidAmountCents / 100;
        pay.feeBRL = Math.max(0, paidAmountCents / 100 - expectedAmountCents / 100);
      }

      await pay.save({ transaction: t });

      await PixPaymentRequest.update(
        { isPaid: true },
        {
          where: { userId: user.id, amount: Number(pay.amountBRL), isPaid: false },
          transaction: t,
        }
      );

      return { alreadyCredited: false as const, userId: user.id, points, newBalance: user.points };
    });

    if (result.alreadyCredited) {
      console.log("⚠️ Already credited:", orderNsu);
    } else {
      console.log("✅ InfinitePay payment verified and credited:", {
        userId: result.userId,
        pointsAdded: result.points,
        newBalance: result.newBalance,
        orderNsu,
        transactionNsu,
      });
    }

    return res.status(200).json({ success: true, message: null });
  } catch (err) {
    if (err instanceof WebhookReject) {
      console.warn("❌ InfinitePay webhook rejected:", err.message, orderNsu);
      return res.status(400).json({ success: false, message: err.message });
    }

    console.error("🔥 INFINITEPAY WEBHOOK VERIFICATION ERROR:", providerErrorData(err));
    // InfinitePay retries webhook deliveries when we return 400.
    return res.status(400).json({ success: false, message: "Payment verification failed" });
  }
}

export async function manualCredit(req: Request, res: Response) {
  try {
    const { paymentId } = req.body ?? {};
    if (!paymentId) return res.status(400).json({ error: "paymentId is required" });

    const payment = await PixPayment.findByPk(paymentId);
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    if (payment.status === "credited") {
      return res.status(400).json({ error: "Already credited" });
    }

    const user = await User.findByPk(payment.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const points = Number(payment.points || payment.amountBRL || 0);
    user.points = Number(user.points || 0) + points;
    await user.save();

    payment.status = "credited";
    await payment.save();

    await PixPaymentRequest.update(
      { isPaid: true },
      { where: { userId: user.id, amount: Number(payment.amountBRL), isPaid: false } }
    );

    return res.status(200).json({
      message: "Manually credited",
      userId: user.id,
      phone: user.phone,
      pointsAdded: points,
      newBalance: user.points,
    });
  } catch (err) {
    console.error("🔥 INFINITEPAY MANUAL CREDIT ERROR:", err);
    return res.status(500).json({ error: errorMessage(err) });
  }
}
