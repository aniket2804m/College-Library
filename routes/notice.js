const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const { isLoggedIn, isLibrarian, isAdmin } = require("../middleware.js");
const noticeController = require("../controllers/notice.js");

// Student view
router.get("/", isLoggedIn, wrapAsync(noticeController.studentNotices));

module.exports = router;
