import { Router } from "express";
import { authenticate, currentUser } from "../middleware/authenticate";
import { Maryaj, TwaChif, WinClaim, YonChif } from "../models";
import { CLAIM_BET_TYPES, type ClaimBetType } from "../models/WinClaim";

const router = Router();

const BET_MODELS = { yonchif: YonChif, maryaj: Maryaj, twachif: TwaChif } as const;

const isClaimBetType = (value: unknown): value is ClaimBetType =>
  (CLAIM_BET_TYPES as readonly unknown[]).includes(value);

router.post("/", authenticate, async (req, res) => {
  try {
    const { betType, betId, method, pixKey } = req.body ?? {};
    const userId = currentUser(req).id;

    if (!isClaimBetType(betType)) return res.status(400).json({ message: "Invalid bet type" });
    if (method !== "points" && method !== "pix") {
      return res.status(400).json({ message: "Invalid method" });
    }

    // 1) load bet and validate ownership + status
    const bet = await (BET_MODELS[betType] as typeof YonChif).findByPk(betId);
    if (!bet || bet.userId !== userId) return res.status(404).json({ message: "Bet not found" });

    const status = (bet.status || "pending").toLowerCase();
    if (status !== "won") return res.status(400).json({ message: "Only WON bets can be claimed" });

    // 2) forbid duplicate claim for this bet
    const dupe = await WinClaim.findOne({ where: { betType, betId } });
    if (dupe) return res.status(409).json({ message: "Claim already exists" });

    // 3) create claim
    const claim = await WinClaim.create({
      userId,
      betType,
      betId,
      method,
      pixKey: method === "pix" ? pixKey || null : null,
      pwen: Number(bet.pwen || 0),
      status: "pending",
    });

    return res.json({ message: "Claim created", claim });
  } catch (err) {
    console.error("POST /api/claims error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
