import type { Request, Response } from "express";
import { currentUser } from "../middleware/authenticate";
import { Katchif, User } from "../models";
import { errorMessage } from "../utils/errors";
import { queryString } from "../utils/http";

const MAX_KATCHIF_POINTS = 20;

/** Points still available for this exact number + location. */
async function remainingFor(number: string, location: string) {
  const total = (await Katchif.sum("pwen", { where: { number, location } })) || 0;
  return Math.max(0, MAX_KATCHIF_POINTS - total);
}

export async function createKatchif(req: Request, res: Response) {
  try {
    const { number, pwen, location, receiptId } = req.body ?? {};
    const userId = currentUser(req).id;

    if (!/^\d{4}$/.test(number)) {
      return res.status(400).json({ message: "Number must be exactly 4 digits." });
    }

    const betPwen = parseInt(pwen, 10);

    if (!betPwen || betPwen <= 0 || !location || !receiptId) {
      return res.status(400).json({ message: "Invalid pwen, missing location or receiptId" });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.points < betPwen) {
      return res.status(403).json({
        message: "Ou pa gen ase pwen.",
        required: betPwen,
        currentBalance: user.points,
        redirectTo: "/buy-credits",
      });
    }

    const remaining = await remainingFor(number, location);

    if (betPwen > remaining) {
      return res.status(400).json({
        message: `❌ Nimewo ${number} gen sèlman ${remaining} pwen ki rete.`,
        remaining,
      });
    }

    user.points -= betPwen;
    await user.save();

    const bet = await Katchif.create({ number, pwen: betPwen, location, receiptId, userId });

    return res.status(201).json({
      message: "Katchif soumèt avèk siksè",
      bet,
      newBalance: user.points,
      remaining: remaining - betPwen,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: errorMessage(err) });
  }
}

export async function getKatchifRemaining(req: Request, res: Response) {
  try {
    const number = queryString(req.query.number);
    const location = queryString(req.query.location);

    if (!number || !location) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    return res.json({ number, remaining: await remainingFor(number, location) });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching remaining", error: errorMessage(err) });
  }
}

export async function getMyKatchifBets(req: Request, res: Response) {
  try {
    const bets = await Katchif.findAll({ where: { userId: currentUser(req).id } });
    return res.json(bets);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateKatchif(req: Request, res: Response) {
  try {
    const { number, pwen, location } = req.body ?? {};

    const bet = await Katchif.findOne({ where: { id: req.params.id, userId: currentUser(req).id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    if (number && !/^\d{4}$/.test(number)) {
      return res.status(400).json({ message: "Number must be exactly 4 digits." });
    }

    bet.number = number;
    bet.pwen = pwen;
    bet.location = location;
    await bet.save();

    return res.json(bet);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function deleteKatchif(req: Request, res: Response) {
  try {
    const bet = await Katchif.findOne({ where: { id: req.params.id, userId: currentUser(req).id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    await bet.destroy();
    return res.json({ message: "Bet deleted" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}
