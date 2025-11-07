const express = require("express");
const router = express.Router();
const controller = require("../controllers/pwenController");
const authenticate = require("../middleware/authenticate");

router.post("/buy", authenticate, controller.buyPwen);

module.exports = router;
