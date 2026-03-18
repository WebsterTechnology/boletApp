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
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, secret);

    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    // ✅ FIX HERE
    req.user = user;

    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};