const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const chatbotController = require("../controllers/chatbot.js");
const { isLoggedIn, isLibrarian } = require("../middleware.js");
const Listing = require("../models/listing.js");
const { getTrending } = require("../services/trendingService.js");
const { getInsights } = require("../services/analyticsAIService.js");

// Chatbot
router.post("/chat", wrapAsync(chatbotController.chat));

// ── Voice Search ──────────────────────────────────────────────────────────────
router.post("/voice-search", wrapAsync(async (req, res) => {
    const query = (req.body.query || "").trim();
    if (!query) return res.json({ available: false, message: "Please say a book name." });

    // Try exact title first, then partial match
    let book = await Listing.findOne({ title: { $regex: `^${query}$`, $options: "i" } })
        .select("title author availableQuantity totalQuantity location _id");

    if (!book) {
        book = await Listing.findOne({ title: { $regex: query, $options: "i" } })
            .select("title author availableQuantity totalQuantity location _id");
    }

    if (!book) {
        // Try word-by-word match on significant words (>3 chars)
        const words = query.split(/\s+/).filter(w => w.length > 3);
        if (words.length > 0) {
            book = await Listing.findOne({
                $or: words.map(w => ({ title: { $regex: w, $options: "i" } }))
            }).select("title author availableQuantity totalQuantity location _id");
        }
    }

    if (!book) {
        return res.json({
            available: false,
            message: `Sorry, I couldn't find a book matching "${query}" in our catalog.`
        });
    }

    if (book.availableQuantity > 0) {
        return res.json({
            available: true,
            bookId: book._id,
            message: `Yes! "${book.title}" by ${book.author || "Unknown"} is available. ${book.availableQuantity} of ${book.totalQuantity || book.availableQuantity} copies are on the shelf.`,
            url: `/listings/${book._id}`
        });
    } else {
        return res.json({
            available: false,
            bookId: book._id,
            message: `"${book.title}" is currently out of stock. All ${book.totalQuantity || 0} copies are borrowed. You can reserve it and we'll notify you when it's back.`,
            url: `/listings/${book._id}`
        });
    }
}));

// Trending books
router.get("/books/trending", wrapAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 8;
    const books = await getTrending(limit);
    res.json({ books });
}));

// Natural language search
router.get("/search", wrapAsync(async (req, res) => {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ books: [] });

    // Tokenize and build OR query across multiple fields
    const tokens = q.split(/\s+/).filter(t => t.length > 2);
    const regexes = tokens.map(t => new RegExp(t, "i"));

    const books = await Listing.find({
        $or: [
            { title: { $in: regexes } },
            { author: { $in: regexes } },
            { description: { $in: regexes } },
            { tags: { $in: regexes } },
            { category: { $in: regexes } },
            // Full phrase fallback
            { title: { $regex: q, $options: "i" } },
            { author: { $regex: q, $options: "i" } }
        ]
    }).limit(12).select("title author image availableQuantity category _id");

    res.json({ books });
}));

// Admin AI insights
router.get("/admin/ai-insights", isLoggedIn, isLibrarian, wrapAsync(async (req, res) => {
    const insights = await getInsights();
    res.json({ insights });
}));

module.exports = router;
