const { PixPayment, User } = require("../models");

/**
 * GET all PAID PIX → shown in "Pending PIX"
 */
exports.getPaidPixPayments = async (req, res) => {
  try {
    const payments = await PixPayment.findAll({
      where: { status: "paid" },
      order: [["createdAt", "ASC"]],
    });

    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch PIX payments" });
  }
};

/**
 * CREDIT PIX → add points + remove from Pending PIX
 */
exports.creditPixPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await PixPayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "paid") {
      return res.status(400).json({
        message: "Only PAID PIX can be credited",
      });
    }

    const user = await User.findByPk(payment.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ add points
    user.points += payment.points;
    await user.save();

    // ✅ mark as credited → disappears from Pending PIX
    payment.status = "credited";
    await payment.save();

    res.json({ message: "PIX credited successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to credit PIX" });
  }
};
