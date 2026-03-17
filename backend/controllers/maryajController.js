const { Maryaj, User } = require("../models");


// ✅ Create Maryaj (2-digit pair) bet with pwen validation
// exports.createMaryaj = async (req, res) => {
//   try {
//     const { part1, part2, pwen, location } = req.body;
//     const userId = req.user.id;

//     if (!/^\d{2}$/.test(part1) || !/^\d{2}$/.test(part2)) {
//       return res.status(400).json({ message: "Each part must be exactly 2 digits." });
//     }

//     if (!pwen || !location) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     const user = await User.findByPk(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // ✅ Check if user has enough pwen
//     if (user.points < pwen) {
//       return res.status(403).json({
//         message: "Ou pa gen ase pwen pou mete Maryaj la.",
//         required: pwen,
//         currentBalance: user.points,
//         redirectTo: "/buy-credits"
//       });
//     }

//     // ✅ Deduct pwen
//     user.points -= pwen;
//     await user.save();

//     // ✅ Create the bet
//     const bet = await Maryaj.create({ part1, part2, pwen, location, userId });

//     res.status(201).json({
//       message: "Maryaj soumèt avèk siksè",
//       bet,
//       newBalance: user.points
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

const MAX_MARYAJ_POINTS = 20;

exports.createMaryaj = async (req, res) => {
  try {
    const { part1, part2, pwen, location } = req.body;
    const userId = req.user.id;

    // ✅ Validate numbers
    if (!/^\d{2}$/.test(part1) || !/^\d{2}$/.test(part2)) {
      return res.status(400).json({
        message: "Each part must be exactly 2 digits."
      });
    }

    // ✅ Validate pwen (VERY IMPORTANT FIX)
    const betPwen = parseInt(pwen, 10);

    if (!betPwen || betPwen <= 0 || !location) {
      return res.status(400).json({
        message: "Pwen must be a positive number and location is required"
      });
    }

    // ✅ Get user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // ✅ Check if user has enough pwen
    if (user.points < betPwen) {
      return res.status(403).json({
        message: "Ou pa gen ase pwen pou mete Maryaj la.",
        required: betPwen,
        currentBalance: user.points,
        redirectTo: "/buy-credits"
      });
    }

    // 🔥 GLOBAL LIMIT (ALL USERS)
    const totalMaryaj = await Maryaj.sum("pwen", {
      where: { location } // remove if you want global (all locations together)
    });

    const currentTotal = totalMaryaj || 0;

    // ✅ Prevent negative remaining (FIX)
    const remaining = Math.max(0, MAX_MARYAJ_POINTS - currentTotal);

    if (betPwen > remaining) {
      return res.status(400).json({
        message: `❌ Limit Maryaj rive. Rete sèlman ${remaining} pwen.`,
        remaining
      });
    }

    // ✅ Deduct pwen
    user.points -= betPwen;
    await user.save();

    // ✅ Create the bet
    const bet = await Maryaj.create({
      part1,
      part2,
      pwen: betPwen,
      location,
      userId
    });

    res.status(201).json({
      message: "Maryaj soumèt avèk siksè",
      bet,
      newBalance: user.points,
      remaining: remaining - betPwen
    });

  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};
// ✅ Get current user's Maryaj bets
exports.getMyMaryajBets = async (req, res) => {
  try {
    const bets = await Maryaj.findAll({ where: { userId: req.user.id } });
    res.json(bets);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update your own Maryaj bet
exports.updateMaryaj = async (req, res) => {
  try {
    const { id } = req.params;
    const { part1, part2, pwen, location } = req.body;

    const bet = await Maryaj.findOne({ where: { id, userId: req.user.id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    bet.part1 = part1;
    bet.part2 = part2;
    bet.pwen = pwen;
    bet.location = location;
    await bet.save();

    res.json(bet);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete your own Maryaj bet
exports.deleteMaryaj = async (req, res) => {
  try {
    const { id } = req.params;

    const bet = await Maryaj.findOne({ where: { id, userId: req.user.id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    await bet.destroy();
    res.json({ message: "Bet deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
