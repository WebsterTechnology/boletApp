
const express = require("express");
const router = express.Router();
const axios = require("axios");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

const {
  User,
  PixPayment,
  YonChif,
  Maryaj,
  TwaChif,
  WinClaim,
} = require("../models");

const authenticate = require("../middleware/authenticate");
const adminOnly = require("../middleware/adminOnly");

/* -------------------- ASAAS base URL -------------------- */
const ASAAS_BASE_URL =
  process.env.ASAAS_BASE_URL ||
  (process.env.ASAAS_ENV === "production"
    ? "https://www.asaas.com/api/v3"
    : "https://sandbox.asaas.com/api/v3");

/* -------------------- Associations (safety) -------------- */
if (!PixPayment.associations?.User) PixPayment.belongsTo(User, { foreignKey: "userId" });
if (!YonChif.associations?.User) YonChif.belongsTo(User, { foreignKey: "userId" });
if (!Maryaj.associations?.User) Maryaj.belongsTo(User, { foreignKey: "userId" });
if (!TwaChif.associations?.User) TwaChif.belongsTo(User, { foreignKey: "userId" });
if (WinClaim && !WinClaim.associations?.User) WinClaim.belongsTo(User, { foreignKey: "userId" });

/* =========================================================
   USERS
========================================================= */
router.get("/users", authenticate, adminOnly, async (_req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "phone", "points", "isAdmin"],
      order: [["id", "ASC"]],
    });
    res.json(users);
  } catch (err) {
    console.error("admin GET /users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.post("/users/:id/add-pwen", authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const toAdd = parseInt(req.body.amount, 10);
  if (!toAdd || Number.isNaN(toAdd)) {
    return res.status(400).json({ message: "Amount is required and must be a number" });
  }
  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.points += toAdd;
    await user.save();

    res.json({ message: `Added ${toAdd} pwen to ${user.phone}`, user });
  } catch (err) {
    console.error("admin POST /users/:id/add-pwen error:", err);
    res.status(500).json({ message: "Error adding pwen" });
  }
});

router.post("/users/:id/remove-pwen", authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const toRemove = parseInt(req.body.amount, 10);

  if (!toRemove || Number.isNaN(toRemove)) {
    return res.status(400).json({ message: "Amount is required and must be a number" });
  }

  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.points < toRemove) {
      return res.status(400).json({ message: "User does not have enough points" });
    }

    user.points -= toRemove;
    await user.save();

    res.json({ message: `Removed ${toRemove} pwen from ${user.phone}`, user });
  } catch (err) {
    console.error("admin POST /users/:id/remove-pwen error:", err);
    res.status(500).json({ message: "Error removing pwen" });
  }
});


/* =========================================================
   PIX PAYMENTS
========================================================= */
router.get("/payments", authenticate, adminOnly, async (req, res) => {
  try {
    const allowed = ["created", "pending", "paid", "credited", "failed", "expired"];
    const status = (req.query.status || "paid").toLowerCase();

    const where = {};
    if (allowed.includes(status)) where.status = status;
    if (req.query.userId) where.userId = req.query.userId;

    const rows = await PixPayment.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [{ model: User, attributes: ["id", "phone", "points"] }],
    });

    const data = rows.map((p) => ({
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
    }));

    res.json(data);
  } catch (e) {
    console.error("admin GET /payments error:", e);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

router.post("/payments/:id/credit", authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;

  const t = await User.sequelize.transaction();
  try {
    const pay = await PixPayment.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
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

    user.points += parseInt(pay.points, 10);
    await user.save({ transaction: t });

    pay.status = "credited";
    await pay.save({ transaction: t });

    await t.commit();
    res.json({ message: `Credited +${pay.points} P to ${user.phone}`, payment: pay, user });
  } catch (e) {
    await t.rollback();
    console.error("admin POST /payments/:id/credit error:", e);
    res.status(500).json({ message: "Failed to credit payment" });
  }
});

