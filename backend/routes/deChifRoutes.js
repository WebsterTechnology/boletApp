const express = require("express");
const router = express.Router();
const deChifController = require("../controllers/deChifController");
const authenticate = require("../middleware/authenticate");

router.post("/", authenticate, deChifController.createDeChif);
router.get("/", authenticate, deChifController.getMyDeChifBets);
router.put("/:id", authenticate, deChifController.updateDeChif);
router.delete("/:id", authenticate, deChifController.deleteDeChif);

module.exports = router;
