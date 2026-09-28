import type { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models";

export interface TokenPayload {
  id?: number;
  userId?: number;
  phone?: string;
  isAdmin?: boolean;
}

/** Tokens have been issued with either `id` or `userId`; accept both. */
export function userIdFromToken(token: string): number | null {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded === "string") return null;
  const payload = decoded as TokenPayload;
  return payload.id || payload.userId || null;
}

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Access denied: No token provided" });
      return;
    }

    const userId = userIdFromToken(authHeader.split(" ")[1]);
    if (!userId) {
      res.status(401).json({ message: "Invalid token payload" });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user || user.deleted) {
      res.status(401).json({ message: "User no longer exists" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("AUTH ERROR:", err instanceof Error ? err.message : err);
    res.status(401).json({ message: "Session expired. Please login again." });
  }
};

/** The authenticated user. Only call from handlers mounted behind `authenticate`. */
export function currentUser(req: Request): User {
  if (!req.user) throw new Error("currentUser() called on an unauthenticated route");
  return req.user;
}
