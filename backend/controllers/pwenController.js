const { User, Pwen } = require("../models");

exports.buyPwen = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body; // e.g. 100

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Add points to user balance
    const user = await User.findByPk(userId);
    user.points += amount;
    await user.save();

    // Log the purchase
    await Pwen.create({
      amount,
      userId,
      stripePaymentId: "dev-mode", // replace when Stripe is integrated
    });

    res.status(200).json({ message: "Pwen added", balance: user.points });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
