
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const authenticate = require("./middleware/authenticate")

// ----------------------------------------------------
// CORS
// ----------------------------------------------------
const allowedOrigins = [
  "https://ht-lotodigital.com",
  "https://www.ht-lotodigital.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

const corsOptions = {
  origin(origin, callback) {
    // Allow server-to-server requests (webhooks, health checks, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "access_token"],
  credentials: false,
};

app.use(cors(corsOptions));
app.options("/{*splat}", cors(corsOptions));
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
const infinitepayRoutes = require("./routes/infinitepay");
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
app.use("/api/yonchif",authenticate, yonChifRoutes);
app.use("/api/dechif",authenticate, deChifRoutes);
app.use("/api/maryaj",authenticate, maryajRoutes);
app.use("/api/katchif",authenticate, katchifRoutes);
app.use("/api/twachif",authenticate, twaChifRoutes);
app.use("/api/bets", authenticate,betsRoutes);
app.use("/api/points",authenticate, pwenRoutes);
app.use("/api/pix", pixRoutes);
app.use("/api/infinitepay", infinitepayRoutes);

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
