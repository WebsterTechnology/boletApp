const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const adminOnly = require("../middleware/adminOnly");
const controller = require("../controllers/adminPaymentsController");

router.get(
  "/payments",
  authenticate,
  adminOnly,
  controller.getPaidPixPayments
);

router.post(
  "/payments/:id/credit",
  authenticate,
  adminOnly,
  controller.creditPixPayment
);

module.exports = router;
