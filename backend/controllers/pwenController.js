// const { User, Pwen } = require("../models");

// exports.buyPwen = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { amount } = req.body; // e.g. 100

//     if (amount <= 0) {
//       return res.status(400).json({ message: "Invalid amount" });
//     }

//     // Add points to user balance
//     const user = await User.findByPk(userId);
//     user.points += amount;
//     await user.save();

//     // Log the purchase
//     await Pwen.create({
//       amount,
//       userId,
//       stripePaymentId: "dev-mode", // replace when Stripe is integrated
//     });

//     res.status(200).json({ message: "Pwen added", balance: user.points });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };
const { User, Pwen, PixPaymentRequest } = require("../models");

/**
 * BUY / CREDIT PWEN
 * - Supports PIX
 * - Credits the CORRECT user
 */
exports.buyPwen = async (req, res) => {
  try {
    const { amount, pixRequestId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    let user;

    /**
     * ✅ PIX FLOW
     * Credit user linked to PixPaymentRequest
     */
    if (pixRequestId) {
      const pix = await PixPaymentRequest.findByPk(pixRequestId);

      if (!pix) {
        return res.status(404).json({ message: "PIX request not found" });
      }

      if (pix.isPaid) {
        return res.status(400).json({ message: "PIX already processed" });
      }

      user = await User.findByPk(pix.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      pix.isPaid = true;
      await pix.save();
    } 
    /**
     * ✅ NORMAL / AUTH FLOW
     */
    else {
      user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    // ✅ CREDIT POINTS
    user.points += Number(amount);
    await user.save();

    // ✅ LOG TRANSACTION
    await Pwen.create({
      amount,
      userId: user.id,
      stripePaymentId: pixRequestId ? "pix" : "manual",
    });

    res.status(200).json({
      message: "Pwen added",
      balance: user.points,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
