const express = require("express");
const router = express.Router();
const yonChifController = require("../controllers/yonChifController");
const authenticate = require("../middleware/authenticate");

router.post("/", authenticate, yonChifController.createYonChif);
router.get("/", authenticate, yonChifController.getMyYonChifBets);
router.put("/:id", authenticate, yonChifController.updateYonChif);
router.delete("/:id", authenticate, yonChifController.deleteYonChif);

module.exports = router;
