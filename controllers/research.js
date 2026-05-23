const ResearchPaper = require("../models/researchPaper.js");
const Notification = require("../models/notification.js");
const emailService = require("../Utils/emailService.js");
const ExpressError = require("../Utils/ExpressError.js");

module.exports.index = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const category = req.query.category;
    const search = req.query.search;
    
    let query = { status: 'Approved' };
    if (category) query.category = category;
    if (search) query.$text = { $search: search };
    
    const options = {
        page: page,
        limit: 12,
        sort: { createdAt: -1 },
        populate: 'uploadedBy'
    };
    
    const papers = await ResearchPaper.paginate(query, options);
    res.render("research/index.ejs", { papers });
};

module.exports.renderUploadForm = (req, res) => {
    res.render("research/upload.ejs");
};

module.exports.uploadPaper = async (req, res) => {
    const { title, abstract, category, keywords, journal, publicationDate } = req.body;
    const authors = JSON.parse(req.body.authors || '[]');
    
    if (!req.files || !req.files.pdfFile) {
        req.flash("error", "Please upload a PDF file!");
        return res.redirect("/research/upload");
    }
    
    const paper = new ResearchPaper({
        title,
        abstract,
        authors,
        category,
        keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
        journal,
        publicationDate,
        uploadedBy: req.user._id,
        pdfFile: {
            url: req.files.pdfFile[0].path,
            filename: req.files.pdfFile[0].filename,
            size: req.files.pdfFile[0].size
        }
    });
    
    if (req.files.coverImage) {
        paper.coverImage = {
            url: req.files.coverImage[0].path,
            filename: req.files.coverImage[0].filename
        };
    }
    
    await paper.save();
    req.flash("success", "Research paper uploaded successfully! Awaiting approval.");
    res.redirect(`/research/${paper._id}`);
};

module.exports.showPaper = async (req, res) => {
    const paper = await ResearchPaper.findById(req.params.id)
        .populate('uploadedBy')
        .populate('reviews.user');
    
    if (!paper) {
        req.flash("error", "Research paper not found!");
        return res.redirect("/research");
    }
    
    paper.views += 1;
    await paper.save();
    
    res.render("research/show.ejs", { paper });
};

module.exports.downloadPaper = async (req, res) => {
    const paper = await ResearchPaper.findById(req.params.id);
    if (!paper) {
        req.flash("error", "Research paper not found!");
        return res.redirect("/research");
    }
    await paper.incrementDownloads();
    res.redirect(paper.pdfFile.url);
};

module.exports.deletePaper = async (req, res) => {
    const paper = await ResearchPaper.findById(req.params.id);
    
    if (!paper) {
        req.flash("error", "Research paper not found!");
        return res.redirect("/research");
    }
    
    if (paper.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        req.flash("error", "You don't have permission to delete this paper!");
        return res.redirect(`/research/${paper._id}`);
    }
    
    await ResearchPaper.findByIdAndDelete(req.params.id);
    req.flash("success", "Research paper deleted successfully!");
    res.redirect("/research");
};

module.exports.addReview = async (req, res) => {
    const paper = await ResearchPaper.findById(req.params.id);
    
    if (!paper) {
        req.flash("error", "Research paper not found!");
        return res.redirect("/research");
    }
    
    paper.reviews.push({
        user: req.user._id,
        rating: req.body.rating,
        comment: req.body.comment
    });
    
    const avgRating = paper.reviews.reduce((sum, r) => sum + r.rating, 0) / paper.reviews.length;
    paper.rating = avgRating;
    
    await paper.save();
    req.flash("success", "Review added successfully!");
    res.redirect(`/research/${paper._id}`);
};

module.exports.approvePaper = async (req, res) => {
    const paper = await ResearchPaper.findById(req.params.id);
    
    if (!paper) {
        req.flash("error", "Research paper not found!");
        return res.redirect("/admin/dashboard");
    }
    
    paper.status = 'Approved';
    await paper.save();

    // Notify uploader
    const uploader = await require("../models/user.js").findById(paper.uploadedBy);
    if (uploader) {
        await Notification.create({ user: uploader._id, type: 'research_approved', title: 'Research Paper Approved', message: `Your paper "${paper.title}" has been approved and published.`, link: `/research/${paper._id}` });
        emailService.sendResearchApproved(uploader, paper).catch(() => {});
    }
    
    req.flash("success", "Research paper approved!");
    res.redirect(`/research/${paper._id}`);
};

module.exports.rejectPaper = async (req, res) => {
    const paper = await ResearchPaper.findById(req.params.id);
    
    if (!paper) {
        req.flash("error", "Research paper not found!");
        return res.redirect("/admin/dashboard");
    }
    
    paper.status = 'Rejected';
    await paper.save();
    
    req.flash("success", "Research paper rejected!");
    res.redirect("/admin/dashboard");
};