/* =========================================================
   BETS (yonchif / maryaj / twachif)
========================================================= */
router.get("/bets", authenticate, adminOnly, async (req, res) => {
  try {
    const TYPES = {
      yonchif: { Model: YonChif, kind: "yonchif" },
      maryaj: { Model: Maryaj, kind: "maryaj" },
      twachif: { Model: TwaChif, kind: "twachif" },
    };

    const { type, status } = req.query;
    const selected = type && TYPES[type] ? { [type]: TYPES[type] } : TYPES;

    const where = {};
    if (status) where.status = status.toLowerCase();

    const out = [];

    for (const [t, cfg] of Object.entries(selected)) {
      const rows = await cfg.Model.findAll({
        where,
        order: [["createdAt", "DESC"]],
        include: [{ model: User, attributes: ["id", "phone"] }],
      });

      for (const r of rows) {
        let numbers = "-";
        if (t === "yonchif" || t === "twachif") numbers = r.number ?? "-";
        if (t === "maryaj") numbers = [r.part1, r.part2].filter(Boolean).join("-") || "-";

        out.push({
          id: r.id,
          type: t,
          userId: r.userId,
          phone: r.User?.phone,
          numbers,
          pwen: Number(r.pwen || 0),
          draw: r.location || null,
          status: (r.status || "pending").toLowerCase(),
          createdAt: r.createdAt,
        });
      }
    }

    res.json(out);
  } catch (e) {
    console.error("admin GET /bets error:", e);
    res.status(500).json({ message: "Failed to fetch bets" });
  }
});

/* =========================================================
   WIN CLAIMS
========================================================= */
router.get("/claims", authenticate, adminOnly, async (req, res) => {
  try {
    if (!WinClaim) return res.json([]);
    const where = {};
    if (req.query.status) where.status = String(req.query.status).toLowerCase();

    const rows = await WinClaim.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [{ model: User, attributes: ["id", "phone", "points"] }],
    });

    const data = rows.map((c) => ({
      id: c.id,
      userId: c.userId,
      phone: c.User?.phone,
      betType: c.betType,
      betId: c.betId,
      winAmount: Number(c.winAmount || 0),
      payoutMethod: c.payoutMethod,
      pixKey: c.pixKey || null,
      status: c.status,
      note: c.note || null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json(data);
  } catch (e) {
    console.error("admin GET /claims error:", e);
    res.status(500).json({ message: "Failed to fetch claims" });
  }
});

/* =========================================================
   DISABLE NUMBERS & LOCATIONS (Admin Control)
========================================================= */
const dataDir = path.join(__dirname, "../data");
const numbersPath = path.join(dataDir, "disabledNumbers.json");
const locationsPath = path.join(dataDir, "disabledLocations.json");

function ensureFiles() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(numbersPath)) fs.writeFileSync(numbersPath, JSON.stringify([]));
  if (!fs.existsSync(locationsPath)) fs.writeFileSync(locationsPath, JSON.stringify([]));
}
ensureFiles();

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* ---- Numbers ---- */
router.get("/disabled-numbers", authenticate, adminOnly, (_req, res) => {
  res.json(readJSON(numbersPath));
});
router.post("/disabled-numbers", authenticate, adminOnly, (req, res) => {
  const { numbers } = req.body;
  if (!Array.isArray(numbers)) {
    return res.status(400).json({ message: "numbers must be an array" });
  }
  const clean = [...new Set(numbers.map((n) => String(n).trim()))];
  saveJSON(numbersPath, clean);
  res.json({ message: "Disabled numbers updated", disabledNumbers: clean });
});

/* ---- Locations ---- */
router.get("/disabled-locations", authenticate, adminOnly, (_req, res) => {
  res.json(readJSON(locationsPath));
});
router.post("/disabled-locations", authenticate, adminOnly, (req, res) => {
  const { locations } = req.body;
  if (!Array.isArray(locations)) {
    return res.status(400).json({ message: "locations must be an array" });
  }
  const clean = [...new Set(locations.map((l) => l.trim()))];
  saveJSON(locationsPath, clean);
  res.json({ message: "Disabled locations updated", disabledLocations: clean });
});

/* ---- Public (player) routes ---- */
router.get("/public-disabled-numbers", (_req, res) => {
  res.json(readJSON(numbersPath));
});
router.get("/public-disabled-locations", (_req, res) => {
  res.json(readJSON(locationsPath));
});

module.exports = router;
