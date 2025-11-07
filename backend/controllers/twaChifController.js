const { TwaChif, User } = require("../models");

// ✅ Create TwaChif Bet with pwen check
exports.createTwaChif = async (req, res) => {
  try {
    const { number, pwen, location } = req.body;
    const userId = req.user.id;

    // Validate number
    if (!/^\d{3}$/.test(number)) {
      return res.status(400).json({ message: "Number must be exactly 3 digits." });
    }

    if (!pwen || !location) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Get user from DB
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Check if user has enough pwen
    if (user.points < pwen) {
      return res.status(403).json({
        message: "Ou pa gen ase pwen pou mete parye a.",
        required: pwen,
        currentBalance: user.points,
        redirectTo: "/buy-credits"
      });
    }

    // ✅ Deduct pwen
    user.points -= pwen;
    await user.save();

    // ✅ Create the bet
    const bet = await TwaChif.create({ number, pwen, location, userId });

    res.status(201).json({
      message: "Parye Twa Chif soumèt avèk siksè",
      bet,
      newBalance: user.points
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Get all bets from current user
exports.getMyTwaChifBets = async (req, res) => {
  try {
    const bets = await TwaChif.findAll({ where: { userId: req.user.id } });
    res.json(bets);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update your own bet
exports.updateTwaChif = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, pwen, location } = req.body;

    const bet = await TwaChif.findOne({ where: { id, userId: req.user.id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    bet.number = number;
    bet.pwen = pwen;
    bet.location = location;
    await bet.save();

    res.json(bet);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete your own bet
exports.deleteTwaChif = async (req, res) => {
  try {
    const { id } = req.params;

    const bet = await TwaChif.findOne({ where: { id, userId: req.user.id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    await bet.destroy();
    res.json({ message: "Bet deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
