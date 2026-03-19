
const express = require("express");
const axios = require("axios");
const { User } = require("../models");
const router = express.Router();

const ASAAS_BASE_URL =
  process.env.ASAAS_BASE_URL ||
  (process.env.ASAAS_ENV === "production"
    ? "https://www.asaas.com/api/v3"
    : "https://sandbox.asaas.com/api/v3");

router.post("/create-customer", async (req, res) => {
  try {
    const { userId, name, cpfCnpj, email, phone } = req.body;

    // Validate user
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Create customer in Asaas
    const { data: customer } = await axios.post(
      `${ASAAS_BASE_URL}/customers`,
      { name, cpfCnpj, email, phone },
      {
        headers: {
          access_token: process.env.ASAAS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // Save in DB
    user.asaasCustomerId = customer.id;
    await user.save();

    res.json({
      message: "Customer created in Asaas",
      customer,
    });

  } catch (e) {

    // 🔥 NEW: full logging so we can debug on Railway
    console.error(
      "ASAAS ERROR:",
      JSON.stringify(e.response?.data || e.message, null, 2)
    );

    const msg =
      e.response?.data?.errors?.[0]?.description ||
      e.response?.data?.message ||
      e.message;

    res.status(500).json({ error: String(msg) });
  }
});


// 🔥 WEBHOOK ASAAS (ADICIONE ISSO) not use
router.post("/pix/webhook", (req, res) => {
  console.log("🔥 WEBHOOK RECEBIDO DO ASAAS:");
  console.log(JSON.stringify(req.body, null, 2));

  // ⚡ IMPORTANTE: sempre responder 200 rápido
  res.sendStatus(200);
});

module.exports = router;
