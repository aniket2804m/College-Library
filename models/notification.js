const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
        type: String,
        enum: ['borrow_confirm', 'return_reminder', 'overdue_alert', 'reservation_ready', 'research_approved', 'announcement', 'fine_notice'],
        required: true
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    read: { type: Boolean, default: false, index: true },
    emailSent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true }
});

notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
