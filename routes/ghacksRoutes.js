const express = require("express");
const router = express.Router();
const ghacksController = require("../controllers/ghacksController");

router.get("/news", ghacksController.getNews);
router.get("/article", ghacksController.getArticle);

module.exports = router;
