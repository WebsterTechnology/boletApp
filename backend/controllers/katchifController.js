const { Katchif, User } = require("../models");

// ✅ Create Katchif Bet with pwen check
// exports.createKatchif = async (req, res) => {
//   try {
//     const { number, pwen, location } = req.body;
//     const userId = req.user.id;

//     // ✅ Validate number (EXACTLY 4 digits)
//     if (!/^\d{4}$/.test(number)) {
//       return res
//         .status(400)
//         .json({ message: "Number must be exactly 4 digits." });
//     }

//     if (!pwen || !location) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // ✅ Get user
//     const user = await User.findByPk(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // ✅ Check pwen balance
//     if (user.points < pwen) {
//       return res.status(403).json({
//         message: "Ou pa gen ase pwen pou mete parye a.",
//         required: pwen,
//         currentBalance: user.points,
//         redirectTo: "/buy-credits",
//       });
//     }

//     // ✅ Deduct pwen
//     user.points -= pwen;
//     await user.save();

//     // ✅ Create Katchif bet
//     const bet = await Katchif.create({
//       number,
//       pwen,
//       location,
//       userId,
//     });

//     res.status(201).json({
//       message: "Parye Katchif soumèt avèk siksè",
//       bet,
//       newBalance: user.points,
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

const MAX_KATCHIF_POINTS = 20;

exports.createKatchif = async (req, res) => {
  try {
    const { number, pwen, location } = req.body;
    const userId = req.user.id;

    // ✅ Validate number (4 digits)
    if (!/^\d{4}$/.test(number)) {
      return res.status(400).json({
        message: "Number must be exactly 4 digits."
      });
    }

    const betPwen = parseInt(pwen, 10);

    if (!betPwen || betPwen <= 0 || !location) {
      return res.status(400).json({
        message: "Invalid pwen or missing location"
      });
    }

    // ✅ Get user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Check balance
    if (user.points < betPwen) {
      return res.status(403).json({
        message: "Ou pa gen ase pwen.",
        required: betPwen,
        currentBalance: user.points,
        redirectTo: "/buy-credits",
      });
    }

    // 🔥 TOTAL FOR THIS EXACT NUMBER + LOCATION
    const total = await Katchif.sum("pwen", {
      where: { number, location }
    }) || 0;

    // 🔥 REMAINING
    const remaining = Math.max(0, MAX_KATCHIF_POINTS - total);

    // ❌ BLOCK
    if (betPwen > remaining) {
      return res.status(400).json({
        message: `❌ Nimewo ${number} gen sèlman ${remaining} pwen ki rete.`,
        remaining
      });
    }

    // ✅ Deduct points
    user.points -= betPwen;
    await user.save();

    // ✅ Create bet
    const bet = await Katchif.create({
      number,
      pwen: betPwen,
      location,
      userId,
    });

    res.status(201).json({
      message: "Katchif soumèt avèk siksè",
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

exports.getKatchifRemaining = async (req, res) => {
  try {
    const { number, location } = req.query;

    if (!number || !location) {
      return res.status(400).json({
        message: "Missing parameters"
      });
    }

    const total = await Katchif.sum("pwen", {
      where: { number, location }
    }) || 0;

    const remaining = Math.max(0, MAX_KATCHIF_POINTS - total);

    res.json({
      number,
      remaining
    });

  } catch (err) {
    res.status(500).json({
      message: "Error fetching remaining",
      error: err.message
    });
  }
};

// ✅ Get all my Katchif bets
exports.getMyKatchifBets = async (req, res) => {
  try {
    const bets = await Katchif.findAll({
      where: { userId: req.user.id },
    });
    res.json(bets);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update my own Katchif bet
exports.updateKatchif = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, pwen, location } = req.body;

    const bet = await Katchif.findOne({
      where: { id, userId: req.user.id },
    });
    if (!bet) {
      return res.status(404).json({ message: "Bet not found" });
    }

    // optional re-validation
    if (number && !/^\d{4}$/.test(number)) {
      return res
        .status(400)
        .json({ message: "Number must be exactly 4 digits." });
    }

    bet.number = number;
    bet.pwen = pwen;
    bet.location = location;
    await bet.save();

    res.json(bet);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete your own Katchif bet
exports.deleteKatchif = async (req, res) => {
  try {
    const { id } = req.params;

    const bet = await Katchif.findOne({
      where: { id, userId: req.user.id },
    });
    if (!bet) {
      return res.status(404).json({ message: "Bet not found" });
    }

    await bet.destroy();
    res.json({ message: "Bet deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

