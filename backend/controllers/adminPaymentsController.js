const { PixPayment, User } = require("../models");

/**
 * GET all RECEIVED PIX
 * In your system: RECEIVED = credited (webhook already ran)
 */
exports.getPaidPixPayments = async (req, res) => {
  try {
    const payments = await PixPayment.findAll({
      where: { status: "credited" }, // 🔥 FIX HERE
      order: [["createdAt", "ASC"]],
    });

    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch PIX payments" });
  }
};

/**
 * CREDIT PIX
 * (optional – mostly redundant since webhook already credits)
 */
exports.creditPixPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await PixPayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "credited") {
      return res.status(400).json({
        message: "PIX not credited yet",
      });
    }

    const user = await User.findByPk(payment.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "PIX already credited via webhook",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to process PIX" });
  }
};
