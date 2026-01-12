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
// const { User, Pwen, PixPaymentRequest } = require("../models");

// /**
//  * BUY / CREDIT PWEN
//  * - Admin can credit any user (userId in body)
//  * - Normal users credit themselves
//  * - PIX credits the user linked to PixPaymentRequest
//  */
// exports.buyPwen = async (req, res) => {
//   try {
//     const { amount, pixRequestId, userId } = req.body;

//     if (!amount || Number(amount) <= 0) {
//       return res.status(400).json({ message: "Invalid amount" });
//     }

//     let targetUser;

//     /* ---------------------------------
//        ✅ PIX FLOW (SOURCE OF TRUTH)
//     --------------------------------- */
//     if (pixRequestId) {
//       const pix = await PixPaymentRequest.findByPk(pixRequestId);

//       if (!pix) {
//         return res.status(404).json({ message: "PIX request not found" });
//       }

//       if (pix.isPaid) {
//         return res.status(400).json({ message: "PIX already processed" });
//       }

//       targetUser = await User.findByPk(pix.userId);
//       if (!targetUser) {
//         return res.status(404).json({ message: "User not found" });
//       }

//       pix.isPaid = true;
//       await pix.save();
//     }

//     /* ---------------------------------
//        ✅ ADMIN / NORMAL FLOW
//     --------------------------------- */
//     else {
//       const targetUserId = userId || req.user.id;

//       targetUser = await User.findByPk(targetUserId);
//       if (!targetUser) {
//         return res.status(404).json({ message: "User not found" });
//       }
//     }

//     /* ---------------------------------
//        ✅ CREDIT POINTS
//     --------------------------------- */
//     targetUser.points = Number(targetUser.points || 0) + Number(amount);
//     await targetUser.save();

//     /* ---------------------------------
//        ✅ LOG TRANSACTION
//     --------------------------------- */
//     await Pwen.create({
//       amount: Number(amount),
//       userId: targetUser.id,
//       stripePaymentId: pixRequestId ? "pix" : "manual",
//     });

//     return res.status(200).json({
//       message: "Pwen added successfully",
//       balance: targetUser.points,
//       userId: targetUser.id,
//     });

//   } catch (err) {
//     console.error("buyPwen error:", err);
//     return res.status(500).json({
//       message: "Server error",
//       error: err.message,
//     });
//   }
// };
// controllers/pwenController.js
// controllers/pwenController.js
const { User, Pwen, PixPayment, PixPaymentRequest } = require("../models");

/**
 * BUY / CREDIT PWEN - FIXED VERSION
 * This handles both manual credits and PIX payment credits
 */
