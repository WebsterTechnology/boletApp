import { Router } from "express";
import * as controller from "../controllers/maryajController";

// Mounted behind `authenticate` in app.ts.
const router = Router();

router.get("/remaining", controller.getMaryajRemaining);
router.post("/", controller.createMaryaj);
router.get("/", controller.getMyMaryajBets);
router.put("/:id", controller.updateMaryaj);
router.delete("/:id", controller.deleteMaryaj);

export default router;
