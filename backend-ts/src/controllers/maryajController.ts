import type { Request, Response } from "express";
import { currentUser } from "../middleware/authenticate";
import { Maryaj, User } from "../models";
import { errorMessage } from "../utils/errors";
import { queryString } from "../utils/http";

const MAX_MARYAJ_POINTS = 20;

/** Points still available for a pair at a location. Pairs are sorted so 56-46 == 46-56. */
async function remainingForPair(part1: string, part2: string, location: string) {
  const [p1, p2] = [part1, part2].sort();
  const totalPair = (await Maryaj.sum("pwen", { where: { part1: p1, part2: p2, location } })) || 0;
  return { p1, p2, remaining: Math.max(0, MAX_MARYAJ_POINTS - totalPair) };
}

export async function createMaryaj(req: Request, res: Response) {
  try {
    const { part1, part2, pwen, location, receiptId } = req.body ?? {};
    const userId = currentUser(req).id;

    if (!/^\d{2}$/.test(part1) || !/^\d{2}$/.test(part2)) {
      return res.status(400).json({ message: "Each part must be exactly 2 digits." });
    }

    const betPwen = parseInt(pwen, 10);

    if (!betPwen || betPwen <= 0 || !location || !receiptId) {
      return res.status(400).json({
        message: "Pwen must be a positive number, location and receiptId are required",
      });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.points < betPwen) {
      return res.status(403).json({
        message: "Ou pa gen ase pwen pou mete Maryaj la.",
        required: betPwen,
        currentBalance: user.points,
        redirectTo: "/buy-credits",
      });
    }

    const { p1, p2, remaining } = await remainingForPair(part1, part2, location);

    if (betPwen > remaining) {
      return res.status(400).json({
        message: `❌ Maryaj ${p1}-${p2} gen sèlman ${remaining} pwen ki rete.`,
        remaining,
      });
    }

    user.points -= betPwen;
    await user.save();

    const bet = await Maryaj.create({
      part1: p1,
      part2: p2,
      pwen: betPwen,
      location,
      receiptId,
      userId,
    });

    return res.status(201).json({
      message: "Maryaj soumèt avèk siksè",
      bet,
      newBalance: user.points,
      remaining: remaining - betPwen,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: errorMessage(err) });
  }
}

/** GET remaining points for a pair (used by the frontend). */
export async function getMaryajRemaining(req: Request, res: Response) {
  try {
    const part1 = queryString(req.query.part1);
    const part2 = queryString(req.query.part2);
    const location = queryString(req.query.location);

    if (!part1 || !part2 || !location) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    const { p1, p2, remaining } = await remainingForPair(part1, part2, location);
    return res.json({ pair: `${p1}-${p2}`, remaining });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching remaining", error: errorMessage(err) });
  }
}

export async function getMyMaryajBets(req: Request, res: Response) {
  try {
    const bets = await Maryaj.findAll({ where: { userId: currentUser(req).id } });
    return res.json(bets);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateMaryaj(req: Request, res: Response) {
  try {
    const { part1, part2, pwen, location } = req.body ?? {};

    const bet = await Maryaj.findOne({ where: { id: req.params.id, userId: currentUser(req).id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    bet.part1 = part1;
    bet.part2 = part2;
    bet.pwen = pwen;
    bet.location = location;
    await bet.save();

    return res.json(bet);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function deleteMaryaj(req: Request, res: Response) {
  try {
    const bet = await Maryaj.findOne({ where: { id: req.params.id, userId: currentUser(req).id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    await bet.destroy();
    return res.json({ message: "Bet deleted" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}