exports.buyPwen = async (req, res) => {
  try {
    console.log("💰 buyPwen called with:", req.body);
    
    const { amount, pixPaymentId, userId } = req.body; // Changed from pixRequestId to pixPaymentId

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    let targetUser;
    let sourceType = "manual";

    /* ---------------------------------
       ✅ PIX PAYMENT FLOW (USING PixPayment ID)
    --------------------------------- */
    if (pixPaymentId) {
      console.log(`🔍 Processing PIX payment ID: ${pixPaymentId}`);
      
      // Find the PixPayment by ID
      const pixPayment = await PixPayment.findByPk(pixPaymentId, {
        include: [{ model: User, as: "user" }]
      });

      if (!pixPayment) {
        console.log(`❌ PixPayment not found: ${pixPaymentId}`);
        return res.status(404).json({ message: "PIX payment not found" });
      }

      // Check if already credited
      if (pixPayment.status === "credited") {
        console.log(`⚠️ PixPayment already credited: ${pixPaymentId}`);
        return res.status(400).json({ message: "PIX already credited" });
      }

      // Verify payment is actually paid
      if (pixPayment.status !== "paid") {
        console.log(`⏳ PixPayment not paid yet: ${pixPaymentId}, status: ${pixPayment.status}`);
        return res.status(400).json({ 
          message: "PIX payment not confirmed yet", 
          status: pixPayment.status 
        });
      }

      targetUser = pixPayment.user;
      if (!targetUser) {
        console.log(`❌ User not found for PixPayment: ${pixPayment.userId}`);
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`✅ Found user for PIX payment: ${targetUser.id} - ${targetUser.phone}`);
      sourceType = "pix";
      
      // Mark PixPayment as credited
      pixPayment.status = "credited";
      await pixPayment.save();
      console.log(`✅ PixPayment marked as credited: ${pixPaymentId}`);
      
      // Also mark any related PixPaymentRequest as paid
      await PixPaymentRequest.update(
        { isPaid: true },
        { where: { userId: targetUser.id, amount: pixPayment.amountBRL, isPaid: false } }
      );
    }

    /* ---------------------------------
       ✅ ADMIN / MANUAL FLOW
    --------------------------------- */
    else {
      const targetUserId = userId || req.user?.id;
      
      if (!targetUserId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      console.log(`🔍 Processing manual credit for user ID: ${targetUserId}`);
      
      targetUser = await User.findByPk(targetUserId);
      if (!targetUser) {
        console.log(`❌ User not found: ${targetUserId}`);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`✅ Found user for manual credit: ${targetUser.id} - ${targetUser.phone}`);
    }

    /* ---------------------------------
       ✅ CREDIT POINTS
    --------------------------------- */
    const pointsToAdd = Number(amount);
    const currentPoints = Number(targetUser.points || 0);
    const newBalance = currentPoints + pointsToAdd;
    
    console.log(`💰 Crediting ${pointsToAdd} points to user ${targetUser.id}`);
    console.log(`📊 Balance: ${currentPoints} + ${pointsToAdd} = ${newBalance}`);
    
    targetUser.points = newBalance;
    await targetUser.save();

    /* ---------------------------------
       ✅ LOG TRANSACTION
    --------------------------------- */
    await Pwen.create({
      amount: pointsToAdd,
      userId: targetUser.id,
      stripePaymentId: sourceType === "pix" ? `pix-${pixPaymentId}` : "manual",
      source: sourceType,
    });

    console.log(`✅ Transaction logged for user ${targetUser.id}`);

    return res.status(200).json({
      message: "Pwen added successfully",
      balance: targetUser.points,
      userId: targetUser.id,
      phone: targetUser.phone,
      source: sourceType,
      pointsAdded: pointsToAdd,
    });

  } catch (err) {
    console.error("🔥 buyPwen error:", err);
    console.error(err.stack);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * SIMPLIFIED VERSION - Use this if you want webhook to auto-credit
 */
exports.creditUserFromPix = async (pixPaymentId) => {
  try {
    console.log(`🔄 Auto-crediting user from PixPayment: ${pixPaymentId}`);
    
    const pixPayment = await PixPayment.findByPk(pixPaymentId, {
      include: [{ model: User, as: "user" }]
    });

    if (!pixPayment) {
      throw new Error(`PixPayment ${pixPaymentId} not found`);
    }

    if (pixPayment.status === "credited") {
      console.log(`⏭️ Already credited: ${pixPaymentId}`);
      return { alreadyCredited: true };
    }

    const user = pixPayment.user;
    if (!user) {
      throw new Error(`User not found for PixPayment ${pixPaymentId}`);
    }

    const pointsToAdd = pixPayment.points || Math.floor(pixPayment.amountBRL);
    
    // Credit user
    user.points = Number(user.points || 0) + pointsToAdd;
    await user.save();

    // Log transaction
    await Pwen.create({
      amount: pointsToAdd,
      userId: user.id,
      stripePaymentId: `pix-${pixPaymentId}`,
      source: "pix",
    });

    // Update payment status
    pixPayment.status = "credited";
    await pixPayment.save();

    console.log(`✅ Auto-credited ${pointsToAdd} points to user ${user.id}`);

    return {
      success: true,
      userId: user.id,
      phone: user.phone,
      pointsAdded: pointsToAdd,
      newBalance: user.points,
    };
  } catch (err) {
    console.error(`🔥 Error in creditUserFromPix:`, err);
    throw err;
  }
};