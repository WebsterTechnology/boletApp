


// // module.exports = router;
// const express = require("express");
// const axios = require("axios");
// const router = express.Router();
// const { User, PixPayment } = require("../models");

// const ASAAS_BASE_URL =
//   process.env.ASAAS_BASE_URL ||
//   (process.env.ASAAS_ENV === "production"
//     ? "https://www.asaas.com/api/v3"
//     : "https://sandbox.asaas.com/api/v3");

// // ---- helpers
// function normalizePhone(raw) {
//   const d = String(raw || "").replace(/\D/g, "");
//   const no55 = d.startsWith("55") && d.length > 11 ? d.slice(2) : d;
//   if (no55.length === 11) return { mobilePhone: no55 };
//   if (no55.length === 10) return { phone: no55 };
//   return {};
// }
// async function getPixQrByPaymentId(paymentId) {
//   // Asaas docs: /payments/{id}/pixQrCode (returns encodedImage, payload, expirationDate)
//   const { data } = await axios.get(
//     `${ASAAS_BASE_URL}/payments/${paymentId}/pixQrCode`,
//     { headers: { access_token: process.env.ASAAS_API_KEY } }
//   );
//   return {
//     qrCode: data.encodedImage || null,
//     copyPaste: data.payload || null,
//     expirationDate: data.expirationDate || null,
//   };
// }

// router.get("/ping", (req, res) => res.json({ ok: "pix" }));

// /**
//  * POST /api/pix/create
//  * body: { userId, amountBRL, description?, name?, cpfCnpj?, email?, phone? }
//  * resp: { paymentId, status, qrCode(base64)?, copyPaste?, invoiceUrl? }
//  */
// router.post("/create", async (req, res) => {
//   try {
//     const { userId, amountBRL, description, name, cpfCnpj, email, phone } = req.body;

//     if (!userId) return res.status(400).json({ error: "userId is required" });
//     const amount = Number(amountBRL);
//     if (!amount || amount <= 0) return res.status(400).json({ error: "amountBRL must be > 0" });

//     const user = await User.findByPk(userId);
//     if (!user) return res.status(404).json({ error: "User not found" });

//     // --- ensure customer in Asaas (lookup by cpf/cnpj; create if missing)
//     if (!user.asaasCustomerId) {
//       const digits = String(cpfCnpj || "").replace(/\D/g, "");
//       if (!digits || !(digits.length === 11 || digits.length === 14)) {
//         return res.status(400).json({ error: "CPF/CNPJ inválido: 11 (CPF) ou 14 (CNPJ) dígitos." });
//       }
//       // try reuse
//       try {
//         const { data: list } = await axios.get(`${ASAAS_BASE_URL}/customers`, {
//           params: { cpfCnpj: digits, limit: 1 },
//           headers: { access_token: process.env.ASAAS_API_KEY },
//         });
//         if (Array.isArray(list?.data) && list.data.length) {
//           user.asaasCustomerId = list.data[0].id;
//           await user.save();
//         }
//       } catch {}
//       // create if still missing
//       if (!user.asaasCustomerId) {
//         try {
//           const payload = {
//             name: (name || `User ${user.id}`).trim(),
//             cpfCnpj: digits,
//             email: (email || `${user.phone || "user"}@example.com`).trim(),
//             ...normalizePhone(phone || user.phone),
//           };
//           const { data: cust } = await axios.post(
//             `${ASAAS_BASE_URL}/customers`,
//             payload,
//             { headers: { access_token: process.env.ASAAS_API_KEY } }
//           );
//           user.asaasCustomerId = cust.id;
//           await user.save();
//         } catch (err) {
//           const provider = err.response?.data;
//           // if already exists, fetch it
//           if (/existe|exists/i.test(provider?.message || "")) {
//             try {
//               const { data: list } = await axios.get(`${ASAAS_BASE_URL}/customers`, {
//                 params: { cpfCnpj: String(cpfCnpj).replace(/\D/g, ""), limit: 1 },
//                 headers: { access_token: process.env.ASAAS_API_KEY },
//               });
//               if (Array.isArray(list?.data) && list.data.length) {
//                 user.asaasCustomerId = list.data[0].id;
//                 await user.save();
//               }
//             } catch {}
//           }
//           if (!user.asaasCustomerId) {
//             return res.status(400).json({
//               error:
//                 provider?.errors?.[0]?.description ||
//                 provider?.message ||
//                 "Could not create Asaas customer.",
//             });
//           }
//         }
//       }
//     }

