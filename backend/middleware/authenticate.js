// // middleware/authenticate.js
// const jwt = require("jsonwebtoken");
// const secret = process.env.JWT_SECRET;
// console.log("JWT_SECRET from env:", secret);

// module.exports = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1]; // Expecting "Bearer <token>"
//   console.log("🔐 Received token:", token);
  
//   if (!token) {
//     return res.status(401).json({ message: "Access denied: No token provided" });
//   }

//   try {
//     const decoded = jwt.verify(token, secret);
//     req.user = decoded; // now req.user.id is available
//     next();
//   } catch (err) {
//     res.status(401).json({ message: "Invalid token" });
//   }
// };

const jwt = require("jsonwebtoken");
const { User } = require("../models");

const secret = process.env.JWT_SECRET;

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // ❌ No token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // 🔐 Verify token
    const decoded = jwt.verify(token, secret);

    // 🔍 DEBUG (remove later)
    console.log("DECODED TOKEN:", decoded);

    // ⚠️ IMPORTANT: match this with your login payload
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // 🔎 Find user
    const user = await User.findByPk(userId);

    // ❌ User deleted or not found
    if (!user || user.deleted) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    // ✅ Attach user to request
    req.user = user;

    next();
  } catch (err) {
    console.error("AUTH ERROR:", err.message);

    return res.status(401).json({
      message: "Session expired. Please login again.",
    });
  }
};