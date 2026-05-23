const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reservationSchema = new Schema({
    book: { type: Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
        type: String,
        enum: ['Pending', 'Ready', 'Fulfilled', 'Cancelled', 'Expired'],
        default: 'Pending',
        index: true
    },
    reservedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    notifiedAt: { type: Date },
    notes: { type: String, trim: true }
});

reservationSchema.index({ book: 1, user: 1, status: 1 });
reservationSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("Reservation", reservationSchema);
