const express = require("express");
const router = express.Router();
const aimController = require("../controllers/analyticsIndiaController");

router.get("/popular", aimController.getPopular);
router.get("/article", aimController.getArticle);

module.exports = router;
