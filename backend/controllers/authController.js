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
    fullName: u.fullName || "",
    cpf: u.cpf || "",
    birthDate: u.birthDate || "",
    email: u.email || "",
    address: u.address || "",
    city: u.city || "",
    state: u.state || "",
    cep: u.cep || "",
    profileComplete: !!(u.fullName && u.cpf && u.birthDate && u.email && u.address && u.city && u.state && u.cep),
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

// exports.register = async (req, res) => {
//   const { phone, password, isAdmin } = req.body;

//   if (!phone || !password) {
//     return res.status(400).json({ message: "Phone and password are required" });
//   }
//   if (!/^\d{4}$/.test(password)) {
//     return res.status(400).json({ message: "Password must be exactly 4 digits" });
//   }

//   try {
//     const exists = await User.findOne({ where: { phone } });
//     if (exists) return res.status(400).json({ message: "User already exists" });

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await User.create({
//       phone,
//       password: hashedPassword,
//       isAdmin: !!isAdmin,
//       // points uses model default (0)
//     });

//     return res.status(201).json({
//       message: "User created",
//       user: shapeUser(user),
//     });
//   } catch (err) {
//     console.error("Register error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

exports.register = async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ message: "Phone and password are required" });
  }
  if (!/^\d{4}$/.test(password)) {
    return res.status(400).json({ message: "Password must be exactly 4 digits" });
  }

  try {
    const exists = await User.findOne({ where: { phone } });
    if (exists) return res.status(400).json({ message: "User already exists" });
    const cpfExists = await User.findOne({ where: { cpf: cleanCpf } });
    if (cpfExists) return res.status(400).json({ message: "CPF already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      phone,
      password: hashedPassword,
      fullName: String(fullName).trim(),
      cpf: cleanCpf,
      birthDate,
      email: String(email).trim().toLowerCase(),
      address: String(address).trim(),
      city: String(city).trim(),
      state: String(state).trim().toUpperCase(),
      cep: cleanCep,
      // Public registration can never grant administrator privileges.
      isAdmin: false,
    });

    // 🔥 ADD THIS
    const token = jwt.sign(
      { id: user.id, phone: user.phone, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      message: "User created",
      user: shapeUser(user),
      token, // ✅ NOW USER IS LOGGED IN
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// 🔥 DELETE USER (ADMIN ONLY)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔒 Only admin can delete
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔥 OPTIONAL: delete user bets too
    const { Maryaj, Katchif } = require("../models");

    await Maryaj.destroy({ where: { userId: id } });
    await Katchif.destroy({ where: { userId: id } });

    // ✅ delete user
    await user.destroy();

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

exports.completeProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { fullName, cpf, birthDate, email, address, city, state, cep } = req.body;
    if (!fullName || !cpf || !birthDate || !email || !address || !city || !state || !cep) {
      return res.status(400).json({ message: "All profile fields are required" });
    }
    const cleanCpf = String(cpf).replace(/\D/g, "");
    const cleanCep = String(cep).replace(/\D/g, "");
    if (!/^\d{11}$/.test(cleanCpf)) return res.status(400).json({ message: "CPF must have 11 digits" });
    if (!/^\d{8}$/.test(cleanCep)) return res.status(400).json({ message: "CEP must have 8 digits" });
    const duplicate = await User.findOne({ where: { cpf: cleanCpf } });
    if (duplicate && duplicate.id !== user.id) return res.status(400).json({ message: "CPF already registered" });
    Object.assign(user, { fullName: String(fullName).trim(), cpf: cleanCpf, birthDate, email: String(email).trim().toLowerCase(), address: String(address).trim(), city: String(city).trim(), state: String(state).trim().toUpperCase(), cep: cleanCep });
    await user.save();
    return res.json({ message: "Profile completed", user: shapeUser(user) });
  } catch (err) {
    console.error("Complete profile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
