// controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User } = require("../models");

// Shape user payload consistently for responses
function shapeUser(u) {
  return {
    id: u.id,
    phone: u.phone,
    points: Number(u.points ?? 0), // ensure number
    isAdmin: !!u.isAdmin,
  };
}

exports.login = async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ message: "Phone and password are required" });
  }

  try {
    const user = await User.findOne({ where: { phone } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user.id, phone: user.phone, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful",
      user: shapeUser(user),
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.register = async (req, res) => {
  const { phone, password, isAdmin } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ message: "Phone and password are required" });
  }
  if (!/^\d{4}$/.test(password)) {
    return res.status(400).json({ message: "Password must be exactly 4 digits" });
  }

  try {
    const exists = await User.findOne({ where: { phone } });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      phone,
      password: hashedPassword,
      isAdmin: !!isAdmin,
      // points uses model default (0)
    });

    return res.status(201).json({
      message: "User created",
      user: shapeUser(user),
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
