// routes/adminBetsRoutes.js
const express = require("express");
const router = express.Router();

const {
  User,
  YonChif,
  DeChif,
  TwaChif,
  Maryaj,
  Katchif,
} = require("../models");

const authenticate = require("../middleware/authenticate");
const adminOnly = require("../middleware/adminOnly");

/* -------- associations -------- */
if (YonChif && !YonChif.associations?.User) YonChif.belongsTo(User, { foreignKey: "userId" });
if (DeChif && !DeChif.associations?.User) DeChif.belongsTo(User, { foreignKey: "userId" });
if (TwaChif && !TwaChif.associations?.User) TwaChif.belongsTo(User, { foreignKey: "userId" });
if (Maryaj && !Maryaj.associations?.User) Maryaj.belongsTo(User, { foreignKey: "userId" });
if (Katchif && !Katchif.associations?.User) Katchif.belongsTo(User, { foreignKey: "userId" });

/* -------- helpers -------- */
const mapRow = (type, r) => ({
  id: r.id,
  type,
  userId: r.userId,
  phone: r.User?.phone,
  numbers:
    type === "yonchif" ? (r.nimewo ?? r.number)
    : type === "dechif" ? (r.number)
    : type === "twachif" ? (r.number ?? r.twachif)
    : type === "maryaj" ? (r.maryaj)
    : /* katchif */       (r.number),
  pwen: Number(r.pwen || 0),
  draw: r.ville ?? r.city ?? r.lokal ?? null,
  status: r.status || "pending",
  createdAt: r.createdAt,
});

const allowedStatuses = new Set([
  "pending",
  "won",
  "lost",
  "paid",
  "void",
  "cancelled",
]);

/* -------- GET /api/admin/bets -------- */
router.get("/", authenticate, adminOnly, async (req, res) => {
  try {
    const type = (req.query.type || "all").toLowerCase();
    const status = (req.query.status || "all").toLowerCase();
    const q = (req.query.q || "").toLowerCase();

    const where = {};
    if (status !== "all" && allowedStatuses.has(status)) {
      where.status = status;
    }

    const include = [{ model: User, attributes: ["id", "phone"] }];
    const tasks = [];

    if (type === "all" || type === "yonchif")
      tasks.push(YonChif.findAll({ where, include }).then(r => r.map(x => mapRow("yonchif", x))));
    if (type === "all" || type === "dechif")
      tasks.push(DeChif.findAll({ where, include }).then(r => r.map(x => mapRow("dechif", x))));
    if (type === "all" || type === "twachif")
      tasks.push(TwaChif.findAll({ where, include }).then(r => r.map(x => mapRow("twachif", x))));
    if (type === "all" || type === "maryaj")
      tasks.push(Maryaj.findAll({ where, include }).then(r => r.map(x => mapRow("maryaj", x))));
    if (type === "all" || type === "katchif")
      tasks.push(Katchif.findAll({ where, include }).then(r => r.map(x => mapRow("katchif", x))));

    let items = (await Promise.all(tasks)).flat();

    if (q) {
      items = items.filter(it =>
        (`${it.phone ?? ""} ${it.numbers ?? ""} ${it.type ?? ""} ${it.status ?? ""}`)
          .toLowerCase()
          .includes(q)
      );
    }

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ items, total: items.length });
  } catch (e) {
    console.error("admin GET /bets error:", e);
    res.status(500).json({ message: "Failed to fetch bets" });
  }
});

/* -------- PATCH /api/admin/bets/:type/:id/status -------- */
router.patch("/:type/:id/status", authenticate, adminOnly, async (req, res) => {
  try {
    const { type, id } = req.params;
    const status = (req.body.status || "").toLowerCase();

    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const MODEL = {
      yonchif: YonChif,
      dechif: DeChif,
      twachif: TwaChif,
      maryaj: Maryaj,
      katchif: Katchif,
    }[type];

    if (!MODEL) {
      return res.status(400).json({ message: "Invalid bet type" });
    }

    const bet = await MODEL.findByPk(id);
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    bet.status = status;
    await bet.save();

    res.json({ message: "Bet updated", id, type, status });
  } catch (e) {
    console.error("admin PATCH status error:", e);
    res.status(500).json({ message: "Failed to update bet" });
  }
});

module.exports = router;
