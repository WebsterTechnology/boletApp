import axios from "axios";
import { Router } from "express";
import { env } from "../config/env";
import { adminOnly } from "../middleware/adminOnly";
import { authenticate, currentUser } from "../middleware/authenticate";
import { PixPayment, PixPaymentRequest, User } from "../models";
import { errorMessage, providerErrorData, providerErrorMessage } from "../utils/errors";

const router = Router();

const asaasHeaders = () => ({ access_token: env.asaasApiKey ?? "" });

// ---------------- HELPERS ----------------
function normalizePhone(raw: unknown): { mobilePhone?: string; phone?: string } {
  const d = String(raw || "").replace(/\D/g, "");
  const no55 = d.startsWith("55") && d.length > 11 ? d.slice(2) : d;

  if (no55.length >= 11) return { mobilePhone: no55.slice(-11) };
  if (no55.length >= 10) return { phone: no55.slice(-10) };
  return {};
}

interface AsaasPixQrCode {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
}

async function getPixQrByPaymentId(paymentId: string) {
  const { data } = await axios.get<AsaasPixQrCode>(
    `${env.asaasBaseUrl}/payments/${paymentId}/pixQrCode`,
    { headers: asaasHeaders() }
  );

  return {
    qrCode: data?.encodedImage || null,
    copyPaste: data?.payload || null,
    expirationDate: data?.expirationDate || null,
  };
}

// ---------------- DEBUG ENDPOINTS ----------------
router.get("/debug/users", authenticate, adminOnly, async (_req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "phone", "points", "asaasCustomerId"],
      order: [["id", "ASC"]],
    });
    return res.json(users);
  } catch (err) {
    console.error("Debug users error:", err);
    return res.status(500).json({ error: errorMessage(err) });
  }
});

router.get("/debug/payments", authenticate, adminOnly, async (_req, res) => {
  try {
    const payments = await PixPayment.findAll({
      include: [{ model: User, attributes: ["id", "phone", "points"] }],
      order: [["createdAt", "DESC"]],
      limit: 20,
    });
    return res.json(payments);
  } catch (err) {
    console.error("Debug payments error:", err);
    return res.status(500).json({ error: errorMessage(err) });
  }
});

router.get("/debug/pix-requests", authenticate, adminOnly, async (_req, res) => {
  try {
    const requests = await PixPaymentRequest.findAll({
      include: [{ model: User, as: "user", attributes: ["id", "phone", "points"] }],
      order: [["createdAt", "DESC"]],
      limit: 20,
    });
    return res.json(requests);
  } catch (err) {
    console.error("Debug pix requests error:", err);
    return res.status(500).json({ error: errorMessage(err) });
  }
});

// ---------------- CREATE PIX ----------------
router.post("/create", authenticate, async (req, res) => {
  try {
    const { amountBRL, description, name, cpfCnpj, email, phone } = req.body ?? {};
    const userId = currentUser(req).id;

    const amount = Number(amountBRL);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "amountBRL must be > 0" });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // -------- CREATE CUSTOMER IF NEEDED --------
    if (!user.asaasCustomerId) {
      const digits = String(cpfCnpj || "").replace(/\D/g, "");

      if (!(digits.length === 11 || digits.length === 14)) {
        return res.status(400).json({
          error: "CPF/CNPJ inválido. Deve conter 11 (CPF) ou 14 (CNPJ) dígitos.",
        });
      }

      // 1) Look up an existing customer
      try {
        const { data: list } = await axios.get<{ data?: { id: string }[] }>(
          `${env.asaasBaseUrl}/customers`,
          { params: { cpfCnpj: digits, limit: 1 }, headers: asaasHeaders() }
        );

        if (Array.isArray(list?.data) && list.data.length) {
          user.asaasCustomerId = list.data[0].id;
          await user.save();
        }
      } catch (err) {
        console.error("❌ ASAAS LOOKUP ERROR:", providerErrorData(err));
      }

      // 2) Create the customer if still missing
      if (!user.asaasCustomerId) {
        try {
          const payload = {
            name: (typeof name === "string" && name.trim()) || `User ${user.id}`,
            cpfCnpj: digits,
            email: (typeof email === "string" && email.trim()) || `user${user.id}@example.com`,
            ...normalizePhone(phone || user.phone),
          };

          const { data: cust } = await axios.post<{ id: string }>(
            `${env.asaasBaseUrl}/customers`,
            payload,
            { headers: asaasHeaders() }
          );

          user.asaasCustomerId = cust.id;
          await user.save();
        } catch (err) {
          console.error("🔥 ASAAS CUSTOMER CREATION ERROR:", providerErrorData(err));

          const provider = axios.isAxiosError(err) ? err.response?.data : undefined;
          return res.status(400).json({
            error:
              provider?.errors?.[0]?.description ||
              provider?.message ||
              JSON.stringify(provider) ||
              "Erro ao criar cliente no Asaas",
          });
        }
      }
    }

    // -------- CREATE PIX PAYMENT --------
    const { data: payment } = await axios.post(
      `${env.asaasBaseUrl}/payments`,
      {
        customer: user.asaasCustomerId,
        billingType: "PIX",
        value: amount,
        description: description || "Pagamento",
        dueDate: new Date().toISOString().slice(0, 10),
      },
      { headers: { ...asaasHeaders(), "Content-Type": "application/json" } }
    );

    let qrCode: string | null = null;
    let copyPaste: string | null = null;
    let expirationDate: string | null = null;
    try {
      ({ qrCode, copyPaste, expirationDate } = await getPixQrByPaymentId(payment.id));
    } catch (err) {
      console.error("⚠️ Error fetching QR:", providerErrorData(err));
    }

    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 0, 0);

    const local = await PixPayment.create({
      userId: user.id,
      providerRef: payment.id,
      amountBRL: amount,
      points: Math.floor(amount),
      status: "pending",
      expiresAt,
      rawPayload: payment,
    });

    // Also create a PixPaymentRequest for the buyPwen controller
    await PixPaymentRequest.create({
      userId: user.id,
      phoneNumber: user.phone,
      amount,
      isPaid: false,
    });

    return res.json({
      paymentId: local.id,
      providerPaymentId: payment.id,
      status: payment.status,
      qrCode,
      copyPaste,
      expirationDate,
      invoiceUrl: payment.invoiceUrl || payment.transactionReceiptUrl || payment.bankSlipUrl || null,
      userId: user.id,
    });
  } catch (err) {
    console.error("🔥 GLOBAL PIX ERROR:", providerErrorData(err));
    return res.status(500).json({ error: providerErrorMessage(err) });
  }
});

