
// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// const app = express();

// app.use(cors());
// app.use(express.json()); // parse JSON bodies

// // --- Routes
// const authRoutes = require("./routes/authRoutes");
// const yonChifRoutes = require("./routes/yonChifRoutes");
// const maryajRoutes = require("./routes/maryajRoutes");
// const twaChifRoutes = require("./routes/twaChifRoutes");
// const betsRoutes = require("./routes/betsRoutes");
// const pwenRoutes = require("./routes/pwenRoutes");
// const pixRoutes = require("./routes/pixRoutes");
// const claimRoutes = require("./routes/claimRoutes");

// // ✅ NEW: admin bets (yonchif/maryaj/twachif) manager endpoints
// const adminBetsRoutes = require("./routes/adminBetsRoutes");

// // Existing admin routes (users, payments, etc.)
// const adminRoutes = require("./routes/adminRoutes");

// const userRoutes = require("./routes/userRoutes");

// // --- Mount
// app.use("/api/auth", authRoutes);
// app.use("/api/yonchif", yonChifRoutes);
// app.use("/api/maryaj", maryajRoutes);
// app.use("/api/twachif", twaChifRoutes);
// app.use("/api/bets", betsRoutes);
// app.use("/api/points", pwenRoutes);
// app.use("/api/pix", pixRoutes);

// // ⚠️ Mount the more-specific /api/admin/bets routes BEFORE the generic /api/admin router
// app.use("/api/admin/bets", adminBetsRoutes);

// app.use("/api/admin", adminRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api", userRoutes);
// app.use("/api/claims", claimRoutes);

// module.exports = app;
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ---------- Middleware ----------
app.use(cors());
app.use(express.json()); // Parse JSON bodies

// ---------- Import Routes ----------
const authRoutes = require("./routes/authRoutes");
const yonChifRoutes = require("./routes/yonChifRoutes");
const maryajRoutes = require("./routes/maryajRoutes");
const twaChifRoutes = require("./routes/twaChifRoutes");
const betsRoutes = require("./routes/betsRoutes");
const pwenRoutes = require("./routes/pwenRoutes");
const pixRoutes = require("./routes/pixRoutes");
const claimRoutes = require("./routes/claimRoutes");

const adminBetsRoutes = require("./routes/adminBetsRoutes"); // specific admin bet endpoints
const adminRoutes = require("./routes/adminRoutes");         // general admin routes
const userRoutes = require("./routes/userRoutes");           // user mgmt routes

// ---------- Mount Routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/yonchif", yonChifRoutes);
app.use("/api/maryaj", maryajRoutes);
app.use("/api/twachif", twaChifRoutes);
app.use("/api/bets", betsRoutes);
app.use("/api/points", pwenRoutes);
app.use("/api/pix", pixRoutes);

// ⚠️ MUST COME BEFORE /api/admin so it doesn't get overridden
app.use("/api/admin/bets", adminBetsRoutes);

// All other admin endpoints
app.use("/api/admin", adminRoutes);

// User endpoints
app.use("/api/users", userRoutes);

// Claims
app.use("/api/claims", claimRoutes);

// ---------- Export ----------
module.exports = app;
