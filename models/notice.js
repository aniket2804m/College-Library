const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema({
    title:     { type: String, required: true, trim: true },
    content:   { type: String, required: true, trim: true },
    type:      { type: String, enum: ["info", "warning", "urgent", "event"], default: "info" },
    audience:  { type: String, enum: ["all", "students", "librarians"], default: "all" },
    sendEmail: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date },   // optional expiry
    active:    { type: Boolean, default: true }
}, { timestamps: true });

noticeSchema.index({ active: 1, createdAt: -1 });

module.exports = mongoose.model("Notice", noticeSchema);
