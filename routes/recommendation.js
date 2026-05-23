const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const recController = require("../controllers/recommendation.js");

router.get("/", wrapAsync(recController.renderRecommendations));
router.get("/api", wrapAsync(recController.getRecommendations));

module.exports = router;
