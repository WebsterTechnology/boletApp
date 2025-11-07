// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { User } = require("../models");
const authenticate = require("../middleware/authenticate");

const shapeUser = (u) => ({
  id: u.id,
  phone: u.phone,
  points: Number(u.points ?? 0),
  isAdmin: !!u.isAdmin,
});

// GET /api/users/me
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(shapeUser(user));
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/points  -> { points }
router.get("/points", authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ["points"] });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ points: Number(user.points ?? 0) });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
