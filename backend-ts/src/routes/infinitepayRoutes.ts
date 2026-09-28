import { Router } from "express";
import * as controller from "../controllers/infinitepayController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.post("/create-payment", authenticate, controller.createPayment);
router.get("/test", controller.test);
router.post("/webhook", controller.webhook);

export default router;
