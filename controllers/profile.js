const User = require("../models/user.js");
const BorrowRecord = require("../models/borrowRecord.js");
const Reservation = require("../models/reservation.js");
const Notification = require("../models/notification.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

module.exports.showProfile = async (req, res) => {
    const user = await User.findById(req.user._id);
    const activeBorrows = await BorrowRecord.find({ borrower: req.user._id, status: { $in: ['Borrowed', 'Overdue'] } }).populate("book");
    const borrowHistory = await BorrowRecord.find({ borrower: req.user._id }).populate("book").sort({ createdAt: -1 }).limit(10);
    const reservations = await Reservation.find({ user: req.user._id, status: { $in: ['Pending', 'Ready'] } }).populate("book");
    const unreadNotifs = await Notification.countDocuments({ user: req.user._id, read: false });

    res.render("profile.ejs", { profileUser: user, activeBorrows, borrowHistory, reservations, unreadNotifs });
};

module.exports.renderEditProfile = async (req, res) => {
    const user = await User.findById(req.user._id);
    res.render("editProfile.ejs", { profileUser: user });
};

module.exports.updateProfile = async (req, res) => {
    const { fullName, phone, department, studentId } = req.body;
    const update = { fullName, phone, department, studentId };
    if (req.file) {
        update.profileImage = { url: req.file.path, filename: req.file.filename };
    }
    await User.findByIdAndUpdate(req.user._id, update);
    req.flash("success", "Profile updated successfully!");
    res.redirect("/profile");
};
