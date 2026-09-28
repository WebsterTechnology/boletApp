import { Router } from "express";
import * as controller from "../controllers/katchifController";

// Mounted behind `authenticate` in app.ts.
const router = Router();

router.post("/", controller.createKatchif);
router.get("/", controller.getMyKatchifBets);
router.get("/remaining", controller.getKatchifRemaining);
router.put("/:id", controller.updateKatchif);
router.delete("/:id", controller.deleteKatchif);

export default router;
