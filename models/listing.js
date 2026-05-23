const mongoose = require("mongoose");
const Review = require("./review");
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');

const listingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    url: String,
    filename: String,
  },
  price: {
    type: Number,
    default: 1,
    min: 0
  },
  location: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  // New fields for enhanced functionality
  category: {
    type: String,
    enum: ['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Biography', 'Self-Help', 'Business', 'Arts', 'Education', 'Programming', 'Mathematics', 'Physics', 'Chemistry', 'Literature', 'Philosophy', 'Psychology', 'Other'],
    default: 'Other',
    index: true
  },
  author: {
    type: String,
    trim: true,
    index: true
  },
  isbn: {
    type: String,
    trim: true,
    sparse: true
  },
  publisher: {
    type: String,
    trim: true
  },
  publishedYear: {
    type: Number,
    min: 1000,
    max: new Date().getFullYear() + 1
  },
  totalQuantity: {
    type: Number,
    default: 1,
    min: 0
  },
  availableQuantity: {
    type: Number,
    default: 1,
    min: 0
  },
  status: {
    type: String,
    enum: ['Available', 'Borrowed', 'Out of Stock', 'Reserved'],
    default: 'Available'
  },
  qrCode: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  language: {
    type: String,
    default: 'English'
  },
  pages: {
    type: Number,
    min: 1
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  borrowCount: {
    type: Number,
    default: 0
  },
  trendingScore: {
    type: Number,
    default: 0,
    index: true
  },
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
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

// Update status based on availability
listingSchema.pre('save', function(next) {
  if (this.availableQuantity === 0) {
    this.status = 'Out of Stock';
  } else if (this.availableQuantity < this.totalQuantity) {
    this.status = 'Borrowed';
  } else {
    this.status = 'Available';
  }
  this.updatedAt = Date.now();
  next();
});

// Cascade delete reviews when listing is deleted
listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id : { $in: listing.reviews}});
  }
});

// Add pagination plugin
listingSchema.plugin(mongoosePaginate);

// Indexes for better query performance
listingSchema.index({ title: 'text', author: 'text', description: 'text', tags: 'text' });
listingSchema.index({ category: 1, status: 1 });
listingSchema.index({ createdAt: -1 });

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;