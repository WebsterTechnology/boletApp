import type { Request, Response } from "express";
import { currentUser } from "../middleware/authenticate";
import { User, YonChif } from "../models";
import { errorMessage } from "../utils/errors";
import { disabledBetMessage } from "../utils/betRestrictions";
import { INVALID_PWEN_MESSAGE, parsePwen, PWEN_LOCKED_MESSAGE, pwenChangeRejected } from "../utils/pwen";

export async function createYonChif(req: Request, res: Response) {
  try {
    const { number, pwen, location, receiptId } = req.body ?? {};
    const userId = currentUser(req).id;

    if (!number || number.length !== 1 || !pwen || !location || !receiptId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const betPwen = parsePwen(pwen);
    if (!betPwen) return res.status(400).json({ message: INVALID_PWEN_MESSAGE });

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

    const bet = await YonChif.create({ number, pwen: betPwen, location, receiptId, userId });

    return res.status(201).json({
      message: "Parye soumèt avèk siksè",
      bet,
      newBalance: user.points,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: errorMessage(err) });
  }
}

export async function getMyYonChifBets(req: Request, res: Response) {
  try {
    const bets = await YonChif.findAll({ where: { userId: currentUser(req).id } });
    return res.json(bets);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateYonChif(req: Request, res: Response) {
  try {
    const { number, pwen, location } = req.body ?? {};

    const bet = await YonChif.findOne({ where: { id: req.params.id, userId: currentUser(req).id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    if (pwenChangeRejected(pwen, bet.pwen)) {
      return res.status(400).json({ message: PWEN_LOCKED_MESSAGE });
    }

    const restriction = disabledBetMessage(number ?? bet.number, location ?? bet.location);
    if (restriction) return res.status(400).json({ message: restriction });

    bet.number = number;
    bet.location = location;
    await bet.save();

    return res.json(bet);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function deleteYonChif(req: Request, res: Response) {
  try {
    const bet = await YonChif.findOne({ where: { id: req.params.id, userId: currentUser(req).id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    await bet.destroy();
    return res.json({ message: "Bet deleted" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}
