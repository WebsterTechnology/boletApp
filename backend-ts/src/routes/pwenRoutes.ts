import { Router } from "express";
import * as controller from "../controllers/pwenController";
import { adminOnly } from "../middleware/adminOnly";

// Mounted behind `authenticate` in app.ts.
const router = Router();

// Never allow a customer to self-credit points without verified payment.
router.post("/buy", adminOnly, controller.buyPwen);

export default router;
