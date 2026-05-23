const User = require("../models/user.js");
const Listing = require("../models/listing.js");
const BorrowRecord = require("../models/borrowRecord.js");
const Blog = require("../models/blog.js");
const ResearchPaper = require("../models/researchPaper.js");
const Review = require("../models/review.js");
const Ebook = require("../models/ebook.js");
const Notification = require("../models/notification.js");
const { sendWelcomeEmail, sendBorrowApproved, sendDueDateChanged, sendManualReminder } = require("../Utils/emailService.js");
const { isAdminUser } = require("../middleware.js");

module.exports.dashboard = async (req, res) => {
    const totalBooks = await Listing.countDocuments();
    const totalUsers = await User.countDocuments();
    const activeBorrows = await BorrowRecord.countDocuments({ status: { $in: ['Borrowed', 'Overdue'] } });
    const totalBlogs = await Blog.countDocuments();
    const totalResearch = await ResearchPaper.countDocuments({ status: 'Approved' });
    const pendingResearch = await ResearchPaper.countDocuments({ status: 'Pending' });
    
    const popularBooks = await Listing.find()
        .sort({ borrowCount: -1 })
        .limit(5)
        .select('title borrowCount image');
    
    const recentUsers = await User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('username email createdAt');
    
    const recentReviews = await Review.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('author');
    
    const overdueBooks = await BorrowRecord.find({ status: 'Overdue' })
        .populate('book borrower')
        .limit(10);
    
    res.render("admin/dashboard.ejs", {
        totalBooks,
        totalUsers,
        activeBorrows,
        totalReviews: recentReviews.length,
        recentBorrows: overdueBooks,
        stats: {
            totalBooks,
            totalUsers,
            activeBorrows,
            totalBlogs,
            totalResearch,
            pendingResearch
        },
        popularBooks,
        recentUsers,
        recentReviews,
        overdueBooks
    });
};

module.exports.listUsers = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    
    const users = await User.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    
    const total = await User.countDocuments();
    
    res.render("admin/users.ejs", {
        users,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
    });
};

module.exports.toggleUserStatus = async (req, res) => {
    const user = await User.findById(req.params.id);
    
    if (!user) {
        req.flash("error", "User not found!");
        return res.redirect("/admin/users");
    }

    // Librarians can only toggle regular users, not admins or other librarians
    if (!isAdminUser(req.user) && (user.role === 'admin' || user.role === 'librarian')) {
        req.flash("error", "Librarians can only activate/deactivate student accounts.");
        return res.redirect("/admin/users");
    }
    
    user.isActive = !user.isActive;
    await User.collection.updateOne({ _id: user._id }, { $set: { isActive: user.isActive } });
    
    req.flash("success", `User ${user.isActive ? 'activated' : 'deactivated'} successfully!`);
    res.redirect("/admin/users");
};

module.exports.makeAdmin = async (req, res) => {
    const user = await User.findById(req.params.id);
    
    if (!user) {
        req.flash("error", "User not found!");
        return res.redirect("/admin/users");
    }
    
    user.role = user.role === 'admin' ? 'user' : 'admin';
    await User.collection.updateOne({ _id: user._id }, { $set: { role: user.role } });
    
    req.flash("success", `User role updated to ${user.role}!`);
    res.redirect("/admin/users");
};

module.exports.changeRole = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        req.flash("error", "User not found!");
        return res.redirect("/admin/users");
    }
    const allowed = ['user', 'librarian', 'admin'];
    if (!allowed.includes(req.body.role)) {
        req.flash("error", "Invalid role.");
        return res.redirect("/admin/users");
    }
    user.role = req.body.role;
    await User.collection.updateOne({ _id: user._id }, { $set: { role: user.role } });
    req.flash("success", `${user.username}'s role updated to ${user.role}.`);
    res.redirect("/admin/users");
};

