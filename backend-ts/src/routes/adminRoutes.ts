import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import type { WhereOptions } from "sequelize";
import { adminOnly } from "../middleware/adminOnly";
import { authenticate } from "../middleware/authenticate";
import { PixPayment, sequelize, User, WinClaim } from "../models";
import { PIX_STATUSES, type PixStatus } from "../models/payments";
import { queryString } from "../utils/http";

const router = Router();

// Note: ../backend also defines GET /bets here, but it is unreachable because
// /api/admin/bets is mounted first (adminBetsRoutes). It is not ported.

/* =========================================================
   USERS
========================================================= */
router.get("/users", authenticate, adminOnly, async (_req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        "id", "phone", "points", "isAdmin", "fullName", "cpf",
        "birthDate", "email", "address", "city", "state", "cep",
      ],
      order: [["id", "ASC"]],
    });
    return res.json(users);
  } catch (err) {
    console.error("admin GET /users error:", err);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.post("/users/:id/add-pwen", authenticate, adminOnly, async (req, res) => {
  const toAdd = parseInt(req.body?.amount, 10);
  if (!toAdd || Number.isNaN(toAdd)) {
    return res.status(400).json({ message: "Amount is required and must be a number" });
  }
  try {
    const user = await User.findByPk(String(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });

    user.points += toAdd;
    await user.save();

    return res.json({ message: `Added ${toAdd} pwen to ${user.phone}`, user });
  } catch (err) {
    console.error("admin POST /users/:id/add-pwen error:", err);
    return res.status(500).json({ message: "Error adding pwen" });
  }
});

router.patch("/users/:id/admin-status", authenticate, adminOnly, async (req, res) => {
  const targetId = Number(req.params.id);
  const { isAdmin } = req.body ?? {};

  if (typeof isAdmin !== "boolean") {
    return res.status(400).json({ message: "isAdmin must be a boolean" });
  }

  try {
    const user = await User.findByPk(targetId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!isAdmin && user.isAdmin) {
      const adminCount = await User.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        return res.status(400).json({ message: "Cannot remove the last administrator." });
      }
    }

    user.isAdmin = isAdmin;
    await user.save();

    return res.json({
      message: isAdmin ? "User promoted to admin" : "Admin access removed",
      user: {
        id: user.id,
        phone: user.phone,
        points: Number(user.points ?? 0),
        isAdmin: !!user.isAdmin,
      },
    });
  } catch (err) {
    console.error("admin PATCH /users/:id/admin-status error:", err);
    return res.status(500).json({ message: "Failed to update admin status" });
  }
});

router.post("/users/:id/remove-pwen", authenticate, adminOnly, async (req, res) => {
  const toRemove = parseInt(req.body?.amount, 10);
  if (!toRemove || Number.isNaN(toRemove)) {
    return res.status(400).json({ message: "Amount is required and must be a number" });
  }

  try {
    const user = await User.findByPk(String(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.points < toRemove) {
      return res.status(400).json({ message: "User does not have enough points" });
    }

    user.points -= toRemove;
    await user.save();

    return res.json({ message: `Removed ${toRemove} pwen from ${user.phone}`, user });
  } catch (err) {
    console.error("admin POST /users/:id/remove-pwen error:", err);
    return res.status(500).json({ message: "Error removing pwen" });
  }
});

/* =========================================================
   PIX PAYMENTS
========================================================= */
const isPixStatus = (s: string): s is PixStatus => (PIX_STATUSES as readonly string[]).includes(s);

router.get("/payments", authenticate, adminOnly, async (req, res) => {
  try {
    const status = (queryString(req.query.status) || "paid").toLowerCase();
    const userId = queryString(req.query.userId);

    const where: WhereOptions<PixPayment> = {};
    if (isPixStatus(status)) where.status = status;
    if (userId) where.userId = Number(userId);

    const rows = await PixPayment.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [{ model: User, attributes: ["id", "phone", "points"] }],
    });

    return res.json(
      rows.map((p) => ({
        id: p.id,
        userId: p.userId,
        phone: p.User?.phone,
        providerRef: p.providerRef,
        amountBRL: p.amountBRL,
        netValueBRL: p.netValueBRL,
        feeBRL: p.feeBRL,
        points: p.points,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }))
    );
  } catch (err) {
    console.error("admin GET /payments error:", err);
    return res.status(500).json({ message: "Failed to fetch payments" });
  }
});

