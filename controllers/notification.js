const Notification = require("../models/notification.js");

// Get all notifications for current user
module.exports.getNotifications = async (req, res) => {
    const notifications = await Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 }).limit(50);
    res.render("notifications.ejs", { notifications });
};

// Mark all as read
module.exports.markAllRead = async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ success: true });
};

// Mark one as read
module.exports.markRead = async (req, res) => {
    await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true });
    res.json({ success: true });
};

// Get unread count (for navbar badge)
module.exports.unreadCount = async (req, res) => {
    const count = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ count });
};
