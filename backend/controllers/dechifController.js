const { DeChif, User } = require("../models");

// ✅ Create DeChif bet (2-digit only)
exports.createDeChif = async (req, res) => {
  try {
    const { number, pwen, location } = req.body;
    const userId = req.user.id;

    // ✅ Basic input validation (EXACTLY 2 digits)
    if (!number || !/^\d{2}$/.test(number) || !pwen || !location) {
      return res.status(400).json({
        message: "All fields are required and number must be exactly 2 digits (00–99)",
      });
    }

    // ✅ Fetch the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Check if user has enough points
    if (user.points < pwen) {
      return res.status(403).json({
        message: "Ou pa gen ase pwen pou mete parye a.",
        required: pwen,
        currentBalance: user.points,
        redirectTo: "/buy-credits",
      });
    }

    // ✅ Deduct points
    user.points -= pwen;
    await user.save();

    // ✅ Save the bet
    const bet = await DeChif.create({
      number,
      pwen,
      location,
      userId,
    });

    res.status(201).json({
      message: "Parye DeChif soumèt avèk siksè",
      bet,
      newBalance: user.points,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Get current user's DeChif bets
exports.getMyDeChifBets = async (req, res) => {
  try {
    const bets = await DeChif.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    res.json(bets);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update your own DeChif bet
exports.updateDeChif = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, pwen, location } = req.body;

    // ✅ Validate 2-digit number
    if (number && !/^\d{2}$/.test(number)) {
      return res.status(400).json({
        message: "Number must be exactly 2 digits (00–99)",
      });
    }

    const bet = await DeChif.findOne({
      where: { id, userId: req.user.id },
    });

    if (!bet) {
      return res.status(404).json({ message: "Bet not found" });
    }

    bet.number = number ?? bet.number;
    bet.pwen = pwen ?? bet.pwen;
    bet.location = location ?? bet.location;

    await bet.save();
    res.json(bet);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete your own DeChif bet
exports.deleteDeChif = async (req, res) => {
  try {
    const { id } = req.params;

    const bet = await DeChif.findOne({
      where: { id, userId: req.user.id },
    });

    if (!bet) {
      return res.status(404).json({ message: "Bet not found" });
    }

    await bet.destroy();
    res.json({ message: "DeChif bet deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
