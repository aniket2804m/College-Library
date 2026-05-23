const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const { isLoggedIn, isAdmin } = require("../middleware.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });
const blogController = require("../controllers/blog.js");

/**
 * Blog Routes
 * Handles blog posts, comments, and likes
 */

// List all blogs
router.get("/", wrapAsync(blogController.index));

// Show create blog form
router.get("/new", isLoggedIn, blogController.renderNewForm);

// Create new blog
router.post("/", isLoggedIn, upload.single("coverImage"), wrapAsync(blogController.createBlog));

// Show single blog
router.get("/:id", wrapAsync(blogController.showBlog));

// Show edit form
router.get("/:id/edit", isLoggedIn, wrapAsync(blogController.renderEditForm));

// Update blog
router.put("/:id", isLoggedIn, upload.single("coverImage"), wrapAsync(blogController.updateBlog));

// Delete blog
router.delete("/:id", isLoggedIn, wrapAsync(blogController.deleteBlog));

// Like/Unlike blog
router.post("/:id/like", isLoggedIn, wrapAsync(blogController.toggleLike));

// Add comment
router.post("/:id/comment", isLoggedIn, wrapAsync(blogController.addComment));

// Delete comment
router.delete("/:id/comment/:commentId", isLoggedIn, wrapAsync(blogController.deleteComment));

module.exports = router;
