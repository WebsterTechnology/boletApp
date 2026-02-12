const {
  YonChif,
  DeChif,
  TwaChif,
  Maryaj,
  Katchif,
} = require("../models");

exports.getAllMyBets = async (req, res) => {
  try {
    // 🔐 Authenticated user id (from middleware)
    const userId = req.user.id;

    // 📥 Fetch ALL bet types in parallel
    const [yonchif, dechif, twachif, maryaj, katchif] = await Promise.all([
      YonChif.findAll({ where: { userId }, order: [["createdAt", "DESC"]] }),
      DeChif.findAll({ where: { userId }, order: [["createdAt", "DESC"]] }),
      TwaChif.findAll({ where: { userId }, order: [["createdAt", "DESC"]] }),
      Maryaj.findAll({ where: { userId }, order: [["createdAt", "DESC"]] }),
      Katchif.findAll({ where: { userId }, order: [["createdAt", "DESC"]] }),
    ]);

    // 🔢 TOTAL points bet (ALL types)
    const totalPwen =
      yonchif.reduce((s, b) => s + Number(b.pwen || 0), 0) +
      dechif.reduce((s, b) => s + Number(b.pwen || 0), 0) +
      twachif.reduce((s, b) => s + Number(b.pwen || 0), 0) +
      maryaj.reduce((s, b) => s + Number(b.pwen || 0), 0) +
      katchif.reduce((s, b) => s + Number(b.pwen || 0), 0);

    // 🧠 SAFE helper: returns first existing field OR "-"
    const pick = (obj, ...keys) => {
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
      }
      return "-";
    };

    // 📦 Unified list for frontend (ONE loop)
    const items = [
      ...yonchif.map((b) => ({
        id: b.id,
        type: "yonchif",
        numbers: pick(b, "nimewo", "number", "numbers"),
        pwen: Number(b.pwen || 0),
        draw: pick(b, "ville", "city", "lokal"),
        status: b.status || "pending",
        createdAt: b.createdAt,
      })),

      ...dechif.map((b) => ({
        id: b.id,
        type: "dechif",
        numbers: pick(b, "number", "nimewo"),
        pwen: Number(b.pwen || 0),
        draw: pick(b, "ville", "city", "lokal"),
        status: b.status || "pending",
        createdAt: b.createdAt,
      })),

      ...twachif.map((b) => ({
        id: b.id,
        type: "twachif",
        numbers: pick(b, "number", "twachif", "nimewo"),
        pwen: Number(b.pwen || 0),
        draw: pick(b, "ville", "city", "lokal"),
        status: b.status || "pending",
        createdAt: b.createdAt,
      })),
      ...maryaj.map((b) => ({
        id: b.id,
        type: "maryaj",
        part1: b.part1 || "-",
        part2: b.part2 || "-",
        numbers: b.part1 && b.part2 ? `${b.part1}${b.part2}` : "-",
        pwen: Number(b.pwen || 0),
        draw: pick(b, "ville", "city", "lokal"),
        status: b.status || "pending",
        createdAt: b.createdAt,
      })),
      ...katchif.map((b) => ({
        id: b.id,
        type: "katchif",
        numbers: pick(b, "number", "numbers"),
        pwen: Number(b.pwen || 0),
        draw: pick(b, "ville", "city", "lokal"),
        status: b.status || "pending",
        createdAt: b.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // ✅ Send response
    res.json({
      items,        // 👈 frontend MUST use this
      totalPwen,
      yonchif,
      dechif,
      twachif,
      maryaj,
      katchif,
    });
  } catch (err) {
    console.error("Bet fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
