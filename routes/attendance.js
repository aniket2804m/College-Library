const express    = require("express");
const router     = express.Router();
const wrapAsync  = require("../Utils/wrapAsync.js");
const { isLoggedIn, isAdmin, isLibrarian } = require("../middleware.js");
const ctrl       = require("../controllers/attendance.js");

// Student routes
router.post("/mark",        isLoggedIn, wrapAsync(ctrl.mark));
router.post("/checkout",    isLoggedIn, wrapAsync(ctrl.checkout));
router.get("/today",        isLoggedIn, wrapAsync(ctrl.todayStatus));
router.get("/wifi-status",  isLoggedIn, wrapAsync(ctrl.wifiStatus));
router.get("/my",           isLoggedIn, wrapAsync(ctrl.myAttendance));

// QR attendance
router.get("/scan",         isLoggedIn, (req, res) => res.render("attendance/scan.ejs", { token: req.query.t || "" }));
router.post("/qr-mark",     isLoggedIn, wrapAsync(ctrl.qrMark));

// QR token endpoint — librarian only
router.get("/qr-token",     isLoggedIn, isLibrarian, wrapAsync(ctrl.qrToken));

// Admin report
router.get("/admin",     isLoggedIn, isLibrarian, wrapAsync(ctrl.adminReport));

module.exports = router;
