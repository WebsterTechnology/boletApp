const {
  YonChif,
  DeChif,
  TwaChif,
  Maryaj,
  Katchif,
} = require("../models");

exports.getAllMyBets = async (req, res) => {
  try {
    const userId = req.user.id;

    // 🔥 IMPORTANT: raw: true gives plain objects
    const [yonchif, dechif, twachif, maryaj, katchif] = await Promise.all([
      YonChif.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        raw: true,
      }),
      DeChif.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        raw: true,
      }),
      TwaChif.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        raw: true,
      }),
      Maryaj.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        raw: true,
      }),
      Katchif.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        raw: true,
      }),
    ]);

    // 🔢 TOTAL Pwen
    const totalPwen =
      yonchif.reduce((s, b) => s + Number(b.pwen || 0), 0) +
      dechif.reduce((s, b) => s + Number(b.pwen || 0), 0) +
      twachif.reduce((s, b) => s + Number(b.pwen || 0), 0) +
      maryaj.reduce((s, b) => s + Number(b.pwen || 0), 0) +
      katchif.reduce((s, b) => s + Number(b.pwen || 0), 0);

    // 📦 Build unified list
    const items = [
      ...yonchif.map((b) => ({
        id: b.id,
        type: "yonchif",
        numbers: b.nimewo || b.number || b.numbers || "-",
        pwen: Number(b.pwen || 0),
        draw: b.draw || b.ville || b.city || b.lokal || "-",
        status: b.status || "pending",
        createdAt: b.createdAt,
      })),

      ...dechif.map((b) => ({
        id: b.id,
        type: "dechif",
        numbers: b.number || b.nimewo || "-",
        pwen: Number(b.pwen || 0),
        draw: b.draw || b.ville || b.city || b.lokal || "-",
        status: b.status || "pending",
        createdAt: b.createdAt,
      })),

      ...twachif.map((b) => ({
        id: b.id,
        type: "twachif",
        numbers: b.number || b.nimewo || "-",
        pwen: Number(b.pwen || 0),
        draw: b.draw || b.ville || b.city || b.lokal || "-",
        status: b.status || "pending",
        createdAt: b.createdAt,
      })),

      ...maryaj.map((b) => ({
        id: b.id,
        type: "maryaj",
        part1: b.part1 || "-",
        part2: b.part2 || "-",
        numbers:
          b.part1 && b.part2 ? `${b.part1}${b.part2}` : "-",
        pwen: Number(b.pwen || 0),
        draw: b.draw || b.ville || b.city || b.lokal || "-",
        status: b.status || "pending",
        createdAt: b.createdAt,
      })),

      ...katchif.map((b) => ({
        id: b.id,
        type: "katchif",
        numbers: b.number || b.numbers || "-",
        pwen: Number(b.pwen || 0),
        draw: b.draw || b.ville || b.city || b.lokal || "-",
        status: b.status || "pending",
        createdAt: b.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // ✅ Send to frontend
    res.json({
      items,
      totalPwen,
    });

  } catch (err) {
    console.error("Bet fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