module.exports.listBorrows = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const status = req.query.status;
    const limit = 20;
    
    let query = {};
    if (status) query.status = status;
    
    const borrows = await BorrowRecord.find(query)
        .populate('book borrower')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    
    const total = await BorrowRecord.countDocuments(query);

    // Always fetch pending requests for the badge count
    const pendingCount = await BorrowRecord.countDocuments({ status: 'Pending' });
    
    res.render("admin/borrows.ejs", {
        borrows,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        filterStatus: status,
        pendingBorrowCount: pendingCount
    });
};

module.exports.approveBorrow = async (req, res) => {
    const record = await BorrowRecord.findById(req.params.id).populate('book borrower');
    if (!record) { req.flash("error", "Request not found!"); return res.redirect("/admin/borrows?status=Pending"); }
    if (record.status !== 'Pending') { req.flash("error", "Request already processed."); return res.redirect("/admin/borrows?status=Pending"); }

    const book = await Listing.findById(record.book._id);
    if (!book || book.availableQuantity <= 0) {
        req.flash("error", "Book is no longer available!");
        return res.redirect("/admin/borrows?status=Pending");
    }

    // Approve: update status, decrease quantity
    record.status = 'Borrowed';
    record.issuedBy = req.user._id;
    record.issueDate = new Date();
    await record.save();

    book.availableQuantity -= 1;
    book.borrowCount += 1;
    await book.save();

    await User.collection.updateOne(
        { _id: record.borrower._id },
        { $push: { borrowedBooks: record._id }, $inc: { totalBorrowed: 1 } }
    );

    // Notify user
    await Notification.create({
        user: record.borrower._id,
        type: 'borrow_confirm',
        title: 'Borrow Request Approved!',
        message: `Your request for "${book.title}" has been approved. Due: ${record.dueDate.toDateString()}`,
        link: '/borrow/current'
    });

    // Send approval email (non-blocking)
    if (record.borrower.email) {
        sendBorrowApproved(record.borrower, book, record.dueDate).catch(() => {});
    }

    req.flash("success", `Approved: "${book.title}" for ${record.borrower.username}`);
    res.redirect("/admin/borrows?status=Pending");
};

module.exports.rejectBorrow = async (req, res) => {
    const record = await BorrowRecord.findById(req.params.id).populate('book borrower');
    if (!record) { req.flash("error", "Request not found!"); return res.redirect("/admin/borrows?status=Pending"); }
    if (record.status !== 'Pending') { req.flash("error", "Request already processed."); return res.redirect("/admin/borrows?status=Pending"); }

    record.status = 'Rejected';
    await record.save();

    // Notify user
    await Notification.create({
        user: record.borrower._id,
        type: 'announcement',
        title: 'Borrow Request Rejected',
        message: `Your request for "${record.book.title}" was rejected by the librarian.`,
        link: '/listings'
    });

    req.flash("success", `Rejected request for "${record.book.title}"`);
    res.redirect("/admin/borrows?status=Pending");
};

module.exports.forceReturn = async (req, res) => {
    const record = await BorrowRecord.findById(req.params.id).populate('book');
    
    if (!record) {
        req.flash("error", "Borrow record not found!");
        return res.redirect("/admin/borrows");
    }
    
    record.returnDate = new Date();
    record.calculateFine();
    record.status = 'Returned';
    record.returnedTo = req.user._id;
    await record.save();
    
    const book = await Listing.findById(record.book._id);
    book.availableQuantity += 1;
    await book.save();
    
    req.flash("success", "Book returned successfully!");
    res.redirect("/admin/borrows");
};

