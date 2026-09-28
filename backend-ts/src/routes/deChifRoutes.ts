import { Router } from "express";
import * as controller from "../controllers/deChifController";

// Mounted behind `authenticate` in app.ts.
const router = Router();

router.post("/", controller.createDeChif);
router.get("/", controller.getMyDeChifBets);
router.put("/:id", controller.updateDeChif);
router.delete("/:id", controller.deleteDeChif);

export default router;
