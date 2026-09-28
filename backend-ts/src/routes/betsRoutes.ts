import { Router } from "express";
import * as controller from "../controllers/betsController";

// Mounted behind `authenticate` in app.ts.
const router = Router();

// Support both paths so the frontend can call /me or /shared
router.get(["/me", "/shared"], controller.getAllMyBets);

export default router;
