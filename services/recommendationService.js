/**
 * Recommendation Service
 * Analyzes borrow history → detects favorite categories → recommends similar books
 */
const Listing = require("../models/listing.js");
const BorrowRecord = require("../models/borrowRecord.js");

async function getRecommendations(user, limit = 8) {
    let books = [];
    let reason = "Popular Books";

    if (user) {
        const history = await BorrowRecord.find({ borrower: user._id })
            .populate("book", "category tags author _id")
            .sort({ createdAt: -1 })
            .limit(30);

        if (history.length > 0) {
            // Tally categories and tags
            const catCount = {}, tagCount = {};
            history.forEach(r => {
                if (!r.book) return;
                if (r.book.category) catCount[r.book.category] = (catCount[r.book.category] || 0) + 1;
                (r.book.tags || []).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
            });

            const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
            const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
            const borrowedIds = history.map(r => r.book && r.book._id).filter(Boolean);

            // Category + tag match, exclude already borrowed
            books = await Listing.find({
                $or: [
                    { category: { $in: topCats } },
                    { tags: { $in: topTags } }
                ],
                _id: { $nin: borrowedIds },
                availableQuantity: { $gt: 0 }
            }).sort({ trendingScore: -1, borrowCount: -1 }).limit(limit);

            reason = `Based on your interest in ${topCats.slice(0, 2).join(" & ")}`;

            // Pad with popular if not enough
            if (books.length < 4) {
                const extra = await Listing.find({
                    _id: { $nin: [...borrowedIds, ...books.map(b => b._id)] }
                }).sort({ trendingScore: -1, borrowCount: -1 }).limit(limit - books.length);
                books = [...books, ...extra];
                reason = "Popular & Recommended for You";
            }
        } else {
            books = await Listing.find({ availableQuantity: { $gt: 0 } })
                .sort({ trendingScore: -1, borrowCount: -1 }).limit(limit);
            reason = "Most Popular Books";
        }
    } else {
        books = await Listing.find({ availableQuantity: { $gt: 0 } })
            .sort({ trendingScore: -1, rating: -1 }).limit(limit);
        reason = "Top Rated Books";
    }

    return { books, reason };
}

module.exports = { getRecommendations };
