const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportlocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullName: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'librarian'],
        default: 'user'
    },
    studentId: {
        type: String,
        trim: true,
        sparse: true
    },
    department: {
        type: String,
        trim: true
    },
    qrCode: {
        type: String
    },
    profileImage: {
        url: String,
        filename: String
    },
    borrowedBooks: [{
        type: Schema.Types.ObjectId,
        ref: "BorrowRecord"
    }],
    totalBorrowed: {
        type: Number,
        default: 0
    },
    totalFines: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isApproved: {
        type: Boolean,
        default: true   // existing users auto-approved; new librarians need approval
    },
    preferences: {
        darkMode: {
            type: Boolean,
            default: false
        },
        notifications: {
            type: Boolean,
            default: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    }
});

// Update last login on authentication
userSchema.methods.updateLastLogin = function() {
    this.lastLogin = Date.now();
    return this.save();
};

userSchema.plugin(passportlocalMongoose, {
    usernameField: 'username',
    findByUsername: function(model, queryParameters) {
        // Allow login by username OR email
        const login = queryParameters.username;
        return model.findOne({
            $or: [
                { username: login },
                { email: login }
            ]
        });
    }
});

module.exports = mongoose.model('User', userSchema);