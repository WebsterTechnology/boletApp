const { YonChif, User } = require("../models");

// ✅ Create YonChif bet with point validation
exports.createYonChif = async (req, res) => {
  try {
    const { number, pwen, location } = req.body;
    const userId = req.user.id;

    // Basic input validation
    if (!number || number.length !== 1 || !pwen || !location) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Fetch the user
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

    // ✅ Save the bet
    const bet = await YonChif.create({ number, pwen, location, userId });

    res.status(201).json({
      message: "Parye soumèt avèk siksè",
      bet,
      newBalance: user.points
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Get current user's YonChif bets
exports.getMyYonChifBets = async (req, res) => {
  try {
    const bets = await YonChif.findAll({ where: { userId: req.user.id } });
    res.json(bets);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update your own bet
exports.updateYonChif = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, pwen, location } = req.body;

    const bet = await YonChif.findOne({ where: { id, userId: req.user.id } });
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
exports.deleteYonChif = async (req, res) => {
  try {
    const { id } = req.params;

    const bet = await YonChif.findOne({ where: { id, userId: req.user.id } });
    if (!bet) return res.status(404).json({ message: "Bet not found" });

    await bet.destroy();
    res.json({ message: "Bet deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
