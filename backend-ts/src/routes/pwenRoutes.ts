import { Router } from "express";
import * as controller from "../controllers/pwenController";

// Mounted behind `authenticate` in app.ts.
const router = Router();

router.post("/buy", controller.buyPwen);

export default router;