module.exports.getStats = async (req, res) => {
    const borrowsByMonth = await BorrowRecord.aggregate([
        {
            $group: {
                _id: { $month: "$issueDate" },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
    
    const booksByCategory = await Listing.aggregate([
        {
            $group: {
                _id: "$category",
                count: { $sum: 1 }
            }
        }
    ]);
    
    res.json({
        borrowsByMonth,
        booksByCategory
    });
};

module.exports.reports = async (req, res) => {
    const totalBooks = await Listing.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalBorrows = await BorrowRecord.countDocuments();
    const overdueBorrows = await BorrowRecord.countDocuments({ status: 'Overdue' });
    const totalBlogs = await Blog.countDocuments();
    const totalResearch = await ResearchPaper.countDocuments();
    const totalEbooks = await Ebook.countDocuments();

    const borrowsByMonth = await BorrowRecord.aggregate([
        { $group: { _id: { $month: "$issueDate" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);
    const booksByCategory = await Listing.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    res.render("admin/reports.ejs", {
        totalBooks, totalUsers, totalBorrows, overdueBorrows,
        totalBlogs, totalResearch, totalEbooks,
        borrowsByMonth, booksByCategory
    });
};

// ── Delete user ──────────────────────────────────────────────────────────────
module.exports.deleteUser = async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    req.flash("success", "User deleted.");
    res.redirect("/admin/users");
};

// ── Add student (admin creates account directly) ─────────────────────────────
module.exports.renderAddUser = (req, res) => {
    res.render("admin/addUser.ejs");
};

module.exports.addUser = async (req, res) => {
    try {
        const { username, email, password, role, fullName, department, studentId } = req.body;
        const allowedRoles = ['user', 'librarian', 'admin'];
        const assignedRole = allowedRoles.includes(role) ? role : 'user';
        const newUser = new User({ email, username, role: assignedRole, fullName, department, studentId, isApproved: true, isActive: true });
        const registeredUser = await User.register(newUser, password);
        // Force-set isActive & isApproved — passport-local-mongoose v8 may strip these
        await User.collection.updateOne(
            { _id: registeredUser._id },
            { $set: { isActive: true, isApproved: true, role: assignedRole, fullName: fullName || '', department: department || '', studentId: studentId || '' } }
        );
        // Send welcome email with credentials (non-blocking)
        sendWelcomeEmail({ username, email, role: assignedRole }, password).catch(() => {});
        req.flash("success", `Account for ${username} created successfully. Login credentials sent to ${email}.`);
        res.redirect("/admin/users");
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/admin/users/add");
    }
};

// ── Pending approvals ─────────────────────────────────────────────────────────
module.exports.pendingUsers = async (req, res) => {
    // Only librarians need approval — regular users are auto-approved
    const users = await User.find({ isApproved: false, role: { $in: ['librarian', 'user'] } }).sort({ createdAt: -1 });
    res.render("admin/pending.ejs", { users });
};

module.exports.approveUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) { req.flash("error", "User not found."); return res.redirect("/admin/users/pending"); }
    // Use updateOne to avoid passport-local-mongoose v8 stripping hash/salt on save()
    await User.collection.updateOne({ _id: user._id }, { $set: { isApproved: true } });
    req.flash("success", `${user.username} approved.`);
    res.redirect("/admin/users/pending");
};

module.exports.rejectUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) { req.flash("error", "User not found."); return res.redirect("/admin/users/pending"); }
    await User.findByIdAndDelete(req.params.id);
    req.flash("success", "Account rejected and removed.");
    res.redirect("/admin/users/pending");
};

// ── Book management ──────────────────────────────────────────────────────────
module.exports.listBooks = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const search = req.query.search || "";
    let query = {};
    if (search) query.title = { $regex: search, $options: "i" };

    const books = await Listing.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("owner", "username");

    const total = await Listing.countDocuments(query);
    res.render("admin/books.ejs", {
        books, currentPage: page,
        totalPages: Math.ceil(total / limit), search
    });
};

module.exports.renderAddBook = (req, res) => {
    res.render("admin/addBook.ejs");
};

module.exports.createBook = async (req, res) => {
    try {
        const data = req.body.listing || {};
        const newListing = new Listing(data);
        newListing.owner = req.user._id;
        if (req.file) newListing.image = { url: req.file.path, filename: req.file.filename };
        // sync legacy fields
        if (!newListing.author && newListing.country) newListing.author = newListing.country;
        if (!newListing.country && newListing.author) newListing.country = newListing.author;
        if (!newListing.totalQuantity && newListing.price) newListing.totalQuantity = newListing.price;
        if (!newListing.availableQuantity) newListing.availableQuantity = newListing.totalQuantity || 1;
        if (!newListing.price) newListing.price = newListing.totalQuantity || 1;
        await newListing.save();
        req.flash("success", `"${newListing.title}" added to catalog.`);
        res.redirect("/admin/books");
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/admin/books/new");
    }
};

module.exports.renderEditBook = async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) { req.flash("error", "Book not found."); return res.redirect("/admin/books"); }
    res.render("admin/editBook.ejs", { listing });
};

