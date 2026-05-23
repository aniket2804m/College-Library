const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');

const ebookSchema = new Schema({
    title: { type: String, required: true, trim: true, index: true },
    author: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: {
        type: String,
        enum: ['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Biography', 'Self-Help', 'Business', 'Education', 'Programming', 'Mathematics', 'Literature', 'Philosophy', 'Other'],
        default: 'Other'
    },
    coverImage: { url: String, filename: String },
    pdfFile: { url: String, filename: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tags: [{ type: String, trim: true }],
    downloads: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
    language: { type: String, default: 'English' },
    pages: { type: Number },
    publishedYear: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

ebookSchema.plugin(mongoosePaginate);
ebookSchema.index({ title: 'text', author: 'text', description: 'text' });
ebookSchema.index({ category: 1 });

module.exports = mongoose.model("EBook", ebookSchema);
