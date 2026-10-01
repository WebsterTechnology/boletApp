import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import * as authController from "../controllers/authController";
import { adminOnly } from "../middleware/adminOnly";
import { authenticate } from "../middleware/authenticate";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many failed login attempts. Please try again in 15 minutes." },
});

router.post("/register", authController.register);
router.post("/login", loginLimiter, authController.login);
router.patch("/complete-profile", authenticate, authController.completeProfile);
router.delete("/users/:id", authenticate, adminOnly, authController.deleteUser);

export default router;
