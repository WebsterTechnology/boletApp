const express = require("express");
const router = express.Router();

const infinitepayController = require("../controllers/infinitepayController");

// Test
router.get("/test", infinitepayController.test);

// Create checkout
router.post("/create-payment", infinitepayController.createPayment);

// Webhook
router.post("/webhook", infinitepayController.webhook);

module.exports = router;