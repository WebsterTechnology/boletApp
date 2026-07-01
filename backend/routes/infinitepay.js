const express = require("express");
const router = express.Router();

const infinitepayController = require("../controllers/infinitepayController");
const authenticate = require("../middleware/authenticate");

router.post(
  "/create-payment",
  authenticate,
  infinitepayController.createPayment
);
// Test
router.get("/test", infinitepayController.test);


// Webhook
router.post("/webhook", infinitepayController.webhook);

module.exports = router;