// ---------------- GET QR ----------------
router.get("/qr/:paymentId", authenticate, async (req, res) => {
  try {
    const local = await PixPayment.findOne({ where: { id: req.params.paymentId, userId: currentUser(req).id } });
    if (!local) return res.status(404).json({ error: "Local payment not found" });

    const qr = await getPixQrByPaymentId(local.providerRef);
    if (!qr.qrCode && !qr.copyPaste) return res.status(204).send();

    return res.json(qr);
  } catch (err) {
    return res.status(500).json({ error: providerErrorMessage(err) });
  }
});

// ---------------- CHECK PAYMENT STATUS ----------------
router.get("/status/:paymentId", authenticate, async (req, res) => {
  try {
    const local = await PixPayment.findOne({ where: { id: req.params.paymentId, userId: currentUser(req).id } });
    if (!local) return res.status(404).json({ error: "Local payment not found" });

    const { data: p } = await axios.get<{ status: string }>(
      `${env.asaasBaseUrl}/payments/${local.providerRef}`,
      { headers: asaasHeaders() }
    );

    return res.json({ status: p.status });
  } catch (err) {
    return res.status(500).json({ error: providerErrorMessage(err) });
  }
});

// ---------------- WEBHOOK ----------------
const ASAAS_PAID_STATUSES = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];

router.post("/webhook", async (req, res) => {
  try {
    const body = req.body || {};
    const p = body.payment || body;
    const providerId: string | undefined = p.id;

    if (!providerId) {
      console.log("❌ PIX webhook without provider ID");
      return res.sendStatus(200);
    }

    const pay = await PixPayment.findOne({ where: { providerRef: providerId } });
    if (!pay) {
      console.log("❌ PIX webhook: payment not found for providerRef:", providerId);
      return res.sendStatus(200);
    }

    const status = String(p.status || "").toUpperCase();
    if (!ASAAS_PAID_STATUSES.includes(status)) return res.sendStatus(200);

    // Idempotency: don't credit twice
    if (pay.status === "credited") return res.sendStatus(200);

    const user = await User.findByPk(pay.userId);
    if (!user) {
      console.log("❌ PIX webhook: user not found:", pay.userId);
      return res.sendStatus(200);
    }

    const pts = Number(pay.points || pay.amountBRL || 0);
    user.points = Number(user.points || 0) + pts;
    await user.save();

    const pixRequest = await PixPaymentRequest.findOne({
      where: { userId: user.id, amount: Number(pay.amountBRL), isPaid: false },
    });
    if (pixRequest) {
      pixRequest.isPaid = true;
      await pixRequest.save();
    }

    // Mark credited so the webhook can't double-credit
    pay.status = "credited";
    await pay.save();

    console.log("✅ PIX webhook credited:", { userId: user.id, points: pts, newBalance: user.points });
    return res.sendStatus(200);
  } catch (err) {
    console.error("🔥 Webhook error:", providerErrorData(err));
    return res.sendStatus(200);
  }
});

// ---------------- MANUAL CREDIT ENDPOINT ----------------
router.post("/manual-credit", authenticate, adminOnly, async (req, res) => {
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
    console.error("Manual credit error:", err);
    return res.status(500).json({ error: errorMessage(err) });
  }
});

export default router;
