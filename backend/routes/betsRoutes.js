// routes/betsRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/betsController");
const authenticate = require("../middleware/authenticate");

// Support both paths so the frontend can call /me or /shared
router.get(["/me", "/shared"], authenticate, controller.getAllMyBets);

module.exports = router;
