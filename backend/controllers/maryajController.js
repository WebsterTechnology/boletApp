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

// ✅ CREATE MARYAJ (PER NUMBER LIMIT)
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

    // ✅ Validate pwen
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

    // ✅ Check user balance
    if (user.points < betPwen) {
      return res.status(403).json({
        message: "Ou pa gen ase pwen pou mete Maryaj la.",
        required: betPwen,
        currentBalance: user.points,
        redirectTo: "/buy-credits"
      });
    }

    // 🔥 LIMIT PER NUMBER

    // total for part1
    const totalPart1 = await Maryaj.sum("pwen", {
      where: { part1, location }
    }) || 0;

    // total for part2
    const totalPart2 = await Maryaj.sum("pwen", {
      where: { part2, location }
    }) || 0;

    // remaining
    const remainingPart1 = Math.max(0, MAX_MARYAJ_POINTS - totalPart1);
    const remainingPart2 = Math.max(0, MAX_MARYAJ_POINTS - totalPart2);

    // ❌ Block if exceeded
    if (betPwen > remainingPart1) {
      return res.status(400).json({
        message: `❌ Nimewo ${part1} gen sèlman ${remainingPart1} pwen ki rete.`,
        remaining: remainingPart1
      });
    }

    if (betPwen > remainingPart2) {
      return res.status(400).json({
        message: `❌ Nimewo ${part2} gen sèlman ${remainingPart2} pwen ki rete.`,
        remaining: remainingPart2
      });
    }

    // ✅ Deduct points
    user.points -= betPwen;
    await user.save();

    // ✅ Create bet
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
      remainingPart1: remainingPart1 - betPwen,
      remainingPart2: remainingPart2 - betPwen
    });

  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// ✅ GET REMAINING PER NUMBER (FOR FRONTEND DISPLAY)
exports.getMaryajRemaining = async (req, res) => {
  try {
    const { part1, part2, location } = req.query;

    if (!part1 || !part2 || !location) {
      return res.status(400).json({
        message: "Missing parameters"
      });
    }

    // total for part1
    const totalPart1 = await Maryaj.sum("pwen", {
      where: { part1, location }
    }) || 0;

    // total for part2
    const totalPart2 = await Maryaj.sum("pwen", {
      where: { part2, location }
    }) || 0;

    // remaining
    const remainingPart1 = Math.max(0, MAX_MARYAJ_POINTS - totalPart1);
    const remainingPart2 = Math.max(0, MAX_MARYAJ_POINTS - totalPart2);

    res.json({
      part1,
      remainingPart1,
      part2,
      remainingPart2
    });

  } catch (err) {
    res.status(500).json({
      message: "Error fetching remaining",
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
