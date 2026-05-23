const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * BorrowRecord Model
 * Tracks all book borrowing and return transactions
 */
const borrowRecordSchema = new Schema({
    book: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true,
        index: true
    },
    borrower: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    issueDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    returnDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['Pending', 'Borrowed', 'Returned', 'Overdue', 'Lost', 'Rejected'],
        default: 'Pending',
        index: true
    },
    fineAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    finePaid: {
        type: Boolean,
        default: false
    },
    renewalCount: {
        type: Number,
        default: 0,
        max: 2
    },
    notes: {
        type: String,
        trim: true
    },
    issuedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    returnedTo: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Calculate fine based on overdue days
borrowRecordSchema.methods.calculateFine = function() {
    if (this.status === 'Returned' || !this.dueDate) {
        return 0;
    }
    
    const today = new Date();
    const dueDate = new Date(this.dueDate);
    
    if (today > dueDate) {
        const overdueDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
        const finePerDay = parseFloat(process.env.LATE_FINE_PER_DAY) || 5;
        this.fineAmount = overdueDays * finePerDay;
        this.status = 'Overdue';
        return this.fineAmount;
    }
    
    return 0;
};

// Check if record is overdue
borrowRecordSchema.methods.isOverdue = function() {
    if (this.status === 'Returned') return false;
    return new Date() > new Date(this.dueDate);
};

// Indexes for better query performance
borrowRecordSchema.index({ borrower: 1, status: 1 });
borrowRecordSchema.index({ book: 1, status: 1 });
borrowRecordSchema.index({ dueDate: 1, status: 1 });
borrowRecordSchema.index({ createdAt: -1 });

module.exports = mongoose.model("BorrowRecord", borrowRecordSchema);
