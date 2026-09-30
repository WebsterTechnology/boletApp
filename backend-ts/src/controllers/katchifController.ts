import type { Request, Response } from "express";
import { currentUser } from "../middleware/authenticate";
import { Katchif } from "../models";
import { errorMessage } from "../utils/errors";
import { createBetWithPoints, InsufficientPointsError } from "../utils/betTransaction";
import { disabledBetMessage } from "../utils/betRestrictions";
import { parsePwen, PWEN_LOCKED_MESSAGE, pwenChangeRejected } from "../utils/pwen";
import { queryString } from "../utils/http";

const MAX_KATCHIF_POINTS = 20;

/** Points still available for this exact number + location. */
async function remainingFor(number: string, location: string, transaction?: any) {
  const total = (await Katchif.sum("pwen", { where: { number, location }, transaction })) || 0;
  return Math.max(0, MAX_KATCHIF_POINTS - total);
}

export async function createKatchif(req: Request, res: Response) {
  try {
    const { number, pwen, location, receiptId } = req.body ?? {};
    const userId = currentUser(req).id;

    if (!/^\d{4}$/.test(number)) {
      return res.status(400).json({ message: "Number must be exactly 4 digits." });
    }

    const betPwen = parsePwen(pwen);

    if (!betPwen || !location || !receiptId) {
      return res.status(400).json({ message: "Invalid pwen, missing location or receiptId" });
    }

    const restriction = disabledBetMessage(number, location);
    if (restriction) return res.status(400).json({ message: restriction });

    let remaining = 0;
    const { user, bet } = await createBetWithPoints(
      userId,
      betPwen,
      Katchif,
      { number, location, receiptId },
      async (transaction) => {
        remaining = await remainingFor(number, location, transaction);
        if (betPwen > remaining) {
          const error = new Error("KATCHIF_LIMIT");
          (error as any).remaining = remaining;
          throw error;
        }
      }
    );

    return res.status(201).json({
      message: "Katchif soumèt avèk siksè",
      bet,
      newBalance: user.points,
      remaining: remaining - betPwen,
    });
  } catch (err) {
    if (err instanceof InsufficientPointsError) return res.status(403).json({ message: "Ou pa gen ase pwen.", required: err.required, currentBalance: err.currentBalance, redirectTo: "/buy-credits" });
    if (err instanceof Error && err.message === "USER_NOT_FOUND") return res.status(404).json({ message: "User not found" });
    if (err instanceof Error && err.message === "KATCHIF_LIMIT") {
      const remaining = (err as any).remaining ?? 0;
      return res.status(400).json({ message: `❌ Nimewo ${number} gen sèlman ${remaining} pwen ki rete.`, remaining });
    }
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
