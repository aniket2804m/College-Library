const BorrowRecord = require("../models/borrowRecord.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const Notification = require("../models/notification.js");
const Reservation = require("../models/reservation.js");
const ExpressError = require("../Utils/ExpressError.js");
const emailService = require("../Utils/emailService.js");

// View borrow history
module.exports.viewHistory = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    
    const records = await BorrowRecord.find({ borrower: req.user._id })
        .populate('book')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    
    const total = await BorrowRecord.countDocuments({ borrower: req.user._id });
    
    res.render("borrow/history.ejs", { 
        records, 
        currentPage: page,
        totalPages: Math.ceil(total / limit)
    });
};

// Borrow a book — creates a PENDING request for librarian approval
module.exports.borrowBook = async (req, res) => {
    const { bookId } = req.params;
    const book = await Listing.findById(bookId);

    if (!book) {
        req.flash("error", "Book not found!");
        return res.redirect("/listings");
    }
    if (book.availableQuantity <= 0) {
        req.flash("error", "This book is currently not available!");
        return res.redirect(`/listings/${bookId}`);
    }

    // Check already has active borrow or pending request
    const existingBorrow = await BorrowRecord.findOne({
        borrower: req.user._id,
        book: bookId,
        status: { $in: ['Pending', 'Borrowed', 'Overdue'] }
    });
    if (existingBorrow) {
        const msg = existingBorrow.status === 'Pending'
            ? "You already have a pending request for this book!"
            : "You have already borrowed this book!";
        req.flash("error", msg);
        return res.redirect(`/listings/${bookId}`);
    }

    const activeBorrows = await BorrowRecord.countDocuments({
        borrower: req.user._id,
        status: { $in: ['Borrowed', 'Overdue'] }
    });
    const maxBooks = parseInt(process.env.MAX_BOOKS_PER_USER) || 5;
    if (activeBorrows >= maxBooks) {
        req.flash("error", `You can only borrow up to ${maxBooks} books at a time!`);
        return res.redirect(`/listings/${bookId}`);
    }

    const maxDays = parseInt(process.env.MAX_BORROW_DAYS) || 14;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + maxDays);

    // Create PENDING record — librarian must approve
    const borrowRecord = new BorrowRecord({
        book: bookId,
        borrower: req.user._id,
        dueDate,
        status: 'Pending'
    });
    await borrowRecord.save();

    // Notify admins/librarians
    await Notification.create({
        user: req.user._id,
        type: 'borrow_confirm',
        title: 'Borrow Request Sent',
        message: `Your request for "${book.title}" has been sent. Awaiting librarian approval.`,
        link: '/borrow/current'
    });

    req.flash("success", `Borrow request sent for "${book.title}"! Awaiting librarian approval.`);
    res.redirect("/borrow/current");
};

// Return a book
module.exports.returnBook = async (req, res) => {
    const { recordId } = req.params;
    const record = await BorrowRecord.findById(recordId).populate('book');
    
    if (!record) {
        req.flash("error", "Borrow record not found!");
        return res.redirect("/borrow/current");
    }
    
    if (record.borrower.toString() !== req.user._id.toString()) {
        req.flash("error", "Unauthorized action!");
        return res.redirect("/borrow/current");
    }
    
    if (record.status === 'Returned') {
        req.flash("error", "This book has already been returned!");
        return res.redirect("/borrow/current");
    }
    
    record.returnDate = new Date();
    record.calculateFine();
    
    if (record.fineAmount > 0) {
        record.status = 'Overdue';
        req.flash("error", `Book returned with a fine of $${record.fineAmount}. Please pay the fine.`);
    } else {
        record.status = 'Returned';
        req.flash("success", "Book returned successfully!");
    }
    
    record.returnedTo = req.user._id;
    await record.save();
    
    const book = await Listing.findById(record.book._id);
    book.availableQuantity += 1;
    await book.save();

    // Notify next reservation holder if any
    const nextRes = await Reservation.findOne({ book: book._id, status: 'Pending' }).populate('user').sort({ reservedAt: 1 });
    if (nextRes) {
        nextRes.status = 'Ready';
        const exp = new Date(); exp.setDate(exp.getDate() + 2);
        nextRes.expiresAt = exp;
        nextRes.notifiedAt = new Date();
        await nextRes.save();
        await Notification.create({
            user: nextRes.user._id,
            type: 'reservation_ready',
            title: 'Reserved Book Available!',
            message: `"${book.title}" is now available. Reserve expires in 48 hours.`,
            link: `/listings/${book._id}`
        });
        emailService.sendReservationReady(nextRes.user, book).catch(() => {});
    }
    
    res.redirect("/borrow/current");
};

// Renew a borrowed book
module.exports.renewBook = async (req, res) => {
    const { recordId } = req.params;
    const record = await BorrowRecord.findById(recordId);
    
    if (!record) {
        req.flash("error", "Borrow record not found!");
        return res.redirect("/borrow/current");
    }
    
    if (record.borrower.toString() !== req.user._id.toString()) {
        req.flash("error", "Unauthorized action!");
        return res.redirect("/borrow/current");
    }
    
    if (record.renewalCount >= 2) {
        req.flash("error", "Maximum renewal limit reached!");
        return res.redirect("/borrow/current");
    }
    
    if (record.isOverdue()) {
        req.flash("error", "Cannot renew overdue books!");
        return res.redirect("/borrow/current");
    }
    
    const maxDays = parseInt(process.env.MAX_BORROW_DAYS) || 14;
    record.dueDate = new Date(record.dueDate);
    record.dueDate.setDate(record.dueDate.getDate() + maxDays);
    record.renewalCount += 1;
    await record.save();
    
    req.flash("success", `Book renewed successfully! New due date: ${record.dueDate.toDateString()}`);
    res.redirect("/borrow/current");
};

// Pay fine
module.exports.payFine = async (req, res) => {
    const { recordId } = req.params;
    const record = await BorrowRecord.findById(recordId);
    
    if (!record) {
        req.flash("error", "Borrow record not found!");
        return res.redirect("/borrow/history");
    }
    
    if (record.borrower.toString() !== req.user._id.toString()) {
        req.flash("error", "Unauthorized action!");
        return res.redirect("/borrow/history");
    }
    
    record.finePaid = true;
    record.status = 'Returned';
    await record.save();
    
    req.flash("success", `Fine of $${record.fineAmount} paid successfully!`);
    res.redirect("/borrow/history");
};

// View current borrowed books
module.exports.currentBorrows = async (req, res) => {
    const borrows = await BorrowRecord.find({
        borrower: req.user._id,
        status: { $in: ['Borrowed', 'Overdue'] }
    }).populate('book').sort({ dueDate: 1 });

    borrows.forEach(r => r.calculateFine());

    const pendingRequests = await BorrowRecord.find({
        borrower: req.user._id,
        status: 'Pending'
    }).populate('book').sort({ createdAt: -1 });

    res.render("borrow/current.ejs", { borrows, pendingRequests });
};