router.post("/payments/:id/credit", authenticate, adminOnly, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const pay = await PixPayment.findByPk(String(req.params.id), { transaction: t, lock: t.LOCK.UPDATE });
    if (!pay) {
      await t.rollback();
      return res.status(404).json({ message: "Payment not found" });
    }
    if (pay.status === "credited") {
      await t.commit();
      return res.json({ message: "Already credited", payment: pay });
    }
    if (pay.status !== "paid") {
      await t.rollback();
      return res.status(400).json({ message: `Cannot credit payment in status ${pay.status}` });
    }

    const user = await User.findByPk(pay.userId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found for this payment" });
    }

    user.points += Number(pay.points);
    await user.save({ transaction: t });

    pay.status = "credited";
    await pay.save({ transaction: t });

    await t.commit();
    return res.json({ message: `Credited +${pay.points} P to ${user.phone}`, payment: pay, user });
  } catch (err) {
    await t.rollback();
    console.error("admin POST /payments/:id/credit error:", err);
    return res.status(500).json({ message: "Failed to credit payment" });
  }
});

/* =========================================================
   WIN CLAIMS
========================================================= */
router.get("/claims", authenticate, adminOnly, async (req, res) => {
  try {
    const status = queryString(req.query.status);
    const where: WhereOptions = {};
    if (status) where.status = status.toLowerCase();

    const rows = await WinClaim.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [{ model: User, attributes: ["id", "phone", "points"] }],
    });

    return res.json(
      rows.map((c) => {
        // ../backend reads winAmount / payoutMethod / note, which are not WinClaim columns
        // (the real ones are pwen / method / notes). Same output kept for compatibility.
        const legacy = c as WinClaim & { winAmount?: number; payoutMethod?: string; note?: string };
        return {
          id: c.id,
          userId: c.userId,
          phone: c.User?.phone,
          betType: c.betType,
          betId: c.betId,
          winAmount: Number(legacy.winAmount || 0),
          payoutMethod: legacy.payoutMethod,
          pixKey: c.pixKey || null,
          status: c.status,
          note: legacy.note || null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      })
    );
  } catch (err) {
    console.error("admin GET /claims error:", err);
    return res.status(500).json({ message: "Failed to fetch claims" });
  }
});

/* =========================================================
   DISABLE NUMBERS & LOCATIONS (admin control)
   Stored as JSON files in backend-ts/data (resolves from both src/ and dist/).
========================================================= */
const dataDir = path.resolve(__dirname, "..", "..", "data");
const numbersPath = path.join(dataDir, "disabledNumbers.json");
const locationsPath = path.join(dataDir, "disabledLocations.json");

function ensureFiles() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(numbersPath)) fs.writeFileSync(numbersPath, JSON.stringify([]));
  if (!fs.existsSync(locationsPath)) fs.writeFileSync(locationsPath, JSON.stringify([]));
}
ensureFiles();

function readJSON(file: string): unknown[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveJSON(file: string, data: unknown[]) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* ---- Numbers ---- */
router.get("/disabled-numbers", authenticate, adminOnly, (_req, res) => {
  res.json(readJSON(numbersPath));
});

router.post("/disabled-numbers", authenticate, adminOnly, (req, res) => {
  const { numbers } = req.body ?? {};
  if (!Array.isArray(numbers)) {
    return res.status(400).json({ message: "numbers must be an array" });
  }
  const clean = [...new Set(numbers.map((n: unknown) => String(n).trim()))];
  saveJSON(numbersPath, clean);
  return res.json({ message: "Disabled numbers updated", disabledNumbers: clean });
});

/* ---- Locations ---- */
router.get("/disabled-locations", authenticate, adminOnly, (_req, res) => {
  res.json(readJSON(locationsPath));
});

router.post("/disabled-locations", authenticate, adminOnly, (req, res) => {
  const { locations } = req.body ?? {};
  if (!Array.isArray(locations)) {
    return res.status(400).json({ message: "locations must be an array" });
  }
  const clean = [...new Set(locations.map((l: unknown) => String(l).trim()))];
  saveJSON(locationsPath, clean);
  return res.json({ message: "Disabled locations updated", disabledLocations: clean });
});

/* ---- Public (player) routes ---- */
router.get("/public-disabled-numbers", (_req, res) => {
  res.json(readJSON(numbersPath));
});

router.get("/public-disabled-locations", (_req, res) => {
  res.json(readJSON(locationsPath));
});

export default router;
