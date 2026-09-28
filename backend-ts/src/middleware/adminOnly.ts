import type { RequestHandler } from "express";

export const adminOnly: RequestHandler = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
    return;
  }
  res.status(403).json({ message: "Access denied: Admins only" });
};
