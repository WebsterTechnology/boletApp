import { Router } from "express";
import * as controller from "../controllers/yonChifController";

// Mounted behind `authenticate` in app.ts.
const router = Router();

router.post("/", controller.createYonChif);
router.get("/", controller.getMyYonChifBets);
router.put("/:id", controller.updateYonChif);
router.delete("/:id", controller.deleteYonChif);

export default router;
