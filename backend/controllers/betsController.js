// controllers/betsController.js
const { YonChif, Maryaj, TwaChif } = require("../models");

exports.getAllMyBets = async (req, res) => {
  try {
    const userId = req.user.id;

    const [yonchif, maryaj, twachif] = await Promise.all([
      YonChif.findAll({ where: { userId }, order: [["createdAt", "DESC"]] }),
      Maryaj.findAll({ where: { userId }, order: [["createdAt", "DESC"]] }),
      TwaChif.findAll({ where: { userId }, order: [["createdAt", "DESC"]] }),
    ]);

    // 🔢 Total pwen
    const totalPwen =
      yonchif.reduce((sum, b) => sum + Number(b.pwen || 0), 0) +
      maryaj.reduce((sum, b) => sum + Number(b.pwen || 0), 0) +
      twachif.reduce((sum, b) => sum + Number(b.pwen || 0), 0);

    // ✅ Build a unified items[] list so the frontend can render in one loop
    const pick = (o, ...keys) => keys.find((k) => o[k] != null) && o[keys.find((k) => o[k] != null)];

    const items = [
      ...yonchif.map((b) => ({
        id: b.id,
        type: "yonchif",
        numbers: pick(b, "nimewo", "numbers", "number", "num", "valeur", "value") ?? "-",
        pwen: Number(b.pwen || 0),
        draw: pick(b, "ville", "city", "lokal", "draw", "place", "lottery"),
        status: b.status || "pending",
        createdAt: b.createdAt,
      })),
      ...maryaj.map((b) => ({
        id: b.id,
        type: "maryaj",
        numbers: pick(b, "maryaj", "numbers", "number", "nimewo") ?? "-",
        pwen: Number(b.pwen || 0),
        draw: pick(b, "ville", "city", "lokal", "draw", "place", "lottery"),
        status: b.status || "pending",
        createdAt: b.createdAt,
      })),
      ...twachif.map((b) => ({
        id: b.id,
        type: "twachif",
        numbers: pick(b, "twachif", "numbers", "number", "nimewo") ?? "-",
        pwen: Number(b.pwen || 0),
        draw: pick(b, "ville", "city", "lokal", "draw", "place", "lottery"),
        status: b.status || "pending",
        createdAt: b.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Return both: unified items[] and raw groups (use whichever you prefer)
    res.json({
      items,
      totalPwen,
      yonchif,
      maryaj,
      twachif,
    });
  } catch (err) {
    console.error("Bet fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
