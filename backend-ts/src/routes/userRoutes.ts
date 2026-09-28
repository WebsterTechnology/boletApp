import { Router } from "express";
import { authenticate, currentUser } from "../middleware/authenticate";
import { User } from "../models";

const router = Router();

const shapeUser = (u: User) => ({
  id: u.id,
  phone: u.phone,
  points: Number(u.points ?? 0),
  isAdmin: !!u.isAdmin,
  fullName: u.fullName || "",
  email: u.email || "",
  profileComplete: !!(u.fullName && u.email),
});

// GET /api/users/me
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(currentUser(req).id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(shapeUser(user));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /api/users/points -> { points }
router.get("/points", authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(currentUser(req).id, { attributes: ["points"] });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ points: Number(user.points ?? 0) });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