module.exports.updateBook = async (req, res) => {
    try {
        const updateData = { ...req.body.listing };
        if (updateData.author && !updateData.country) updateData.country = updateData.author;
        if (updateData.country && !updateData.author) updateData.author = updateData.country;
        if (updateData.totalQuantity && !updateData.price) updateData.price = updateData.totalQuantity;
        if (updateData.price && !updateData.totalQuantity) updateData.totalQuantity = updateData.price;
        const listing = await Listing.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (req.file) {
            listing.image = { url: req.file.path, filename: req.file.filename };
            await listing.save();
        }
        req.flash("success", `"${listing.title}" updated.`);
        res.redirect("/admin/books");
    } catch (e) {
        req.flash("error", e.message);
        res.redirect(`/admin/books/${req.params.id}/edit`);
    }
};

module.exports.deleteBook = async (req, res) => {
    await Listing.findByIdAndDelete(req.params.id);
    req.flash("success", "Book deleted.");
    res.redirect("/admin/books");
};

// ── Research management ──────────────────────────────────────────────────────
module.exports.listResearch = async (req, res) => {
    const status = req.query.status || "";
    let query = {};
    if (status) query.status = status;
    const papers = await ResearchPaper.find(query)
        .sort({ createdAt: -1 })
        .populate("uploadedBy", "username email");
    res.render("admin/research.ejs", { papers, filterStatus: status });
};

module.exports.approveResearch = async (req, res) => {
    const paper = await ResearchPaper.findById(req.params.id);
    if (!paper) { req.flash("error", "Paper not found."); return res.redirect("/admin/research"); }
    paper.status = 'Approved';
    await paper.save();
    req.flash("success", `"${paper.title}" approved.`);
    res.redirect("/admin/research");
};

module.exports.rejectResearch = async (req, res) => {
    const paper = await ResearchPaper.findById(req.params.id);
    if (!paper) { req.flash("error", "Paper not found."); return res.redirect("/admin/research"); }
    paper.status = 'Rejected';
    await paper.save();
    req.flash("success", `"${paper.title}" rejected.`);
    res.redirect("/admin/research");
};

module.exports.deleteResearch = async (req, res) => {
    await ResearchPaper.findByIdAndDelete(req.params.id);
    req.flash("success", "Research paper deleted.");
    res.redirect("/admin/research");
};

// ── Blog management ──────────────────────────────────────────────────────────
module.exports.listBlogs = async (req, res) => {
    const blogs = await Blog.find()
        .sort({ createdAt: -1 })
        .populate("author", "username");
    res.render("admin/blogs.ejs", { blogs });
};

module.exports.renderNewBlog = (req, res) => {
    res.render("admin/newBlog.ejs");
};

module.exports.createBlog = async (req, res) => {
    const sanitizeHtml = require('sanitize-html');
    const { title, content, category, tags } = req.body.blog || req.body;
    const blog = new Blog({
        title,
        content: sanitizeHtml(content),
        category,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        author: req.user._id
    });
    await blog.save();
    req.flash("success", "Blog post published.");
    res.redirect("/admin/blogs");
};

module.exports.renderEditBlog = async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    if (!blog) { req.flash("error", "Blog not found."); return res.redirect("/admin/blogs"); }
    res.render("admin/editBlog.ejs", { blog });
};

