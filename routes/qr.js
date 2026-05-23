const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const { isLoggedIn, isLibrarian } = require("../middleware.js");
const qrController = require("../controllers/qr.js");

// All QR operations — librarian + admin
router.get("/book/:bookId",    isLoggedIn, isLibrarian, wrapAsync(qrController.generateBookQR));
router.get("/user/:userId",    isLoggedIn, wrapAsync(qrController.generateUserQR));
router.get("/scanner",         isLoggedIn, isLibrarian, qrController.renderScanner);
router.get("/users",           isLoggedIn, isLibrarian, wrapAsync(qrController.listUsers));
router.post("/scan/borrow",    isLoggedIn, isLibrarian, wrapAsync(qrController.processBorrowScan));
router.post("/scan/return",    isLoggedIn, isLibrarian, wrapAsync(qrController.processReturnScan));

module.exports = router;
