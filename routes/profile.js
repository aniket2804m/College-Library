const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });
const profileController = require("../controllers/profile.js");

router.get("/", isLoggedIn, wrapAsync(profileController.showProfile));
router.get("/edit", isLoggedIn, wrapAsync(profileController.renderEditProfile));
router.put("/", isLoggedIn, upload.single("profileImage"), wrapAsync(profileController.updateProfile));

module.exports = router;
