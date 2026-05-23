const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware.js");
const reservationController = require("../controllers/reservation.js");

router.get("/", isLoggedIn, wrapAsync(reservationController.myReservations));
router.post("/:bookId", isLoggedIn, wrapAsync(reservationController.reserve));
router.post("/:id/cancel", isLoggedIn, wrapAsync(reservationController.cancelReservation));

module.exports = router;
