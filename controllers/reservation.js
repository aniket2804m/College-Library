const Reservation = require("../models/reservation.js");
const Listing = require("../models/listing.js");
const Notification = require("../models/notification.js");

module.exports.reserve = async (req, res) => {
    const { bookId } = req.params;
    const book = await Listing.findById(bookId);
    if (!book) { req.flash("error", "Book not found!"); return res.redirect("/listings"); }

    // Check if already reserved or borrowed
    const existing = await Reservation.findOne({ book: bookId, user: req.user._id, status: { $in: ['Pending', 'Ready'] } });
    if (existing) { req.flash("error", "You already have an active reservation for this book!"); return res.redirect(`/listings/${bookId}`); }

    // If book is available, just borrow it
    if (book.availableQuantity > 0) { req.flash("error", "This book is available — you can borrow it directly!"); return res.redirect(`/listings/${bookId}`); }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const reservation = new Reservation({ book: bookId, user: req.user._id, expiresAt });
    await reservation.save();

    // Create notification
    await Notification.create({
        user: req.user._id,
        type: 'announcement',
        title: 'Reservation Confirmed',
        message: `You've reserved "${book.title}". We'll notify you when it's available.`,
        link: `/listings/${bookId}`
    });

    req.flash("success", `"${book.title}" reserved! You'll be notified when it's available.`);
    res.redirect(`/listings/${bookId}`);
};

module.exports.cancelReservation = async (req, res) => {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) { req.flash("error", "Reservation not found!"); return res.redirect("/profile"); }
    if (reservation.user.toString() !== req.user._id.toString()) { req.flash("error", "Unauthorized!"); return res.redirect("/profile"); }
    reservation.status = 'Cancelled';
    await reservation.save();
    req.flash("success", "Reservation cancelled.");
    res.redirect("/profile");
};

module.exports.myReservations = async (req, res) => {
    const reservations = await Reservation.find({ user: req.user._id })
        .populate("book").sort({ reservedAt: -1 });
    res.render("reservations.ejs", { reservations });
};
