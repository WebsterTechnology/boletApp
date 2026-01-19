const express = require("express");
const router = express.Router();
const deChifController = require("../controllers/dechifControllerrr");
const authenticate = require("../middleware/authenticate");

router.post("/", authenticate, deChifController.createDeChif);
router.get("/", authenticate, deChifController.getMyDeChifBets);
router.put("/:id", authenticate, deChifController.updateDeChif);
router.delete("/:id", authenticate, deChifController.deleteDeChif);
// Additional route to get all DeChif bets (admin only)

module.exports = router;
