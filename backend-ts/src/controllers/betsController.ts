import type { Request, Response } from "express";
import { currentUser } from "../middleware/authenticate";
import { DeChif, Katchif, Maryaj, TwaChif, YonChif } from "../models";

type RawBet = Record<string, any>;

interface BetItem {
  id: number;
  receiptId: string;
  type: "yonchif" | "dechif" | "twachif" | "maryaj" | "katchif";
  numbers: string;
  part1?: string;
  part2?: string;
  pwen: number;
  draw: string | null;
  status: string;
  createdAt: Date;
}

/** Legacy rows used a few different column names for the draw location. */
const drawOf = (b: RawBet): string | null => b.ville ?? b.city ?? b.lokal ?? b.location ?? null;

const sumPwen = (rows: RawBet[]) => rows.reduce((s, b) => s + Number(b.pwen || 0), 0);

export async function getAllMyBets(req: Request, res: Response) {
  try {
    const userId = currentUser(req).id;
    // raw: true gives plain objects
    const opts = { where: { userId }, order: [["createdAt", "DESC"]] as [string, string][], raw: true };

    const [yonchif, dechif, twachif, maryaj, katchif] = (await Promise.all([
      YonChif.findAll(opts),
      DeChif.findAll(opts),
      TwaChif.findAll(opts),
      Maryaj.findAll(opts),
      Katchif.findAll(opts),
    ])) as unknown as RawBet[][];

    const totalPwen =
      sumPwen(yonchif) + sumPwen(dechif) + sumPwen(twachif) + sumPwen(maryaj) + sumPwen(katchif);

    const base = (b: RawBet) => ({
      id: b.id,
      receiptId: b.receiptId,
      pwen: Number(b.pwen || 0),
      status: b.status || "pending",
      createdAt: b.createdAt,
    });

    const items: BetItem[] = [
      ...yonchif.map((b) => ({
        ...base(b),
        type: "yonchif" as const,
        numbers: b.nimewo || b.number || b.numbers || "-",
        draw: drawOf(b),
      })),
      ...dechif.map((b) => ({
        ...base(b),
        type: "dechif" as const,
        numbers: b.number || b.nimewo || "-",
        draw: drawOf(b),
      })),
      ...twachif.map((b) => ({
        ...base(b),
        type: "twachif" as const,
        numbers: b.number || b.nimewo || "-",
        draw: drawOf(b),
      })),
      ...maryaj.map((b) => ({
        ...base(b),
        type: "maryaj" as const,
        part1: b.part1 || "-",
        part2: b.part2 || "-",
        numbers: b.part1 && b.part2 ? `${b.part1}${b.part2}` : "-",
        draw: drawOf(b),
      })),
      ...katchif.map((b) => ({
        ...base(b),
        type: "katchif" as const,
        numbers: b.number || b.numbers || "-",
        draw: b.location,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ items, totalPwen });
  } catch (err) {
    console.error("Bet fetch error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
