// backend/routes/claimsRoutes.js
const express = require("express");
const router = express.Router();

const { User, YonChif, Maryaj, TwaChif, WinClaim } = require("../models");
const authenticate = require("../middleware/authenticate");

router.post("/", authenticate, async (req, res) => {
  try {
    const { betType, betId, method, pixKey } = req.body;

    const map = { yonchif: YonChif, maryaj: Maryaj, twachif: TwaChif };
    if (!map[betType]) return res.status(400).json({ message: "Invalid bet type" });
    if (!["points", "pix"].includes(method))
      return res.status(400).json({ message: "Invalid method" });

    // 1) load bet and validate ownership + status
    const BetModel = map[betType];
    const bet = await BetModel.findByPk(betId);
    if (!bet || bet.userId !== req.user.id)
      return res.status(404).json({ message: "Bet not found" });

    const status = (bet.status || "pending").toLowerCase();
    if (status !== "won")
      return res.status(400).json({ message: "Only WON bets can be claimed" });

    // 2) forbid duplicate claim for this bet
    const dupe = await WinClaim.findOne({ where: { betType, betId } });
    if (dupe) return res.status(409).json({ message: "Claim already exists" });

    // 3) create claim
    const claim = await WinClaim.create({
      userId: req.user.id,
      betType,
      betId,
      method,
      pixKey: method === "pix" ? (pixKey || null) : null,
      pwen: Number(bet.pwen || 0),
      status: "pending",
    });

    res.json({ message: "Claim created", claim });
  } catch (e) {
    console.error("POST /api/claims error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
