const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');

/**
 * Blog Model
 * For library news, updates, and articles
 */
const blogSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: true
    },
    excerpt: {
        type: String,
        trim: true,
        maxlength: 300
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    category: {
        type: String,
        enum: ['News', 'Events', 'Tips', 'Reviews', 'Technology', 'Education', 'Announcements', 'Other'],
        default: 'Other'
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    coverImage: {
        url: String,
        filename: String
    },
    likes: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    likesCount: {
        type: Number,
        default: 0
    },
    comments: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        text: {
            type: String,
            required: true,
            trim: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    commentsCount: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    },
    published: {
        type: Boolean,
        default: true
    },
    featured: {
        type: Boolean,
        default: false
    },
    slug: {
        type: String,
        unique: true,
        sparse: true
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

// Generate slug from title
blogSchema.pre('save', function(next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            + '-' + Date.now();
    }
    
    // Generate excerpt if not provided
    if (!this.excerpt && this.content) {
        this.excerpt = this.content.substring(0, 200).trim() + '...';
    }
    
    this.updatedAt = Date.now();
    next();
});

// Update counts
blogSchema.methods.updateCounts = function() {
    this.likesCount = this.likes.length;
    this.commentsCount = this.comments.length;
    return this.save();
};

// Add pagination plugin
blogSchema.plugin(mongoosePaginate);

// Indexes
blogSchema.index({ title: 'text', content: 'text', tags: 'text' });
blogSchema.index({ category: 1, published: 1 });
blogSchema.index({ createdAt: -1 });
blogSchema.index({ featured: 1, published: 1 });

module.exports = mongoose.model("Blog", blogSchema);
