// routes/adminBetsRoutes.js
const express = require("express");
const router = express.Router();

const { User, YonChif, Maryaj, TwaChif } = require("../models");
const authenticate = require("../middleware/authenticate");
const adminOnly = require("../middleware/adminOnly");

// make sure associations exist
if (YonChif && !YonChif.associations?.User) YonChif.belongsTo(User, { foreignKey: "userId" });
if (Maryaj && !Maryaj.associations?.User) Maryaj.belongsTo(User, { foreignKey: "userId" });
if (TwaChif && !TwaChif.associations?.User) TwaChif.belongsTo(User, { foreignKey: "userId" });

/* -------- helpers -------- */
const mapRow = (type, r) => ({
  id: r.id,
  type,
  userId: r.userId,
  phone: r.User?.phone,
  numbers:
    type === "yonchif" ? (r.nimewo ?? r.number ?? r.numbers)
    : type === "maryaj" ? (r.maryaj ?? r.numbers)
    : /* twachif */       (r.twachif ?? r.numbers),
  pwen: Number(r.pwen || 0),
  draw: r.ville ?? r.city ?? r.lokal ?? r.draw ?? null,
  status: r.status || "pending",
  createdAt: r.createdAt,
});

const allowedStatuses = new Set(["pending", "won", "lost", "paid", "void", "cancelled"]);

/* -------- GET /api/admin/bets --------
   query:
     - type  : all|yonchif|maryaj|twachif
     - status: all|pending|won|lost|paid|void|cancelled
     - q     : free text (phone/numbers/type)
--------------------------------------- */
router.get("/", authenticate, adminOnly, async (req, res) => {
  try {
    const type = (req.query.type || "all").toLowerCase();
    const status = (req.query.status || "all").toLowerCase();
    const q = (req.query.q || "").toLowerCase();

    const where = {};
    if (status !== "all" && allowedStatuses.has(status)) where.status = status;

    const includeUser = [{ model: User, attributes: ["id", "phone"] }];

    const tasks = [];
    if (type === "all" || type === "yonchif") {
      tasks.push(
        YonChif.findAll({ where, include: includeUser }).then(rows =>
          rows.map(r => mapRow("yonchif", r))
        )
      );
    }
    if (type === "all" || type === "maryaj") {
      tasks.push(
        Maryaj.findAll({ where, include: includeUser }).then(rows =>
          rows.map(r => mapRow("maryaj", r))
        )
      );
    }
    if (type === "all" || type === "twachif") {
      tasks.push(
        TwaChif.findAll({ where, include: includeUser }).then(rows =>
          rows.map(r => mapRow("twachif", r))
        )
      );
    }

    const groups = await Promise.all(tasks);
    let items = groups.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (q) {
      items = items.filter(it =>
        (`${it.phone ?? ""} ${it.numbers ?? ""} ${it.type ?? ""} ${it.status ?? ""}`)
          .toLowerCase()
          .includes(q)
      );
    }

    res.json({ items, total: items.length });
  } catch (e) {
    console.error("admin GET /bets error:", e);
    res.status(500).json({ message: "Failed to fetch bets" });
  }
});

/* -------- PATCH /api/admin/bets/:type/:id/status --------
   body: { status: "won"|"lost"|"pending"|"paid"|"void"|"cancelled" }
---------------------------------------------------------- */
router.patch("/:type/:id/status", authenticate, adminOnly, async (req, res) => {
  try {
    const type = (req.params.type || "").toLowerCase();
    const id = req.params.id;
    const status = (req.body.status || "").toLowerCase();

    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    let Model = null;
    if (type === "yonchif") Model = YonChif;
    else if (type === "maryaj") Model = Maryaj;
    else if (type === "twachif") Model = TwaChif;
    else return res.status(400).json({ message: "Invalid bet type" });

    const bet = await Model.findByPk(id);
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    bet.status = status;
    await bet.save();

    res.json({ message: "Bet updated", bet: { id: bet.id, status: bet.status, type } });
  } catch (e) {
    console.error("admin PATCH /bets/:type/:id/status error:", e);
    res.status(500).json({ message: "Failed to update bet" });
  }
});

module.exports = router;
