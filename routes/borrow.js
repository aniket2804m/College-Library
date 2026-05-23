const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware.js");
const borrowController = require("../controllers/borrow.js");

/**
 * Borrow Routes
 * Handles book borrowing and return operations
 */

// View borrow history
router.get("/history", isLoggedIn, wrapAsync(borrowController.viewHistory));

// View current borrowed books
router.get("/current", isLoggedIn, wrapAsync(borrowController.currentBorrows));

// Return a book
router.post("/:recordId/return", isLoggedIn, wrapAsync(borrowController.returnBook));

// Renew a borrowed book
router.post("/:recordId/renew", isLoggedIn, wrapAsync(borrowController.renewBook));

// Pay fine
router.post("/:recordId/pay-fine", isLoggedIn, wrapAsync(borrowController.payFine));

// Borrow a book (must be LAST — catch-all POST /:bookId)
router.post("/:bookId", isLoggedIn, wrapAsync(borrowController.borrowBook));

module.exports = router;
