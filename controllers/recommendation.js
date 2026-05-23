const { getRecommendations } = require("../services/recommendationService.js");

module.exports.getRecommendations = async (req, res) => {
    try {
        const { books, reason } = await getRecommendations(req.user || null);
        res.json({ recommendations: books, reason });
    } catch (err) {
        console.error("Recommendation error:", err);
        res.json({ recommendations: [], reason: "Popular Books" });
    }
};

module.exports.renderRecommendations = async (req, res) => {
    res.render("recommendations.ejs");
};
