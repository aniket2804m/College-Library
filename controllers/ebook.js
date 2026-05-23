const EBook = require("../models/ebook.js");

module.exports.index = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const category = req.query.category;
    const search = req.query.search;
    let query = { isPublic: true };
    if (category) query.category = category;
    if (search) query.$text = { $search: search };
    const options = { page, limit: 12, sort: { createdAt: -1 }, populate: 'uploadedBy' };
    const ebooks = await EBook.paginate(query, options);
    res.render("ebooks/index.ejs", { ebooks, category, search });
};

module.exports.renderUpload = (req, res) => {
    res.render("ebooks/upload.ejs");
};

module.exports.upload = async (req, res) => {
    const { title, author, description, category, tags, language, pages, publishedYear } = req.body;
    if (!req.files || !req.files.pdfFile) {
        req.flash("error", "Please upload a PDF file!");
        return res.redirect(req.body._returnTo ? "/admin/ebooks/upload" : "/ebooks/upload");
    }
    const ebook = new EBook({
        title, author, description, category,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        language, pages, publishedYear,
        uploadedBy: req.user._id,
        pdfFile: { url: req.files.pdfFile[0].path, filename: req.files.pdfFile[0].filename }
    });
    if (req.files.coverImage) {
        ebook.coverImage = { url: req.files.coverImage[0].path, filename: req.files.coverImage[0].filename };
    }
    await ebook.save();
    req.flash("success", "E-Book uploaded successfully!");
    res.redirect(req.body._returnTo || "/ebooks");
};

module.exports.show = async (req, res) => {
    const ebook = await EBook.findById(req.params.id).populate("uploadedBy");
    if (!ebook) { req.flash("error", "E-Book not found!"); return res.redirect("/ebooks"); }
    ebook.views += 1;
    await ebook.save();
    res.render("ebooks/show.ejs", { ebook });
};

module.exports.download = async (req, res) => {
    const ebook = await EBook.findById(req.params.id);
    if (!ebook) { req.flash("error", "E-Book not found!"); return res.redirect("/ebooks"); }
    ebook.downloads += 1;
    await ebook.save();
    res.redirect(ebook.pdfFile.url);
};

module.exports.destroy = async (req, res) => {
    const ebook = await EBook.findById(req.params.id);
    if (!ebook) { req.flash("error", "E-Book not found!"); return res.redirect("/ebooks"); }
    if (ebook.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        req.flash("error", "Unauthorized!"); return res.redirect("/ebooks");
    }
    await EBook.findByIdAndDelete(req.params.id);
    req.flash("success", "E-Book deleted.");
    res.redirect("/ebooks");
};
