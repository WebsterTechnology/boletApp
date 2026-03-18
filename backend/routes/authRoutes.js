const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authenticate = require("../middleware/authenticate")

router.post("/register", authController.register);
router.post("/login", authController.login);
router.delete("/users/:id", authenticate, authController.deleteUser);

module.exports = router;
