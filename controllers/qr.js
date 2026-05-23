const QRCode = require('qrcode');
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const BorrowRecord = require("../models/borrowRecord.js");

module.exports.generateBookQR = async (req, res) => {
    const book = await Listing.findById(req.params.bookId);
    
    if (!book) {
        req.flash("error", "Book not found!");
        return res.redirect("/listings");
    }
    
    const qrData = JSON.stringify({
        type: 'book',
        id: book._id.toString(),
        title: book.title
    });
    
    const qrCodeDataURL = await QRCode.toDataURL(qrData);
    await Listing.collection.updateOne({ _id: book._id }, { $set: { qrCode: qrCodeDataURL } });
    
    res.json({ qrCode: qrCodeDataURL });
};

module.exports.generateUserQR = async (req, res) => {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
        req.flash("error", "User not found!");
        return res.redirect("/");
    }
    
    const qrData = JSON.stringify({
        type: 'user',
        id: user._id.toString(),
        username: user.username
    });
    
    const qrCodeDataURL = await QRCode.toDataURL(qrData);
    await User.collection.updateOne({ _id: user._id }, { $set: { qrCode: qrCodeDataURL } });
    
    res.json({ qrCode: qrCodeDataURL });
};

module.exports.renderScanner = (req, res) => {
    res.render("qr/scanner.ejs");
};

module.exports.listUsers = async (req, res) => {
    const users = await User.find({ isApproved: true, isActive: true }, 'username email role').sort({ username: 1 });
    res.json(users);
};

module.exports.processBorrowScan = async (req, res) => {
    try {
        const { bookData, userData } = req.body;
        
        const bookInfo = JSON.parse(bookData);
        const userInfo = JSON.parse(userData);
        
        const book = await Listing.findById(bookInfo.id);
        const user = await User.findById(userInfo.id);
        
        if (!book || !user) {
            return res.status(404).json({ error: "Book or user not found!" });
        }
        
        if (book.availableQuantity <= 0) {
            return res.status(400).json({ error: "Book not available!" });
        }
        
        const existingBorrow = await BorrowRecord.findOne({
            borrower: user._id,
            book: book._id,
            status: { $in: ['Borrowed', 'Overdue'] }
        });
        
        if (existingBorrow) {
            return res.status(400).json({ error: "User already has this book!" });
        }
        
        const maxDays = parseInt(process.env.MAX_BORROW_DAYS) || 14;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + maxDays);
        
        const borrowRecord = new BorrowRecord({
            book: book._id,
            borrower: user._id,
            dueDate: dueDate,
            status: 'Borrowed',
            issuedBy: req.user._id
        });
        
        await borrowRecord.save();
        
        book.availableQuantity -= 1;
        book.borrowCount += 1;
        await book.save();
        
        await User.collection.updateOne(
            { _id: user._id },
            { $push: { borrowedBooks: borrowRecord._id }, $inc: { totalBorrowed: 1 } }
        );
        
        res.json({ 
            success: true, 
            message: `Book "${book.title}" issued to ${user.username}`,
            dueDate: dueDate.toDateString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports.processReturnScan = async (req, res) => {
    try {
        const { bookData, userData } = req.body;
        
        const bookInfo = JSON.parse(bookData);
        const userInfo = JSON.parse(userData);
        
        const record = await BorrowRecord.findOne({
            book: bookInfo.id,
            borrower: userInfo.id,
            status: { $in: ['Borrowed', 'Overdue'] }
        }).populate('book');
        
        if (!record) {
            return res.status(404).json({ error: "No active borrow record found!" });
        }
        
        record.returnDate = new Date();
        record.calculateFine();
        record.status = 'Returned';
        record.returnedTo = req.user._id;
        await record.save();
        
        const book = await Listing.findById(record.book._id);
        book.availableQuantity += 1;
        await book.save();
        
        res.json({ 
            success: true, 
            message: `Book "${book.title}" returned successfully`,
            fine: record.fineAmount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