//     // --- create PIX charge
//     const { data: payment } = await axios.post(
//       `${ASAAS_BASE_URL}/payments`,
//       {
//         customer: user.asaasCustomerId,
//         billingType: "PIX",
//         value: amount,
//         description: description || "Payment",
//         dueDate: new Date().toISOString().slice(0, 10),
//       },
//       {
//         headers: {
//           access_token: process.env.ASAAS_API_KEY,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     // try to fetch QR from the dedicated endpoint
//     let qrCode = null, copyPaste = null, expirationDate = null;
//     try {
//       const qr = await getPixQrByPaymentId(payment.id);
//       qrCode = qr.qrCode;
//       copyPaste = qr.copyPaste;
//       expirationDate = qr.expirationDate;
//     } catch {
//       // ok to miss; user can hit the refresh endpoint below
//     }

//     // fallback urls (useful if you want to open Asaas page)
//     const invoiceUrl =
//       payment.invoiceUrl || payment.transactionReceiptUrl || payment.bankSlipUrl || null;

//     // save locally
//     const expiresAt = new Date();
//     expiresAt.setHours(23, 59, 0, 0);
//     const local = await PixPayment.create({
//       userId,
//       providerRef: payment.id,
//       amountBRL: amount,
//       points: Math.floor(amount),
//       status: "pending",
//       expiresAt,
//       rawPayload: payment,
//     });

//     return res.json({
//       paymentId: local.id,
//       providerPaymentId: payment.id,
//       status: payment.status,
//       qrCode,        // base64 (encodedImage)
//       copyPaste,     // payload
//       expirationDate,
//       invoiceUrl,
//     });
//   } catch (e) {
//     const msg =
//       e.response?.data?.errors?.[0]?.description ||
//       e.response?.data?.message ||
//       (typeof e.response?.data === "string" ? e.response.data : "") ||
//       e.message;
//     return res.status(500).json({ error: String(msg || "PIX create failed") });
//   }
// });

// /** refresh QR: GET /api/pix/qr/:paymentId */
// router.get("/qr/:paymentId", async (req, res) => {
//   try {
//     const local = await PixPayment.findByPk(req.params.paymentId);
//     if (!local) return res.status(404).json({ error: "Local payment not found" });

//     const qr = await getPixQrByPaymentId(local.providerRef);
//     if (!qr.qrCode && !qr.copyPaste) return res.status(204).send();
//     return res.json(qr);
//   } catch (e) {
//     const msg =
//       e.response?.data?.errors?.[0]?.description ||
//       e.response?.data?.message ||
//       e.message;
//     return res.status(500).json({ error: String(msg) });
//   }
// });

// /** status polling */
// router.get("/status/:paymentId", async (req, res) => {
//   try {
//     const local = await PixPayment.findByPk(req.params.paymentId);
//     if (!local) return res.status(404).json({ error: "Local payment not found" });

//     const { data: p } = await axios.get(
//       `${ASAAS_BASE_URL}/payments/${local.providerRef}`,
//       { headers: { access_token: process.env.ASAAS_API_KEY } }
//     );
//     return res.json({ status: p.status });
//   } catch (e) {
//     const msg =
//       e.response?.data?.errors?.[0]?.description ||
//       e.response?.data?.message ||
//       e.message;
//     return res.status(500).json({ error: String(msg) });
//   }
// });

// module.exports = router;
// routes/pixRoutes.js
const express = require("express");
const axios = require("axios");
const router = express.Router();
const { User, PixPayment } = require("../models");

const ASAAS_BASE_URL =
  process.env.ASAAS_BASE_URL ||
  (process.env.ASAAS_ENV === "production"
    ? "https://www.asaas.com/api/v3"
    : "https://sandbox.asaas.com/api/v3");

