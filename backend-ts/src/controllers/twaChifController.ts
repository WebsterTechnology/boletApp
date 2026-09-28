import type { Request, Response } from "express";
import { currentUser } from "../middleware/authenticate";
import { TwaChif, User } from "../models";
import { errorMessage } from "../utils/errors";
import { disabledBetMessage } from "../utils/betRestrictions";

export async function createTwaChif(req: Request, res: Response) {
  try {
    const { number, pwen, location, receiptId } = req.body ?? {};
    const userId = currentUser(req).id;

    if (!/^\d{3}$/.test(number)) {
      return res.status(400).json({ message: "Number must be exactly 3 digits." });
    }

    if (!pwen || !location || !receiptId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const restriction = disabledBetMessage(number, location);
    if (restriction) return res.status(400).json({ message: restriction });

    const betPwen = Number(pwen);
    if (!Number.isFinite(betPwen) || betPwen <= 0) {
      return res.status(400).json({ message: "Pwen must be a positive number" });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.points < betPwen) {
      return res.status(403).json({
        message: "Ou pa gen ase pwen pou mete parye a.",
        required: betPwen,
        currentBalance: user.points,
        redirectTo: "/buy-credits",
      });
    }

    user.points -= betPwen;
    await user.save();

    const bet = await TwaChif.create({ number, pwen: betPwen, location, receiptId, userId });

    return res.status(201).json({
      message: "Parye Twa Chif soumèt avèk siksè",
      bet,
      newBalance: user.points,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: errorMessage(err) });
  }
}

export async function getMyTwaChifBets(req: Request, res: Response) {
  try {
    const bets = await TwaChif.findAll({ where: { userId: currentUser(req).id } });
    return res.json(bets);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateTwaChif(req: Request, res: Response) {
  try {
    const { number, pwen, location } = req.body ?? {};

    const bet = await TwaChif.findOne({ where: { id: req.params.id, userId: currentUser(req).id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    const restriction = disabledBetMessage(number ?? bet.number, location ?? bet.location);
    if (restriction) return res.status(400).json({ message: restriction });

    bet.number = number;
    bet.pwen = pwen;
    bet.location = location;
    await bet.save();

    return res.json(bet);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function deleteTwaChif(req: Request, res: Response) {
  try {
    const bet = await TwaChif.findOne({ where: { id: req.params.id, userId: currentUser(req).id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    await bet.destroy();
    return res.json({ message: "Bet deleted" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}
