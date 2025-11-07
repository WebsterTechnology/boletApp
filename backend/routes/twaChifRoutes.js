const express = require("express");
const router = express.Router();
const controller = require("../controllers/twaChifController");
const authenticate = require("../middleware/authenticate");

router.post("/", authenticate, controller.createTwaChif);
router.get("/", authenticate, controller.getMyTwaChifBets);
router.put("/:id", authenticate, controller.updateTwaChif);
router.delete("/:id", authenticate, controller.deleteTwaChif);

module.exports = router;
