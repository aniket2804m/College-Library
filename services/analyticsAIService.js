/**
 * Analytics AI Service
 * Generates human-readable insights from library data
 */
const Listing = require("../models/listing.js");
const BorrowRecord = require("../models/borrowRecord.js");
const User = require("../models/user.js");

async function getInsights() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo  = new Date(now - 60 * 24 * 60 * 60 * 1000);

    // Borrows this month vs last month
    const thisMonth = await BorrowRecord.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const lastMonth = await BorrowRecord.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });

    // Top category this month
    const catAgg = await BorrowRecord.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $lookup: { from: "listings", localField: "book", foreignField: "_id", as: "bookData" } },
        { $unwind: "$bookData" },
        { $group: { _id: "$bookData.category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 }
    ]);

    // Overdue rate
    const totalActive = await BorrowRecord.countDocuments({ status: { $in: ["Borrowed", "Overdue"] } });
    const overdue = await BorrowRecord.countDocuments({ status: "Overdue" });
    const overdueRate = totalActive > 0 ? Math.round((overdue / totalActive) * 100) : 0;

    // New users this month
    const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // Most borrowed book this month
    const topBookAgg = await BorrowRecord.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: "$book", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
        { $lookup: { from: "listings", localField: "_id", foreignField: "_id", as: "book" } },
        { $unwind: "$book" }
    ]);

    const insights = [];

    // Borrow trend
    if (lastMonth > 0) {
        const change = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
        if (change > 0) insights.push({ icon: "📈", text: `Borrow activity increased by ${change}% compared to last month.`, type: "positive" });
        else if (change < 0) insights.push({ icon: "📉", text: `Borrow activity decreased by ${Math.abs(change)}% compared to last month.`, type: "warning" });
        else insights.push({ icon: "📊", text: `Borrow activity is stable compared to last month.`, type: "neutral" });
    } else {
        insights.push({ icon: "📊", text: `${thisMonth} books borrowed this month.`, type: "neutral" });
    }

    // Top categories
    if (catAgg.length > 0) {
        const topCat = catAgg[0];
        insights.push({ icon: "🔥", text: `"${topCat._id}" is the most borrowed category this month with ${topCat.count} borrows.`, type: "positive" });
        if (catAgg.length > 1) insights.push({ icon: "📚", text: `"${catAgg[1]._id}" is the second most popular category (${catAgg[1].count} borrows).`, type: "neutral" });
    }

    // Overdue
    if (overdueRate > 20) insights.push({ icon: "⚠️", text: `${overdueRate}% of active borrows are overdue. Consider sending reminders.`, type: "warning" });
    else insights.push({ icon: "✅", text: `Overdue rate is ${overdueRate}% — within acceptable range.`, type: "positive" });

    // New users
    insights.push({ icon: "👥", text: `${newUsers} new student${newUsers !== 1 ? "s" : ""} joined this month.`, type: "neutral" });

    // Top book
    if (topBookAgg.length > 0) {
        const tb = topBookAgg[0];
        insights.push({ icon: "⭐", text: `Most borrowed book this month: "${tb.book.title}" (${tb.count} times).`, type: "positive" });
    }

    return insights;
}

module.exports = { getInsights };