module.exports.updateBlog = async (req, res) => {
    const sanitizeHtml = require('sanitize-html');
    const { title, content, category, tags } = req.body.blog || req.body;
    const blog = await Blog.findById(req.params.id);
    if (!blog) { req.flash("error", "Blog not found."); return res.redirect("/admin/blogs"); }
    blog.title = title;
    blog.content = sanitizeHtml(content);
    blog.category = category;
    blog.tags = tags ? tags.split(',').map(t => t.trim()) : [];
    await blog.save();
    req.flash("success", "Blog updated.");
    res.redirect("/admin/blogs");
};

module.exports.deleteBlog = async (req, res) => {
    await Blog.findByIdAndDelete(req.params.id);
    req.flash("success", "Blog deleted.");
    res.redirect("/admin/blogs");
};

// ── Ebook management ─────────────────────────────────────────────────────────
module.exports.listEbooks = async (req, res) => {
    const ebooks = await Ebook.find()
        .sort({ createdAt: -1 })
        .populate("uploadedBy", "username");
    res.render("admin/ebooks.ejs", { ebooks });
};

module.exports.renderUploadEbook = (req, res) => {
    res.render("admin/uploadEbook.ejs");
};

module.exports.uploadEbook = async (req, res) => {
    const { title, author, description, category, tags, language, pages, publishedYear } = req.body;
    if (!req.files || !req.files.pdfFile) {
        req.flash("error", "Please upload a PDF file!");
        return res.redirect("/admin/ebooks/upload");
    }
    const ebook = new Ebook({
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
    req.flash("success", `"${ebook.title}" uploaded successfully.`);
    res.redirect("/admin/ebooks");
};

module.exports.deleteEbook = async (req, res) => {
    await Ebook.findByIdAndDelete(req.params.id);
    req.flash("success", "E-Book deleted.");
    res.redirect("/admin/ebooks");
};

// ── QR Generator ─────────────────────────────────────────────────────────────
module.exports.renderQrGenerator = async (req, res) => {
    const books = await Listing.find({}, 'title author _id').sort({ title: 1 });
    res.render("admin/qrGenerator.ejs", { books });
};

// ── Change Due Date ───────────────────────────────────────────────────────────
module.exports.changeDueDate = async (req, res) => {
    const record = await BorrowRecord.findById(req.params.id).populate('book borrower');
    if (!record) { req.flash("error", "Borrow record not found!"); return res.redirect("/admin/borrows"); }

    const { dueDateType, dueDateValue } = req.body;
    let newDue;

    if (dueDateType === 'hours') {
        const hours = parseInt(dueDateValue);
        if (!hours || hours < 1) { req.flash("error", "Invalid hours value."); return res.redirect("/admin/borrows"); }
        newDue = new Date(Date.now() + hours * 60 * 60 * 1000);
    } else if (dueDateType === 'date') {
        newDue = new Date(dueDateValue);
        if (isNaN(newDue.getTime())) { req.flash("error", "Invalid date."); return res.redirect("/admin/borrows"); }
    } else {
        req.flash("error", "Invalid due date type."); return res.redirect("/admin/borrows");
    }

    record.dueDate = newDue;
    // Recalculate status
    if (record.status === 'Overdue' && newDue > new Date()) record.status = 'Borrowed';
    await record.save();

    // Send email (non-blocking)
    if (record.borrower && record.borrower.email) {
        sendDueDateChanged(record.borrower, record.book, newDue).catch(() => {});
    }

    req.flash("success", `Due date updated to ${newDue.toDateString()} for "${record.book.title}"`);
    res.redirect("/admin/borrows");
};

// ── Send Manual Reminder ──────────────────────────────────────────────────────
module.exports.sendReminder = async (req, res) => {
    const record = await BorrowRecord.findById(req.params.id).populate('book borrower');
    if (!record) { req.flash("error", "Borrow record not found!"); return res.redirect("/admin/borrows"); }
    if (!record.borrower || !record.borrower.email) {
        req.flash("error", "Student has no email address."); return res.redirect("/admin/borrows");
    }

    const customMessage = req.body.message || '';
    await sendManualReminder(record.borrower, record.book, record.dueDate, customMessage);

    req.flash("success", `Reminder sent to ${record.borrower.username} (${record.borrower.email})`);
    res.redirect("/admin/borrows");
};
