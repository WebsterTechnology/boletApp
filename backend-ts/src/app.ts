import cors from "cors";
import express from "express";
import helmet from "helmet";
import { corsOrigin } from "./config/env";
import { authenticate } from "./middleware/authenticate";
import adminBetsRoutes from "./routes/adminBetsRoutes";
import adminPaymentsRoutes from "./routes/adminPaymentsRoutes";
import adminRoutes from "./routes/adminRoutes";
import authRoutes from "./routes/authRoutes";
import betsRoutes from "./routes/betsRoutes";
import claimRoutes from "./routes/claimRoutes";
import chatRoutes from "./routes/chatRoutes";
import deChifRoutes from "./routes/deChifRoutes";
import infinitepayRoutes from "./routes/infinitepayRoutes";
import katchifRoutes from "./routes/katchifRoutes";
import maryajRoutes from "./routes/maryajRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import pixRoutes from "./routes/pixRoutes";
import pwenRoutes from "./routes/pwenRoutes";
import twaChifRoutes from "./routes/twaChifRoutes";
import userRoutes from "./routes/userRoutes";
import yonChifRoutes from "./routes/yonChifRoutes";

const app = express();

// Add standard HTTP security headers to every API response.
app.use(helmet());

// cors() also answers preflight (OPTIONS) requests for every route.
app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "access_token"],
    credentials: false,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/yonchif", authenticate, yonChifRoutes);
app.use("/api/dechif", authenticate, deChifRoutes);
app.use("/api/maryaj", authenticate, maryajRoutes);
app.use("/api/katchif", authenticate, katchifRoutes);
app.use("/api/twachif", authenticate, twaChifRoutes);
app.use("/api/bets", authenticate, betsRoutes);
app.use("/api/points", authenticate, pwenRoutes);
app.use("/api/pix", pixRoutes);
app.use("/api/infinitepay", infinitepayRoutes);

// MUST come before /api/admin
app.use("/api/admin/bets", adminBetsRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/admin/payments", adminPaymentsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);

export default app;
