const User = require("../models/user.js");
const { isAdminUser, isLibrarianUser } = require("../middleware.js");
const { sendWelcomeEmail } = require("../Utils/emailService.js");

module.exports.renderSignupForm = (req, res) => {
  res.render("users/signup.ejs");
};

module.exports.signup = async (req, res) => {
  try {
    let { username, email, password } = req.body;
    // Only allow user or librarian from signup form — never admin
    const allowedRoles = ['user', 'librarian'];
    const role = allowedRoles.includes(req.body.role) ? req.body.role : 'user';
    // Both students and librarians need admin approval
    const isApproved = false;
    const newUser = new User({ email, username, role, isApproved, isActive: true });
    const registeredUser = await User.register(newUser, password);
    // Ensure isActive is persisted (passport-local-mongoose v8 may strip it)
    await User.collection.updateOne(
      { _id: registeredUser._id },
      { $set: { isActive: true, isApproved } }
    );
    // Send welcome email (non-blocking)
    sendWelcomeEmail({ username, email, role }, null).catch(() => {});
    req.flash("success", "Account created! Please wait for admin approval before logging in.");
    return res.redirect("/login");
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/signup");
  }
};

module.exports.renderLoginFrom = (req, res) => {
  res.render("users/login.ejs");
};

module.exports.login = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { lastLogin: new Date() });
  } catch(e) {}
  req.flash("success", `Welcome back, ${req.user.username}!`);
  if (isLibrarianUser(req.user)) {
    return res.redirect("/admin/dashboard");
  }
  let redirectUrl = res.locals.redirectUrl || "/";
  res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "You are logged out!");
    res.redirect("/");
  });
};