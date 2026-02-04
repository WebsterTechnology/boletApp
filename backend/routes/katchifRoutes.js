const express = require("express");
const router = express.Router();
const controller = require("../controllers/katchifController");
const authenticate = require("../middleware/authenticate");

router.post("/", authenticate, controller.createKatchif);
router.get("/", authenticate, controller.getMyKatchifBets);
router.put("/:id", authenticate, controller.updateKatchif);
router.delete("/:id", authenticate, controller.deleteKatchif);

module.exports = router;
