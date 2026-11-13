import bcrypt from "bcryptjs";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";
import { QueryTypes } from "sequelize";
import { env } from "../config/env";
import { sequelize, User } from "../models";

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false,
  message: { message: "Too many attempts. Try again later." } });

export async function maintenanceEnabled(): Promise<boolean> {
  const rows = await sequelize.query<{ enabled: boolean }>(
    'SELECT "enabled" FROM "site_maintenance" WHERE "id" = 1',
    { type: QueryTypes.SELECT }
  );
  return rows[0]?.enabled === true;
}

router.get("/status", async (_req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.json({ maintenance: await maintenanceEnabled() });
  } catch {
    res.status(503).json({ maintenance: true });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  const phone = String(req.body?.phone || "").trim();
  const password = String(req.body?.password || "");
  const configuredPhone = process.env.DEVELOPER_PHONE?.trim();
  const hash = process.env.DEVELOPER_PASSWORD_HASH?.trim();
  if (!configuredPhone || !hash || !phone || !password || phone !== configuredPhone) {
    res.status(401).json({ message: "Invalid developer credentials" }); return;
  }
  try {
    const user = await User.findOne({ where: { phone: configuredPhone } });
    if (!user || !(await bcrypt.compare(password, hash))) {
      res.status(401).json({ message: "Invalid developer credentials" }); return;
    }
    const token = jwt.sign({ id: user.id, role: "developer-maintenance" }, env.jwtSecret, { expiresIn: "30m" });
    res.setHeader("Cache-Control", "no-store");
    res.json({ token });
  } catch {
    res.status(500).json({ message: "Unable to sign in" });
  }
});

router.post("/maintenance", async (req, res) => {
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer /, "");
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === "string" || decoded.role !== "developer-maintenance" || typeof decoded.id !== "number") {
      res.status(403).json({ message: "Developer access required" }); return;
    }
    const user = await User.findByPk(decoded.id);
    if (!user || !process.env.DEVELOPER_PHONE || user.phone !== process.env.DEVELOPER_PHONE.trim()) {
      res.status(403).json({ message: "Developer access required" }); return;
    }
    if (typeof req.body?.enabled !== "boolean") {
      res.status(400).json({ message: "enabled must be boolean" }); return;
    }
    await sequelize.query(
      'INSERT INTO "site_maintenance" ("id", "enabled", "updatedAt") VALUES (1, :enabled, NOW()) ON CONFLICT ("id") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW()',
      { replacements: { enabled: req.body.enabled } }
    );
    res.setHeader("Cache-Control", "no-store");
    res.json({ maintenance: req.body.enabled });
  } catch {
    res.status(403).json({ message: "Developer session invalid or expired" });
  }
});

export default router;
