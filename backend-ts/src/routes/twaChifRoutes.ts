import { Router } from "express";
import * as controller from "../controllers/twaChifController";

// Mounted behind `authenticate` in app.ts.
const router = Router();

router.post("/", controller.createTwaChif);
router.get("/", controller.getMyTwaChifBets);
router.put("/:id", controller.updateTwaChif);
router.delete("/:id", controller.deleteTwaChif);

export default router;
