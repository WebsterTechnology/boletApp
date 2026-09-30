import type { Request, Response } from "express";
import { currentUser } from "../middleware/authenticate";
import { DeChif, User } from "../models";
import { errorMessage } from "../utils/errors";
import { disabledBetMessage } from "../utils/betRestrictions";
import { INVALID_PWEN_MESSAGE, parsePwen, PWEN_LOCKED_MESSAGE, pwenChangeRejected } from "../utils/pwen";

export async function createDeChif(req: Request, res: Response) {
  try {
    const { number, pwen, location, receiptId } = req.body ?? {};
    const userId = currentUser(req).id;

    // Exactly 2 digits
    if (!number || !/^\d{2}$/.test(number) || !pwen || !location || !receiptId) {
      return res.status(400).json({
        message: "All fields are required and number must be exactly 2 digits (00–99)",
      });
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

    const bet = await DeChif.create({ number, pwen: betPwen, location, receiptId, userId });

    return res.status(201).json({
      message: "Parye DeChif soumèt avèk siksè",
      bet,
      newBalance: user.points,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: errorMessage(err) });
  }
}

export async function getMyDeChifBets(req: Request, res: Response) {
  try {
    const bets = await DeChif.findAll({
      where: { userId: currentUser(req).id },
      order: [["createdAt", "DESC"]],
    });
    return res.json(bets);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateDeChif(req: Request, res: Response) {
  try {
    const { number, pwen, location } = req.body ?? {};

    if (number && !/^\d{2}$/.test(number)) {
      return res.status(400).json({ message: "Number must be exactly 2 digits (00–99)" });
    }

    const bet = await DeChif.findOne({ where: { id: req.params.id, userId: currentUser(req).id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    if (pwenChangeRejected(pwen, bet.pwen)) {
      return res.status(400).json({ message: PWEN_LOCKED_MESSAGE });
    }

    const restriction = disabledBetMessage(number ?? bet.number, location ?? bet.location);
    if (restriction) return res.status(400).json({ message: restriction });

    bet.number = number ?? bet.number;
    bet.location = location ?? bet.location;
    await bet.save();

    return res.json(bet);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function deleteDeChif(req: Request, res: Response) {
  try {
    const bet = await DeChif.findOne({ where: { id: req.params.id, userId: currentUser(req).id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    await bet.destroy();
    return res.json({ message: "DeChif bet deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}
