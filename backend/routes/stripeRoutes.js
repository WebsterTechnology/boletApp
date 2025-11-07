// // // // routes/stripeRoutes.js
// // const express = require("express");
// // const router = express.Router();
// // const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// // const { User, Pwen } = require("../models");
// // console.log("Stripe Secret Key:", process.env.STRIPE_SECRET_KEY);

// // router.post("/", async (req, res) => {
// //   try {
// //     const { amount, paymentMethodId, userId } = req.body;

// //     if (!amount || !paymentMethodId || !userId) {
// //       return res.status(400).json({ message: "Missing required fields" });
// //     }

// //     const paymentIntent = await stripe.paymentIntents.create({
// //       amount: amount * 100, // Stripe uses cents
// //       currency: "usd",
// //       payment_method: paymentMethodId,
// //       confirm: true,
// //       automatic_payment_methods: {
// //         enabled: true,
// //         allow_redirects: "never",
// //       },
// //       expand: ["charges"],
// //     });

// //     // Log the result for debugging
// //     console.log("✅ PaymentIntent Created:", paymentIntent);

// //     if (paymentIntent.status === "succeeded") {
// //       const user = await User.findByPk(userId);
// //       if (!user) return res.status(404).json({ message: "User not found" });

// //       user.points += amount;
// //       await user.save();

// //       await Pwen.create({
// //         userId,
// //         amount,
// //         stripePaymentId: paymentIntent.id,
// //       });

// //       return res.json({
// //         message: "✅ Payment successful",
// //         clientSecret: paymentIntent.client_secret,
// //         balance: user.points,
// //       });
// //     } else {
// //       return res.status(400).json({ message: "Payment not completed" });
// //     }
// //   } catch (err) {
// //     console.error("❌ Stripe error:", err.message);
// //     return res.status(500).json({ message: "Payment failed", error: err.message });
// //   }
// // });

// // module.exports = router;

// // routes/stripeRoutes.js
// const express = require("express");
// const router = express.Router();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// const { User, Pwen } = require("../models");

// // ⚠️ Avoid logging secret keys in production
// // console.log("Stripe Secret Key:", process.env.STRIPE_SECRET_KEY);

// router.post("/", async (req, res) => {
//   try {
//     const {
//       amount,
//       paymentMethodId,
//       userId,
//       email,      // optional
//       firstName,  // optional
//       lastName,   // optional
//       phone,      // optional
//       comment,    // optional
//     } = req.body;

//     // ---- Basic validations (keep some conditions) ----
//     if (amount == null || paymentMethodId == null || userId == null) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     const normalizedAmount = parseInt(amount, 10);
//     if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
//       return res.status(400).json({ message: "Invalid amount" });
//     }

//     // Make sure the user exists
//     const user = await User.findByPk(userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     // ---- Create one-time PaymentIntent (no monthly / no anonymous) ----
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: normalizedAmount * 100, // Stripe uses cents
//       currency: "usd",
//       payment_method: paymentMethodId,
//       confirm: true,
//       // Only include receipt_email if provided
//       ...(email ? { receipt_email: email } : {}),
//       automatic_payment_methods: {
//         enabled: true,
//         allow_redirects: "never",
//       },
//       expand: ["charges"],
//       // Useful metadata for dashboards / reconciliation
//       metadata: {
//         userId: String(userId),
//         // Optional metadata if present:
//         ...(firstName ? { firstName } : {}),
//         ...(lastName ? { lastName } : {}),
//         ...(phone ? { phone } : {}),
//         ...(comment ? { comment } : {}),
//         purpose: "points_purchase",
//       },
//     });

//     // Optional: log for debugging (remove in prod)
//     // console.log("✅ PaymentIntent Created:", paymentIntent.id, paymentIntent.status);

//     if (paymentIntent.status !== "succeeded") {
//       return res.status(400).json({ message: "Payment not completed" });
//     }

//     // Extract card info if available
//     let card = null;
//     if (
//       paymentIntent.charges &&
//       paymentIntent.charges.data &&
//       paymentIntent.charges.data.length > 0
//     ) {
//       card = paymentIntent.charges.data[0]?.payment_method_details?.card || null;
//     }

//     // ---- Update user points ----
//     user.points = (user.points || 0) + normalizedAmount;
//     await user.save();

//     // ---- Create Pwen record ----
//     await Pwen.create({
//       userId,
//       amount: normalizedAmount,
//       stripePaymentId: paymentIntent.id,
//       // If your Pwen model supports these fields, keep them; otherwise remove
//       cardBrand: card?.brand || null,
//       last4: card?.last4 || null,
//       comment: comment || null,
//     });

//     return res.json({
//       message: "✅ Payment successful",
//       paymentId: paymentIntent.id,
//       balance: user.points,
//       cardBrand: card?.brand || null,
//       last4: card?.last4 || null,
//     });
//   } catch (err) {
//     console.error("❌ Stripe error:", err.message);
//     return res
//       .status(500)
//       .json({ message: "Payment failed", error: err.message });
//   }
// });

// module.exports = router;

// // 