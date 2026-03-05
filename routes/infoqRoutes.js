const express = require("express");
const router = express.Router();
const infoqController = require("../controllers/infoqController");

router.get("/news", infoqController.getNews);
router.get("/article", infoqController.getArticle);

module.exports = router;
