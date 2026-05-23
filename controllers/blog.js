const Blog = require("../models/blog.js");
const ExpressError = require("../Utils/ExpressError.js");
const sanitizeHtml = require('sanitize-html');

// List all blogs
module.exports.index = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const category = req.query.category;
    const search = req.query.search;
    
    let query = { published: true };
    if (category) query.category = category;
    if (search) query.$text = { $search: search };
    
    const options = {
        page: page,
        limit: 9,
        sort: { createdAt: -1 },
        populate: 'author'
    };
    
    const blogs = await Blog.paginate(query, options);
    res.render("blogs/index.ejs", { blogs });
};

// Render new blog form
module.exports.renderNewForm = (req, res) => {
    res.render("blogs/new.ejs");
};

// Create new blog
module.exports.createBlog = async (req, res) => {
    const { title, content, category, tags } = req.body.blog || req.body;
    
    const blog = new Blog({
        title,
        content: sanitizeHtml(content),
        category,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        author: req.user._id
    });
    
    if (req.file) {
        blog.coverImage = {
            url: req.file.path,
            filename: req.file.filename
        };
    }
    
    await blog.save();
    req.flash("success", "Blog post created successfully!");
    res.redirect(req.body._returnTo || `/blogs/${blog._id}`);
};

// Show single blog
module.exports.showBlog = async (req, res) => {
    const blog = await Blog.findById(req.params.id)
        .populate('author')
        .populate('comments.user');
    
    if (!blog) {
        req.flash("error", "Blog not found!");
        return res.redirect("/blogs");
    }
    
    blog.views += 1;
    await blog.save();
    
    res.render("blogs/show.ejs", { blog });
};

// Render edit form
module.exports.renderEditForm = async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
        req.flash("error", "Blog not found!");
        return res.redirect("/blogs");
    }
    
    if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        req.flash("error", "You don't have permission to edit this blog!");
        return res.redirect(`/blogs/${blog._id}`);
    }
    
    res.render("blogs/edit.ejs", { blog });
};

// Update blog
module.exports.updateBlog = async (req, res) => {
    const { title, content, category, tags } = req.body.blog || req.body;
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
        req.flash("error", "Blog not found!");
        return res.redirect("/blogs");
    }
    
    if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        req.flash("error", "You don't have permission to edit this blog!");
        return res.redirect(`/blogs/${blog._id}`);
    }
    
    blog.title = title;
    blog.content = sanitizeHtml(content);
    blog.category = category;
    blog.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
    
    if (req.file) {
        blog.coverImage = {
            url: req.file.path,
            filename: req.file.filename
        };
    }
    
    await blog.save();
    req.flash("success", "Blog updated successfully!");
    res.redirect(`/blogs/${blog._id}`);
};

// Delete blog
module.exports.deleteBlog = async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
        req.flash("error", "Blog not found!");
        return res.redirect("/blogs");
    }
    
    if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        req.flash("error", "You don't have permission to delete this blog!");
        return res.redirect(`/blogs/${blog._id}`);
    }
    
    await Blog.findByIdAndDelete(req.params.id);
    req.flash("success", "Blog deleted successfully!");
    res.redirect("/blogs");
};

// Toggle like
module.exports.toggleLike = async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
        return res.status(404).json({ error: "Blog not found" });
    }
    
    const userIndex = blog.likes.indexOf(req.user._id);
    
    if (userIndex > -1) {
        blog.likes.splice(userIndex, 1);
    } else {
        blog.likes.push(req.user._id);
    }
    
    await blog.updateCounts();
    res.json({ likesCount: blog.likesCount, liked: userIndex === -1 });
};

// Add comment
module.exports.addComment = async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
        req.flash("error", "Blog not found!");
        return res.redirect("/blogs");
    }
    
    blog.comments.push({
        user: req.user._id,
        text: sanitizeHtml(req.body.comment, { allowedTags: [] })
    });
    
    await blog.updateCounts();
    req.flash("success", "Comment added successfully!");
    res.redirect(`/blogs/${blog._id}`);
};

// Delete comment
module.exports.deleteComment = async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
        req.flash("error", "Blog not found!");
        return res.redirect("/blogs");
    }
    
    const comment = blog.comments.id(req.params.commentId);
    
    if (!comment) {
        req.flash("error", "Comment not found!");
        return res.redirect(`/blogs/${blog._id}`);
    }
    
    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        req.flash("error", "You don't have permission to delete this comment!");
        return res.redirect(`/blogs/${blog._id}`);
    }
    
    comment.deleteOne();
    await blog.updateCounts();
    req.flash("success", "Comment deleted successfully!");
    res.redirect(`/blogs/${blog._id}`);
};
