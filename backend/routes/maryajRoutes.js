const express = require("express");
const router = express.Router();
const controller = require("../controllers/maryajController");
const authenticate = require("../middleware/authenticate");

router.post("/", authenticate, controller.createMaryaj);
router.get("/", authenticate, controller.getMyMaryajBets);
router.put("/:id", authenticate, controller.updateMaryaj);
router.delete("/:id", authenticate, controller.deleteMaryaj);

module.exports = router;
