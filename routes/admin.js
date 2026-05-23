const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const { isLoggedIn, isAdmin, isLibrarian } = require("../middleware.js");
const adminController = require("../controllers/admin.js");
const multer = require("multer");
const { mixedStorage } = require("../cloudConfig.js");
const upload = multer({ storage: mixedStorage });

// Admin dashboard — librarian + admin
router.get("/dashboard", isLoggedIn, isLibrarian, wrapAsync(adminController.dashboard));

// User management
router.get("/users",            isLoggedIn, isLibrarian, wrapAsync(adminController.listUsers));
router.get("/users/add",        isLoggedIn, isAdmin,     adminController.renderAddUser);          // admin only
router.post("/users/add",       isLoggedIn, isAdmin,     wrapAsync(adminController.addUser));     // admin only
router.get("/users/pending",    isLoggedIn, isLibrarian, wrapAsync(adminController.pendingUsers));
router.post("/users/:id/approve",       isLoggedIn, isLibrarian, wrapAsync(adminController.approveUser));
router.post("/users/:id/reject",        isLoggedIn, isLibrarian, wrapAsync(adminController.rejectUser));
router.post("/users/:id/toggle-status", isLoggedIn, isLibrarian, wrapAsync(adminController.toggleUserStatus));
router.post("/users/:id/make-admin",    isLoggedIn, isAdmin,     wrapAsync(adminController.makeAdmin));    // admin only
router.post("/users/:id/role",          isLoggedIn, isAdmin,     wrapAsync(adminController.changeRole));   // admin only
router.post("/users/:id/delete",        isLoggedIn, isAdmin,     wrapAsync(adminController.deleteUser));   // admin only

// Book management
router.get("/books",            isLoggedIn, isLibrarian, wrapAsync(adminController.listBooks));
router.get("/books/new",        isLoggedIn, isLibrarian, adminController.renderAddBook);
router.post("/books/new",       isLoggedIn, isLibrarian, upload.single("image"), wrapAsync(adminController.createBook));
router.get("/books/:id/edit",   isLoggedIn, isLibrarian, wrapAsync(adminController.renderEditBook));
router.post("/books/:id/edit",  isLoggedIn, isLibrarian, upload.single("image"), wrapAsync(adminController.updateBook));
router.post("/books/:id/delete",isLoggedIn, isAdmin,     wrapAsync(adminController.deleteBook));  // admin only

// Borrow management — librarian + admin
router.get("/borrows",                    isLoggedIn, isLibrarian, wrapAsync(adminController.listBorrows));
router.post("/borrows/:id/approve",       isLoggedIn, isLibrarian, wrapAsync(adminController.approveBorrow));
router.post("/borrows/:id/reject",        isLoggedIn, isLibrarian, wrapAsync(adminController.rejectBorrow));
router.post("/borrows/:id/force-return",  isLoggedIn, isLibrarian, wrapAsync(adminController.forceReturn));
router.post("/borrows/:id/change-due-date", isLoggedIn, isLibrarian, wrapAsync(adminController.changeDueDate));
router.post("/borrows/:id/send-reminder",   isLoggedIn, isLibrarian, wrapAsync(adminController.sendReminder));

// Research management
router.get("/research",           isLoggedIn, isLibrarian, wrapAsync(adminController.listResearch));
router.post("/research/:id/approve", isLoggedIn, isLibrarian, wrapAsync(adminController.approveResearch));
router.post("/research/:id/reject",  isLoggedIn, isLibrarian, wrapAsync(adminController.rejectResearch));
router.post("/research/:id/delete",  isLoggedIn, isAdmin,     wrapAsync(adminController.deleteResearch)); // admin only

// Blog management
router.get("/blogs",          isLoggedIn, isLibrarian, wrapAsync(adminController.listBlogs));
router.get("/blogs/new",      isLoggedIn, isLibrarian, adminController.renderNewBlog);
router.post("/blogs/new",     isLoggedIn, isLibrarian, wrapAsync(adminController.createBlog));
router.get("/blogs/:id/edit", isLoggedIn, isLibrarian, wrapAsync(adminController.renderEditBlog));
router.post("/blogs/:id/edit",isLoggedIn, isLibrarian, wrapAsync(adminController.updateBlog));
router.post("/blogs/:id/delete", isLoggedIn, isAdmin,  wrapAsync(adminController.deleteBlog));  // admin only

// Ebook management
router.get("/ebooks",         isLoggedIn, isLibrarian, wrapAsync(adminController.listEbooks));
router.get("/ebooks/upload",  isLoggedIn, isLibrarian, adminController.renderUploadEbook);
router.post("/ebooks/upload", isLoggedIn, isLibrarian,
    upload.fields([{ name: 'pdfFile', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]),
    wrapAsync(adminController.uploadEbook)
);
router.post("/ebooks/:id/delete", isLoggedIn, isAdmin, wrapAsync(adminController.deleteEbook)); // admin only

// Statistics & Reports
router.get("/stats",     isLoggedIn, isLibrarian, wrapAsync(adminController.getStats));
router.get("/api/stats", isLoggedIn, isLibrarian, wrapAsync(adminController.getStats));
router.get("/reports",   isLoggedIn, isAdmin,     wrapAsync(adminController.reports));  // admin only

// QR Generator — librarian + admin
router.get("/qr", isLoggedIn, isLibrarian, wrapAsync(adminController.renderQrGenerator));

// Attendance report (also accessible via /admin/attendance)
const attendanceCtrl = require("../controllers/attendance.js");
router.get("/attendance",                    isLoggedIn, isLibrarian, wrapAsync(attendanceCtrl.adminReport));
router.post("/attendance/mark",              isLoggedIn, isLibrarian, wrapAsync(attendanceCtrl.adminMark));
router.post("/attendance/delete/:id",        isLoggedIn, isLibrarian, wrapAsync(attendanceCtrl.adminDelete));
router.post("/attendance/wifi",              isLoggedIn, isLibrarian, wrapAsync(attendanceCtrl.addWifi));
router.post("/attendance/wifi/:id/toggle",   isLoggedIn, isLibrarian, wrapAsync(attendanceCtrl.toggleWifi));
router.post("/attendance/wifi/:id/delete",   isLoggedIn, isLibrarian, wrapAsync(attendanceCtrl.deleteWifi));

// Notice management
const noticeController = require("../controllers/notice.js");
router.get("/notices",              isLoggedIn, isLibrarian, wrapAsync(noticeController.listNotices));
router.post("/notices/new",         isLoggedIn, isLibrarian, wrapAsync(noticeController.createNotice));
router.post("/notices/:id/toggle",  isLoggedIn, isLibrarian, wrapAsync(noticeController.toggleNotice));
router.post("/notices/:id/delete",  isLoggedIn, isAdmin,     wrapAsync(noticeController.deleteNotice));

module.exports = router;
