const { processMessage } = require("../services/chatbotService.js");

module.exports.chat = async (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) return res.json({ reply: "Please type a message." });
    const result = await processMessage(message, req.user || null);
    res.json(result);
};
