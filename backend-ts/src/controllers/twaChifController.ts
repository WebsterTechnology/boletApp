import type { Request, Response } from "express";
import { currentUser } from "../middleware/authenticate";
import { TwaChif } from "../models";
import { errorMessage } from "../utils/errors";
import { createBetWithPoints, InsufficientPointsError } from "../utils/betTransaction";
import { disabledBetMessage } from "../utils/betRestrictions";
import { INVALID_PWEN_MESSAGE, parsePwen, PWEN_LOCKED_MESSAGE, pwenChangeRejected } from "../utils/pwen";

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

    const betPwen = parsePwen(pwen);
    if (!betPwen) return res.status(400).json({ message: INVALID_PWEN_MESSAGE });

    const restriction = disabledBetMessage(number, location);
    if (restriction) return res.status(400).json({ message: restriction });

    const { user, bet } = await createBetWithPoints(userId, betPwen, TwaChif, {
      number, location, receiptId,
    });

    return res.status(201).json({
      message: "Parye Twa Chif soumèt avèk siksè",
      bet,
      newBalance: user.points,
    });
  } catch (err) {
    if (err instanceof InsufficientPointsError) {
      return res.status(403).json({
        message: "Ou pa gen ase pwen pou mete parye a.",
        required: err.required,
        currentBalance: err.currentBalance,
        redirectTo: "/buy-credits",
      });
    }
    if (err instanceof Error && err.message === "USER_NOT_FOUND") return res.status(404).json({ message: "User not found" });
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
