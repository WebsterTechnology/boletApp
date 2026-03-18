const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authenticate = require("../middleware/authenticate")
const adminOnly = require("../middleware/adminOnly");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.delete(
  "/users/:id",
  authenticate,
  adminOnly,
  authController.deleteUser
);

module.exports = router;
