const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    studentId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date:          { type: Date, required: true },
    timeIn:        { type: Date, default: Date.now },
    timeOut:       { type: Date },
    markedVia:     { type: String, enum: ["voice", "button", "manual", "qr"], default: "button" },
    markedViaWifi: { type: String },
    clientIP:      { type: String },
}, { timestamps: true });

attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
