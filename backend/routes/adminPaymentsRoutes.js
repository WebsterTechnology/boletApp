const express = require("express");
const router = express.Router();

const {
  getPaidPixPayments,
  creditPixPayment,
} = require("../controllers/adminPaymentsController");

const authenticate = require("../middleware/authenticate");
const adminOnly = require("../middleware/adminOnly");

// 🔥 PENDING PIX (PAID PIX)
router.get("/", authenticate, adminOnly, getPaidPixPayments);

// 🔥 CREDIT PIX
router.post("/:id/credit", authenticate, adminOnly, creditPixPayment);

module.exports = router;
