import { Router } from "express";
import { creditPixPayment, getPaidPixPayments } from "../controllers/adminPaymentsController";
import { adminOnly } from "../middleware/adminOnly";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/", authenticate, adminOnly, getPaidPixPayments);
router.post("/:id/credit", authenticate, adminOnly, creditPixPayment);

export default router;
