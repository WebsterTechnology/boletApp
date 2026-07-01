const express = require("express");

const router = express.Router();

/*
====================================
TEST ROUTE
====================================
*/

router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "InfinitePay route is working!",
  });
});

module.exports = router;