const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware.js");
const notifController = require("../controllers/notification.js");

router.get("/", isLoggedIn, wrapAsync(notifController.getNotifications));
router.post("/mark-all-read", isLoggedIn, wrapAsync(notifController.markAllRead));
router.post("/:id/read", isLoggedIn, wrapAsync(notifController.markRead));
router.get("/count", isLoggedIn, wrapAsync(notifController.unreadCount));

module.exports = router;
