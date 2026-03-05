const express = require("express");
const router = express.Router();
const techcrunchController = require("../controllers/techcrunchController");

router.get("/news", techcrunchController.getLatest);
router.get("/article", techcrunchController.getArticle);

module.exports = router;
