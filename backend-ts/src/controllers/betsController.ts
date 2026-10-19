import type { Request, Response } from "express";
import { QueryTypes } from "sequelize";
import { currentUser } from "../middleware/authenticate";
import { DeChif, Katchif, Maryaj, TwaChif, YonChif, sequelize } from "../models";

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

    // An admin archive hides the whole receipt from every customer-facing bet view.
    // Original bets stay in the database for reconciliation and financial audit.
    const archived = await sequelize.query<{ receiptId: string }>(
      'SELECT "receiptId" FROM "admin_archived_receipts"',
      { type: QueryTypes.SELECT },
    );
    const archivedIds = new Set(archived.map(row => row.receiptId));
    const visible = (rows: RawBet[]) => rows.filter(b => !b.receiptId || !archivedIds.has(b.receiptId));
    const [visibleYonchif, visibleDechif, visibleTwachif, visibleMaryaj, visibleKatchif] =
      [yonchif, dechif, twachif, maryaj, katchif].map(visible);

    const totalPwen =
      sumPwen(visibleYonchif) + sumPwen(visibleDechif) + sumPwen(visibleTwachif) + sumPwen(visibleMaryaj) + sumPwen(visibleKatchif);

    const base = (b: RawBet) => ({
      id: b.id,
      receiptId: b.receiptId,
      pwen: Number(b.pwen || 0),
      status: b.status || "pending",
      createdAt: b.createdAt,
    });

    const items: BetItem[] = [
      ...visibleYonchif.map((b) => ({
        ...base(b),
        type: "yonchif" as const,
        numbers: b.nimewo || b.number || b.numbers || "-",
        draw: drawOf(b),
      })),
      ...visibleDechif.map((b) => ({
        ...base(b),
        type: "dechif" as const,
        numbers: b.number || b.nimewo || "-",
        draw: drawOf(b),
      })),
      ...visibleTwachif.map((b) => ({
        ...base(b),
        type: "twachif" as const,
        numbers: b.number || b.nimewo || "-",
        draw: drawOf(b),
      })),
      ...visibleMaryaj.map((b) => ({
        ...base(b),
        type: "maryaj" as const,
        part1: b.part1 || "-",
        part2: b.part2 || "-",
        numbers: b.part1 && b.part2 ? `${b.part1}${b.part2}` : "-",
        draw: drawOf(b),
      })),
      ...visibleKatchif.map((b) => ({
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
