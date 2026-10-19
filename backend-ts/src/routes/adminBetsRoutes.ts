import { Router } from "express";
import { QueryTypes, type WhereOptions } from "sequelize";
import { adminOnly } from "../middleware/adminOnly";
import { authenticate } from "../middleware/authenticate";
import { DeChif, Katchif, Maryaj, TwaChif, User, YonChif, sequelize } from "../models";
import { BET_STATUSES, type AnyBet, type BetStatus } from "../models/bets";
import { queryString } from "../utils/http";

const router = Router();

const BET_MODELS = {
  yonchif: YonChif,
  dechif: DeChif,
  twachif: TwaChif,
  maryaj: Maryaj,
  katchif: Katchif,
} as const;
type BetType = keyof typeof BET_MODELS;

const allowedStatuses = new Set<string>(BET_STATUSES);
const isBetStatus = (s: string): s is BetStatus => allowedStatuses.has(s);
const isBetType = (s: string): s is BetType => Object.hasOwn(BET_MODELS, s);

const mapRow = (type: BetType, bet: AnyBet) => {
  const r = bet as unknown as Record<string, any>;
  return {
    id: r.id,
    type,
    userId: r.userId,
    receiptId: r.receiptId,
    // The User model has no `name` column, so this is always undefined (as in ../backend).
    customerName: r.User?.name,
    phone: r.User?.phone,
    numbers:
      type === "yonchif"
        ? (r.nimewo ?? r.number)
        : type === "twachif"
          ? (r.number ?? r.twachif)
          : type === "maryaj"
            ? r.part1 && r.part2
              ? `${r.part1}${r.part2}`
              : "-"
            : r.number,
    pwen: Number(r.pwen || 0),
    draw: r.ville ?? r.city ?? r.lokal ?? r.location ?? null,
    status: r.status || "pending",
    createdAt: r.createdAt,
  };
};

/* -------- GET /api/admin/bets -------- */
router.get("/", authenticate, adminOnly, async (req, res) => {
  try {
    const type = (queryString(req.query.type) || "all").toLowerCase();
    const status = (queryString(req.query.status) || "all").toLowerCase();
    const q = (queryString(req.query.q) || "").toLowerCase();

    const where: WhereOptions = {};
    if (status !== "all" && isBetStatus(status)) where.status = status;

    const include = [{ model: User, attributes: ["id", "phone"] }];

    const types = (Object.keys(BET_MODELS) as BetType[]).filter((t) => type === "all" || type === t);
    const results = await Promise.all(
      types.map(async (t) => {
        const rows: AnyBet[] = await (BET_MODELS[t] as typeof YonChif).findAll({ where, include });
        return rows.map((row) => mapRow(t, row));
      })
    );

    const archived = await sequelize.query<{ receiptId: string }>(
      'SELECT "receiptId" FROM "admin_archived_receipts"', { type: QueryTypes.SELECT },
    );
    const archivedIds = new Set(archived.map(row => row.receiptId));
    let items = results.flat().filter(item => !item.receiptId || !archivedIds.has(item.receiptId));

    if (q) {
      items = items.filter((it) =>
        `${it.phone ?? ""} ${it.numbers ?? ""} ${it.type ?? ""} ${it.status ?? ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ items, total: items.length });
  } catch (err) {
    console.error("admin GET /bets error:", err);
    return res.status(500).json({ message: "Failed to fetch bets" });
  }
});

/* -------- DELETE /api/admin/bets/receipts/:receiptId --------
 * Archive from the admin list; retain original bets, stakes and payout records.
 * Paid/won receipts cannot be archived, preventing financial-history concealment.
 */
router.delete("/receipts/:receiptId", authenticate, adminOnly, async (req, res) => {
  const receiptId = String(req.params.receiptId || "").trim();
  if (!receiptId || receiptId.length > 255 || receiptId.startsWith("old-")) {
    return res.status(400).json({ message: "Invalid receipt ID" });
  }
  try {
    const result = await sequelize.transaction(async transaction => {
      const archived = await sequelize.query<{ receiptId: string }>(
        'SELECT "receiptId" FROM "admin_archived_receipts" WHERE "receiptId" = :receiptId',
        { replacements: { receiptId }, type: QueryTypes.SELECT, transaction },
      );
      if (archived.length) return { status: 204 };
      const groups = await Promise.all(
        (Object.values(BET_MODELS) as (typeof YonChif)[]).map(model =>
          model.findAll({ where: { receiptId }, transaction, lock: transaction.LOCK.UPDATE }),
        ),
      );
      const bets = groups.flat();
      if (!bets.length) return { status: 404, message: "Receipt not found" };
      if (bets.some(bet => bet.status !== "pending" && bet.status !== "lost")) {
        return { status: 409, message: "Only pending or lost receipts can be archived" };
      }
      await sequelize.query(
        'INSERT INTO "admin_archived_receipts" ("receiptId", "archivedAt") VALUES (:receiptId, NOW()) ON CONFLICT ("receiptId") DO NOTHING',
        { replacements: { receiptId }, transaction },
      );
      return { status: 204 };
    });
    return result.status === 204 ? res.status(204).send() : res.status(result.status).json({ message: result.message });
  } catch (err) {
    console.error("admin DELETE /bets/receipts/:receiptId error:", err);
    return res.status(500).json({ message: "Unable to archive receipt" });
  }
});

/* -------- PATCH /api/admin/bets/:type/:id/status -------- */
router.patch("/:type/:id/status", authenticate, adminOnly, async (req, res) => {
  try {
    const type = String(req.params.type);
    const id = String(req.params.id);
    const status = String(req.body?.status || "").toLowerCase();

    if (!isBetStatus(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    if (!isBetType(type)) {
      return res.status(400).json({ message: "Invalid bet type" });
    }

    const bet: AnyBet | null = await (BET_MODELS[type] as typeof YonChif).findByPk(id);
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    bet.status = status;
    await bet.save();

    return res.json({ message: "Bet updated", id, type, status });
  } catch (err) {
    console.error("admin PATCH status error:", err);
    return res.status(500).json({ message: "Failed to update bet" });
  }
});

export default router;
