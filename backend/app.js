
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ----------------------------------------------------
// 🔥 FIXED CORS — ALLOW ALL ORIGINS FOR DEBUGGING PIX
// ----------------------------------------------------
app.use(
  cors({
    origin: "*", // OK for now (tighten later)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // ✅ PATCH ADDED
    allowedHeaders: ["Content-Type", "Authorization", "access_token"],
    credentials: false,
  })
);

// ✅ VERY IMPORTANT: allow preflight for ALL routes
app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// 🔗 Import Routes
// ----------------------------------------------------
const authRoutes = require("./routes/authRoutes");
const yonChifRoutes = require("./routes/yonChifRoutes");
const deChifRoutes = require("./routes/deChifRoutes");
const maryajRoutes = require("./routes/maryajRoutes");
const twaChifRoutes = require("./routes/twaChifRoutes");
const betsRoutes = require("./routes/betsRoutes");
const pwenRoutes = require("./routes/pwenRoutes");
const pixRoutes = require("./routes/pixRoutes");
const claimRoutes = require("./routes/claimRoutes");
const katchifRoutes = require("./routes/katchifRoutes");

const adminBetsRoutes = require("./routes/adminBetsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const adminPaymentsRoutes = require("./routes/adminPaymentsRoutes");

// ----------------------------------------------------
// 🚀 Mount Routes
// ----------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/yonchif", yonChifRoutes);
app.use("/api/dechif", deChifRoutes);
app.use("/api/maryaj", maryajRoutes);
app.use("/api/katchif", katchifRoutes);
app.use("/api/twachif", twaChifRoutes);
app.use("/api/bets", betsRoutes);
app.use("/api/points", pwenRoutes);
app.use("/api/pix", pixRoutes);

// MUST COME BEFORE /api/admin
app.use("/api/admin/bets", adminBetsRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/admin/payments", adminPaymentsRoutes);

// ----------------------------------------------------
// Export App
// ----------------------------------------------------
module.exports = app;