// ---- helpers
function normalizePhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  const no55 = d.startsWith("55") && d.length > 11 ? d.slice(2) : d;
  if (no55.length === 11) return { mobilePhone: no55 };
  if (no55.length === 10) return { phone: no55 };
  return {};
}
async function getPixQrByPaymentId(paymentId) {
  // Asaas: /payments/{id}/pixQrCode returns { encodedImage, payload, expirationDate }
  const { data } = await axios.get(
    `${ASAAS_BASE_URL}/payments/${paymentId}/pixQrCode`,
    { headers: { access_token: process.env.ASAAS_API_KEY } }
  );
  return {
    qrCode: data.encodedImage || null,   // base64 PNG
    copyPaste: data.payload || null,     // EMV text
    expirationDate: data.expirationDate || null,
  };
}

router.get("/ping", (req, res) => res.json({ ok: "pix" }));

/**
 * POST /api/pix/create
 * body: { userId, amountBRL, description?, name?, cpfCnpj?, email?, phone? }
 * resp: { paymentId, status, qrCode?, copyPaste?, invoiceUrl? }
 */
router.post("/create", async (req, res) => {
  try {
    const { userId, amountBRL, description, name, cpfCnpj, email, phone } = req.body;

    if (!userId) return res.status(400).json({ error: "userId is required" });
    const amount = Number(amountBRL);
    if (!amount || amount <= 0) return res.status(400).json({ error: "amountBRL must be > 0" });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // --- ensure customer in Asaas (lookup by cpf/cnpj; create if missing)
    if (!user.asaasCustomerId) {
      const digits = String(cpfCnpj || "").replace(/\D/g, "");
      if (!digits || !(digits.length === 11 || digits.length === 14)) {
        return res.status(400).json({ error: "CPF/CNPJ inválido: 11 (CPF) ou 14 (CNPJ) dígitos." });
      }
      // 1) reuse if exists
      try {
        const { data: list } = await axios.get(`${ASAAS_BASE_URL}/customers`, {
          params: { cpfCnpj: digits, limit: 1 },
          headers: { access_token: process.env.ASAAS_API_KEY },
        });
        if (Array.isArray(list?.data) && list.data.length) {
          user.asaasCustomerId = list.data[0].id;
          await user.save();
        }
      } catch {}
      // 2) create if still missing
      if (!user.asaasCustomerId) {
        try {
          const payload = {
            name: (name || `User ${user.id}`).trim(),
            cpfCnpj: digits,
            email: (email || `${user.phone || "user"}@example.com`).trim(),
            ...normalizePhone(phone || user.phone),
          };
          const { data: cust } = await axios.post(
            `${ASAAS_BASE_URL}/customers`,
            payload,
            { headers: { access_token: process.env.ASAAS_API_KEY } }
          );
          user.asaasCustomerId = cust.id;
          await user.save();
        } catch (err) {
          const provider = err.response?.data;
          // if already exists, fetch it
          if (/existe|exists/i.test(provider?.message || "")) {
            try {
              const { data: list } = await axios.get(`${ASAAS_BASE_URL}/customers`, {
                params: { cpfCnpj: String(cpfCnpj).replace(/\D/g, ""), limit: 1 },
                headers: { access_token: process.env.ASAAS_API_KEY },
              });
              if (Array.isArray(list?.data) && list.data.length) {
                user.asaasCustomerId = list.data[0].id;
                await user.save();
              }
            } catch {}
          }
          if (!user.asaasCustomerId) {
            return res.status(400).json({
              error:
                provider?.errors?.[0]?.description ||
                provider?.message ||
                "Could not create Asaas customer.",
            });
          }
        }
      }
    }

    // --- create PIX charge
    const { data: payment } = await axios.post(
      `${ASAAS_BASE_URL}/payments`,
      {
        customer: user.asaasCustomerId,
        billingType: "PIX",
        value: amount,
        description: description || "Payment",
        dueDate: new Date().toISOString().slice(0, 10),
      },
      {
        headers: {
          access_token: process.env.ASAAS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // try to fetch QR from the dedicated endpoint immediately
    let qrCode = null, copyPaste = null, expirationDate = null;
    try {
      const qr = await getPixQrByPaymentId(payment.id);
      qrCode = qr.qrCode;
      copyPaste = qr.copyPaste;
      expirationDate = qr.expirationDate;
    } catch {}

    // fallback url (Asaas page)
    const invoiceUrl =
      payment.invoiceUrl || payment.transactionReceiptUrl || payment.bankSlipUrl || null;

    // save locally
    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 0, 0);
    const local = await PixPayment.create({
      userId,
      providerRef: payment.id,
      amountBRL: amount,
      points: Math.floor(amount),
      status: "pending",
      expiresAt,
      rawPayload: payment,
    });

    return res.json({
      paymentId: local.id,
      providerPaymentId: payment.id,
      status: payment.status,
      qrCode,        // base64 (encodedImage)
      copyPaste,     // EMV payload
      expirationDate,
      invoiceUrl,
    });
  } catch (e) {
    const msg =
      e.response?.data?.errors?.[0]?.description ||
      e.response?.data?.message ||
      (typeof e.response?.data === "string" ? e.response.data : "") ||
      e.message;
    return res.status(500).json({ error: String(msg || "PIX create failed") });
  }
});

/** Refresh QR later: GET /api/pix/qr/:paymentId */
router.get("/qr/:paymentId", async (req, res) => {
  try {
    const local = await PixPayment.findByPk(req.params.paymentId);
    if (!local) return res.status(404).json({ error: "Local payment not found" });

    const qr = await getPixQrByPaymentId(local.providerRef);
    if (!qr.qrCode && !qr.copyPaste) return res.status(204).send();
    return res.json(qr);
  } catch (e) {
    const msg =
      e.response?.data?.errors?.[0]?.description ||
      e.response?.data?.message ||
      e.message;
    return res.status(500).json({ error: String(msg) });
  }
});

/** Poll provider status (optional for UI) */
// ...top of file stays the same

router.get("/status/:paymentId", async (req, res) => {
  try {
    const local = await PixPayment.findByPk(req.params.paymentId);
    if (!local) return res.status(404).json({ error: "Local payment not found" });

    const { data: p } = await axios.get(
      `${ASAAS_BASE_URL}/payments/${local.providerRef}`,
      { headers: { access_token: process.env.ASAAS_API_KEY } }
    );

    const providerStatus = (p.status || "").toUpperCase();

    // If provider says money is in, reflect that in our DB
    if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(providerStatus)) {
      const gross = p.value != null ? Number(p.value) : null;
      const net = p.netValue != null ? Number(p.netValue) : null;

      let dirty = false;
      if (local.status !== "paid" && local.status !== "credited") {
        local.status = "paid";
        dirty = true;
      }
      if (net != null) {
        local.netValueBRL = net;
        dirty = true;
      }
      if (gross != null && net != null) {
        local.feeBRL = (gross - net).toFixed(2);
        dirty = true;
      }
      if (dirty) await local.save();
    }

    return res.json({ status: p.status });
  } catch (e) {
    const msg =
      e.response?.data?.errors?.[0]?.description ||
      e.response?.data?.message ||
      e.message;
    return res.status(500).json({ error: String(msg) });
  }
});


/** ✅ Asaas Webhook — set in Dashboard: Integrations > Webhooks */
router.post("/webhook", async (req, res) => {
  try {
    // Asaas typically sends: { event: "...", payment: { id, status, value, netValue, ... } }
    const body = req.body || {};
    const p = body.payment || body; // be tolerant
    const providerId = p.id || body.id;
    const providerStatus = (p.status || "").toUpperCase();

    if (!providerId) return res.sendStatus(200);

    const pay = await PixPayment.findOne({ where: { providerRef: providerId } });
    if (!pay) return res.sendStatus(200);

    // capture gross/net/fee if present
    const gross = p.value != null ? Number(p.value) : null;
    const net = p.netValue != null ? Number(p.netValue) : null;
    if (net != null) pay.netValueBRL = net;
    if (gross != null && net != null) pay.feeBRL = (gross - net).toFixed(2);

    if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(providerStatus)) {
      pay.status = "paid";
    }
    await pay.save();

    return res.sendStatus(200);
  } catch (e) {
    console.error("Asaas webhook error:", e.message);
    return res.sendStatus(200); // always ack
  }
});

module.exports = router;
