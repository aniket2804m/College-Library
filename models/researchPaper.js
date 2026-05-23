const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');

/**
 * ResearchPaper Model
 * For academic research paper repository
 */
const researchPaperSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },
    abstract: {
        type: String,
        required: true,
        trim: true
    },
    authors: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        affiliation: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        }
    }],
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    category: {
        type: String,
        enum: ['Computer Science', 'Engineering', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Medicine', 'Social Sciences', 'Business', 'Arts', 'Other'],
        default: 'Other'
    },
    keywords: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    pdfFile: {
        url: {
            type: String,
            required: true
        },
        filename: String,
        size: Number
    },
    coverImage: {
        url: String,
        filename: String
    },
    publicationDate: {
        type: Date
    },
    journal: {
        type: String,
        trim: true
    },
    volume: {
        type: String,
        trim: true
    },
    issue: {
        type: String,
        trim: true
    },
    pages: {
        type: String,
        trim: true
    },
    doi: {
        type: String,
        trim: true,
        sparse: true
    },
    citations: {
        type: Number,
        default: 0
    },
    downloads: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviews: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    featured: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp
researchPaperSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Increment download count
researchPaperSchema.methods.incrementDownloads = function() {
    this.downloads += 1;
    return this.save();
};

// Increment view count
researchPaperSchema.methods.incrementViews = function() {
    this.views += 1;
    return this.save();
};

// Add pagination plugin
researchPaperSchema.plugin(mongoosePaginate);

// Indexes
researchPaperSchema.index({ title: 'text', abstract: 'text', keywords: 'text' });
researchPaperSchema.index({ category: 1, status: 1 });
researchPaperSchema.index({ createdAt: -1 });
researchPaperSchema.index({ featured: 1, status: 1 });
researchPaperSchema.index({ 'authors.name': 1 });

module.exports = mongoose.model("ResearchPaper", researchPaperSchema);
