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
// 
const { User, Pwen, PixPaymentRequest } = require("../models");

/**
 * BUY / CREDIT PWEN
 * - Admin can credit any user (userId in body)
 * - Normal users credit themselves
 * - PIX credits the user linked to PixPaymentRequest
 */
exports.buyPwen = async (req, res) => {
  try {
    const { amount, pixRequestId, userId } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    let targetUser;

    /* ---------------------------------
       ✅ PIX FLOW (SOURCE OF TRUTH)
    --------------------------------- */
    if (pixRequestId) {
      const pix = await PixPaymentRequest.findByPk(pixRequestId);

      if (!pix) {
        return res.status(404).json({ message: "PIX request not found" });
      }

      if (pix.isPaid) {
        return res.status(400).json({ message: "PIX already processed" });
      }

      targetUser = await User.findByPk(pix.userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      pix.isPaid = true;
      await pix.save();
    }

    /* ---------------------------------
       ✅ ADMIN / NORMAL FLOW
    --------------------------------- */
    else {
      const targetUserId = userId || req.user.id;

      targetUser = await User.findByPk(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    /* ---------------------------------
       ✅ CREDIT POINTS
    --------------------------------- */
    targetUser.points = Number(targetUser.points || 0) + Number(amount);
    await targetUser.save();

    /* ---------------------------------
       ✅ LOG TRANSACTION
    --------------------------------- */
    await Pwen.create({
      amount: Number(amount),
      userId: targetUser.id,
      stripePaymentId: pixRequestId ? "pix" : "manual",
    });

    return res.status(200).json({
      message: "Pwen added successfully",
      balance: targetUser.points,
      userId: targetUser.id,
    });

  } catch (err) {
    console.error("buyPwen error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
