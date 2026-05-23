/**
 * Trending Service
 * trendingScore = borrowCount * 3 + recentBorrows * 2 + rating * 5
 */
const Listing = require("../models/listing.js");
const BorrowRecord = require("../models/borrowRecord.js");

// Recalculate and persist trending scores for all books
async function recalculateTrending() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Count recent borrows per book
    const recentAgg = await BorrowRecord.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: "$book", recentCount: { $sum: 1 } } }
    ]);
    const recentMap = {};
    recentAgg.forEach(r => { recentMap[r._id.toString()] = r.recentCount; });

    const books = await Listing.find({}, "_id borrowCount rating");
    const bulkOps = books.map(book => {
        const recent = recentMap[book._id.toString()] || 0;
        const score = (book.borrowCount || 0) * 3 + recent * 2 + (book.rating || 0) * 5;
        return {
            updateOne: {
                filter: { _id: book._id },
                update: { $set: { trendingScore: score } }
            }
        };
    });

    if (bulkOps.length > 0) await Listing.bulkWrite(bulkOps);
}

// Get top trending books (recalculates on each call — fine for small collections)
async function getTrending(limit = 8) {
    await recalculateTrending();
    return Listing.find({ availableQuantity: { $gt: 0 } })
        .sort({ trendingScore: -1 })
        .limit(limit)
        .select("title author image availableQuantity borrowCount rating trendingScore _id category");
}

module.exports = { getTrending, recalculateTrending };
