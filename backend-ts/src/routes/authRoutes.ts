import { Router } from "express";
import * as authController from "../controllers/authController";
import { adminOnly } from "../middleware/adminOnly";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.patch("/complete-profile", authenticate, authController.completeProfile);
router.delete("/users/:id", authenticate, adminOnly, authController.deleteUser);

export default router;
