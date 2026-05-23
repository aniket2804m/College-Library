const Notice = require("../models/notice.js");
const User = require("../models/user.js");
const { sendNoticeEmail } = require("../Utils/emailService.js");

// Admin/Librarian: list all notices
module.exports.listNotices = async (req, res) => {
    const notices = await Notice.find()
        .sort({ createdAt: -1 })
        .populate("createdBy", "username");
    res.render("admin/notices.ejs", { notices });
};

// Admin/Librarian: create notice
module.exports.createNotice = async (req, res) => {
    const { title, content, type, audience, sendEmail, expiresAt } = req.body;
    const notice = new Notice({
        title, content, type, audience,
        sendEmail: sendEmail === 'on' || sendEmail === 'true',
        createdBy: req.user._id,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });
    await notice.save();

    // Send email if requested
    if (notice.sendEmail) {
        let query = { isActive: true };
        if (audience === 'students') query.role = 'user';
        else if (audience === 'librarians') query.role = { $in: ['librarian', 'admin'] };
        const users = await User.find(query).select('username email');
        const emailUsers = users.filter(u => u.email);
        if (emailUsers.length > 0) {
            sendNoticeEmail(emailUsers, notice).catch(() => {});
        }
        notice.emailSent = true;
        await notice.save();
    }

    req.flash("success", `Notice "${title}" created${notice.sendEmail ? ' and emailed' : ''}.`);
    res.redirect("/admin/notices");
};

// Admin/Librarian: toggle active
module.exports.toggleNotice = async (req, res) => {
    const notice = await Notice.findById(req.params.id);
    if (!notice) { req.flash("error", "Notice not found."); return res.redirect("/admin/notices"); }
    notice.active = !notice.active;
    await notice.save();
    req.flash("success", `Notice ${notice.active ? 'activated' : 'deactivated'}.`);
    res.redirect("/admin/notices");
};

// Admin only: delete notice
module.exports.deleteNotice = async (req, res) => {
    await Notice.findByIdAndDelete(req.params.id);
    req.flash("success", "Notice deleted.");
    res.redirect("/admin/notices");
};

// Student: view active notices
module.exports.studentNotices = async (req, res) => {
    const now = new Date();
    const notices = await Notice.find({
        active: true,
        $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }, { expiresAt: { $exists: false } }]
    }).sort({ createdAt: -1 }).populate("createdBy", "username");
    res.render("notices.ejs", { notices });
};
