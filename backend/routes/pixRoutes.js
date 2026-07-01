
const express = require("express");
const axios = require("axios");
const router = express.Router();
const { User, PixPayment, PixPaymentRequest } = require("../models");

// ---------------- CONFIG ----------------
const ASAAS_BASE_URL =
  process.env.ASAAS_BASE_URL ||
  (process.env.ASAAS_ENV === "production"
    ? "https://www.asaas.com/api/v3"
    : "https://sandbox.asaas.com/api/v3");

// ---------------- HELPERS ----------------
function normalizePhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  const no55 = d.startsWith("55") && d.length > 11 ? d.slice(2) : d;

  if (no55.length >= 11) return { mobilePhone: no55.slice(-11) };
  if (no55.length >= 10) return { phone: no55.slice(-10) };
  return {};
}

async function getPixQrByPaymentId(paymentId) {
  const { data } = await axios.get(
    `${ASAAS_BASE_URL}/payments/${paymentId}/pixQrCode`,
    { headers: { access_token: process.env.ASAAS_API_KEY } }
  );

  return {
    qrCode: data?.encodedImage || null,
    copyPaste: data?.payload || null,
    expirationDate: data?.expirationDate || null,
  };
}

// ---------------- DEBUG ENDPOINTS ----------------
router.get("/debug/users", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'phone', 'points', 'asaasCustomerId', 'createdAt'],
      order: [['id', 'ASC']]
    });
    
    console.log("📊 Users in database:", users.length);
    return res.json(users);
  } catch (err) {
    console.error("Debug users error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/debug/payments", async (req, res) => {
  try {
    const payments = await PixPayment.findAll({
      include: [{ model: User, attributes: ['id', 'phone', 'points'] }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    
    console.log("📊 Payments in database:", payments.length);
    return res.json(payments);
  } catch (err) {
    console.error("Debug payments error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/debug/pix-requests", async (req, res) => {
  try {
    const requests = await PixPaymentRequest.findAll({
      include: [{ model: User, attributes: ['id', 'phone', 'points'] }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    
    console.log("📊 PixPaymentRequests in database:", requests.length);
    return res.json(requests);
  } catch (err) {
    console.error("Debug pix requests error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------- CREATE PIX ----------------
router.post("/create", async (req, res) => {
  console.log("========= PIX /create =========");
  console.log("📥 Body received:", req.body);
  console.log("🔧 ASAAS_ENV:", process.env.ASAAS_ENV);
  console.log("🔧 ASAAS_BASE_URL:", ASAAS_BASE_URL);
  console.log("🔧 ASAAS_API_KEY exists:", !!process.env.ASAAS_API_KEY);

  try {
    const { userId, amountBRL, description, name, cpfCnpj, email, phone } = req.body;

    // Validate required fields
    if (!userId) {
      console.log("❌ Missing userId");
      return res.status(400).json({ error: "userId is required" });
    }

    const amount = Number(amountBRL);
    if (!amount || amount <= 0) {
      console.log("❌ Invalid amount:", amountBRL);
      return res.status(400).json({ error: "amountBRL must be > 0" });
    }

    console.log("🔍 Looking for user with ID:", userId);
    const user = await User.findByPk(userId);
    if (!user) {
      console.log("❌ User not found with ID:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ User found:", { id: user.id, phone: user.phone });

    // -------- CREATE CUSTOMER IF NEEDED --------
    if (!user.asaasCustomerId) {
      console.log("👤 No Asaas customer ID, creating one...");
      const digits = String(cpfCnpj || "").replace(/\D/g, "");

      if (!(digits.length === 11 || digits.length === 14)) {
        console.log("❌ Invalid CPF/CNPJ:", digits);
        return res.status(400).json({
          error: "CPF/CNPJ inválido. Deve conter 11 (CPF) ou 14 (CNPJ) dígitos.",
        });
      }

      // 1️⃣ Try lookup existing customer
      try {
        console.log("🔍 Looking for existing customer with CPF/CNPJ:", digits);
        const { data: list } = await axios.get(
          `${ASAAS_BASE_URL}/customers`,
          {
            params: { cpfCnpj: digits, limit: 1 },
            headers: { access_token: process.env.ASAAS_API_KEY },
          }
        );

        if (Array.isArray(list?.data) && list.data.length) {
          console.log("⚡ Customer already exists in Asaas:", list.data[0].id);
          user.asaasCustomerId = list.data[0].id;
          await user.save();
          console.log("✅ Updated user with Asaas customer ID");
        }
      } catch (err) {
        console.error("❌ ASAAS LOOKUP ERROR:", err?.response?.data || err);
      }

      // 2️⃣ Create customer if missing
      if (!user.asaasCustomerId) {
        try {
          const payload = {
            name: name?.trim() || `User ${user.id}`,
            cpfCnpj: digits,
            email: email?.trim() || `user${user.id}@example.com`,
            ...normalizePhone(phone || user.phone),
          };

          console.log("📤 Creating new customer in Asaas with payload:", payload);

          const { data: cust } = await axios.post(
            `${ASAAS_BASE_URL}/customers`,
            payload,
            { headers: { access_token: process.env.ASAAS_API_KEY } }
          );

          console.log("✅ Customer created in Asaas:", cust.id);
          user.asaasCustomerId = cust.id;
          await user.save();
          console.log("✅ Updated user with new Asaas customer ID");
        } catch (err) {
          console.error("🔥 ASAAS CUSTOMER CREATION ERROR:", err?.response?.data || err);

          const provider = err?.response?.data;
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
    console.log("💰 Creating PIX payment for customer:", user.asaasCustomerId);

    const { data: payment } = await axios.post(
      `${ASAAS_BASE_URL}/payments`,
      {
        customer: user.asaasCustomerId,
        billingType: "PIX",
        value: amount,
        description: description || "Pagamento",
        dueDate: new Date().toISOString().slice(0, 10),
      },
      {
        headers: {
          access_token: process.env.ASAAS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Payment created in Asaas:", payment.id, payment.status);

    // Get QR code
    let qrCode = null, copyPaste = null, expirationDate = null;
    try {
      const qr = await getPixQrByPaymentId(payment.id);
      qrCode = qr.qrCode;
      copyPaste = qr.copyPaste;
      expirationDate = qr.expirationDate;
      console.log("✅ QR code retrieved");
    } catch (e) {
      console.error("⚠️ Error fetching QR:", e?.response?.data || e);
    }

    // Save in local database
    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 0, 0);

    console.log("💾 Saving payment to local database for user:", user.id);
    const local = await PixPayment.create({
      userId: user.id, // CRITICAL: Make sure this is set
      providerRef: payment.id,
      amountBRL: amount,
      points: Math.floor(amount),
      status: "pending",
      expiresAt,
      rawPayload: payment,
    });

    console.log("✅ Local payment saved with ID:", local.id);

    // Also create a PixPaymentRequest for the buyPwen controller
    await PixPaymentRequest.create({
      userId: user.id,
      phoneNumber: user.phone,
      amount: amount,
      isPaid: false,
    });

    return res.json({
      paymentId: local.id,
      providerPaymentId: payment.id,
      status: payment.status,
      qrCode,
      copyPaste,
      expirationDate,
      invoiceUrl:
        payment.invoiceUrl ||
        payment.transactionReceiptUrl ||
        payment.bankSlipUrl ||
        null,
      userId: user.id,
    });
  } catch (err) {
    console.error("🔥 GLOBAL PIX ERROR:", err?.response?.data || err);
    console.error(err.stack);

    const msg =
      err.response?.data?.errors?.[0]?.description ||
      err.response?.data?.message ||
      err.message;

    return res.status(500).json({ error: msg });
  }
});

// ---------------- GET QR ----------------
router.get("/qr/:paymentId", async (req, res) => {
  try {
    const local = await PixPayment.findByPk(req.params.paymentId);
    if (!local) return res.status(404).json({ error: "Local payment not found" });

    const qr = await getPixQrByPaymentId(local.providerRef);
    if (!qr.qrCode && !qr.copyPaste) return res.status(204).send();

    return res.json(qr);
  } catch (err) {
    return res.status(500).json({
      error:
        err.response?.data?.errors?.[0]?.description ||
        err.response?.data?.message ||
        err.message,
    });
  }
});

// ---------------- CHECK PAYMENT STATUS ----------------
router.get("/status/:paymentId", async (req, res) => {
  try {
    const local = await PixPayment.findByPk(req.params.paymentId);
    if (!local) return res.status(404).json({ error: "Local payment not found" });

    const { data: p } = await axios.get(
      `${ASAAS_BASE_URL}/payments/${local.providerRef}`,
      { headers: { access_token: process.env.ASAAS_API_KEY } }
    );

    return res.json({ status: p.status });
  } catch (err) {
    return res.status(500).json({
      error:
        err.response?.data?.errors?.[0]?.description ||
        err.response?.data?.message ||
        err.message,
    });
  }
});

// ---------------- WEBHOOK ----------------
router.post("/webhook", async (req, res) => {
  console.log("========= PIX WEBHOOK RECEIVED =========");
  console.log("📥 Webhook body:", JSON.stringify(req.body, null, 2));

  try {
    const body = req.body || {};
    const p = body.payment || body;
    const providerId = p.id;

    if (!providerId) {
      console.log("❌ No provider ID in webhook");
      return res.sendStatus(200);
    }

    console.log("🔍 Looking for payment with providerRef:", providerId);
    
    // Find the local payment
    const pay = await PixPayment.findOne({ 
      where: { providerRef: providerId },
      include: [{ model: User }]
    });
    
    if (!pay) {
      console.log("❌ Payment not found in local DB for providerRef:", providerId);
      return res.sendStatus(200);
    }

    console.log("✅ Found payment:", {
      paymentId: pay.id,
      userId: pay.userId,
      userPhone: pay.User?.phone,
      currentStatus: pay.status,
      amount: pay.amountBRL,
      points: pay.points
    });
    
    const status = (p.status || "").toUpperCase();
    console.log("📊 Asaas payment status:", status);

    // ✅ Asaas paid statuses
    const isPaid = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status);

    if (!isPaid) {
      console.log("⏳ Payment not yet paid, status:", status);
      return res.sendStatus(200);
    }

    // ✅ Idempotency: don't credit twice
    if (pay.status === "credited") {
      console.log("⚠️ Payment already credited, skipping");
      return res.sendStatus(200);
    }

    // ✅ CREDIT THE CORRECT USER FROM pay.userId
    const user = await User.findByPk(pay.userId);
    if (!user) {
      console.log("❌ User not found with ID:", pay.userId);
      return res.sendStatus(200);
    }

    console.log("👤 User found:", { id: user.id, phone: user.phone, currentPoints: user.points });
    
    const pts = Number(pay.points || pay.amountBRL || 0);
    console.log("💰 Crediting points:", pts);
    
    user.points = Number(user.points || 0) + pts;
    await user.save();
    
    console.log("✅ User new balance:", user.points);

    // Also mark PixPaymentRequest as paid
    const pixRequest = await PixPaymentRequest.findOne({
      where: { userId: user.id, amount: pay.amountBRL, isPaid: false }
    });
    
    if (pixRequest) {
      pixRequest.isPaid = true;
      await pixRequest.save();
      console.log("✅ PixPaymentRequest marked as paid");
    }

    // ✅ mark credited so webhook can't double-credit
    pay.status = "credited";
    await pay.save();
    
    console.log("🎯 Payment marked as credited in local DB");

    return res.sendStatus(200);
  } catch (err) {
    console.error("🔥 Webhook error:", err?.response?.data || err.message);
    console.error(err.stack);
    return res.sendStatus(200);
  }
});

// ---------------- MANUAL CREDIT ENDPOINT ----------------
router.post("/manual-credit", async (req, res) => {
  try {
    const { paymentId } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ error: "paymentId is required" });
    }
    
    console.log("🛠️ Manual credit requested for payment:", paymentId);
    
    const payment = await PixPayment.findByPk(paymentId);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    
    if (payment.status === "credited") {
      return res.status(400).json({ error: "Already credited" });
    }
    
    const user = await User.findByPk(payment.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const points = Number(payment.points || payment.amountBRL || 0);
    console.log("💰 Manual credit:", {
      userId: user.id,
      phone: user.phone,
      currentPoints: user.points,
      pointsToAdd: points
    });
    
    user.points = Number(user.points || 0) + points;
    await user.save();
    
    payment.status = "credited";
    await payment.save();
    
    // Also mark PixPaymentRequest as paid
    await PixPaymentRequest.update(
      { isPaid: true },
      { where: { userId: user.id, amount: payment.amountBRL, isPaid: false } }
    );
    
    return res.status(200).json({
      message: "Manually credited",
      userId: user.id,
      phone: user.phone,
      pointsAdded: points,
      newBalance: user.points
    });
    
  } catch (err) {
    console.error("Manual credit error:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;