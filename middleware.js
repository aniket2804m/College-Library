const Listing = require("./models/listing");
const ExpressError = require("./Utils/ExpressError.js");
const { reviewSchema } = require("./Schema.js");
const Review = require("./models/review.js");

// ─── Role Helpers ────────────────────────────────────────────────────────────
function isAdminUser(user) {
  if (!user) return false;
  return (
    user.username === 'Aniket' ||
    user.username === 'admin' ||
    user.username === 'aniket_admin' ||
    user.role === 'admin'
  );
}
function isLibrarianUser(user) {
  if (!user) return false;
  return isAdminUser(user) || user.role === 'librarian';
}
module.exports.isAdminUser = isAdminUser;
module.exports.isLibrarianUser = isLibrarianUser;

// ─── Authentication ──────────────────────────────────────────────────────────
module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in!");
    return res.redirect("/login");
  }
  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

// ─── Role Guards ─────────────────────────────────────────────────────────────
// Admin only (role === 'admin')
module.exports.isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in!");
    return res.redirect("/login");
  }
  if (!isAdminUser(req.user)) {
    req.flash("error", "Access denied — admin only.");
    return res.redirect("/listings");
  }
  next();
};

// Librarian or Admin (library management operations)
module.exports.isLibrarian = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in!");
    return res.redirect("/login");
  }
  if (!isLibrarianUser(req.user)) {
    req.flash("error", "Access denied — librarian or admin only.");
    return res.redirect("/listings");
  }
  next();
};

// Alias kept for backward compat
module.exports.isAniket = module.exports.isAdmin;

module.exports.isOwner = async (req, res, next) => {
  let { id } = req.params;
  let listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Book not found!");
    return res.redirect("/listings");
  }
  if (!res.locals.currUser) {
    req.flash("error", "You must be logged in");
    return res.redirect("/login");
  }
  if (!isLibrarianUser(res.locals.currUser)) {
    req.flash("error", "Only librarian or admin can edit or delete books");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

// ─── Validation ──────────────────────────────────────────────────────────────
module.exports.validateReview = (req, res, next) => {
  let { error } = reviewSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

module.exports.isReviewAuthor = async (req, res, next) => {
  let { id, reviewId } = req.params;
  let review = await Review.findById(reviewId);
  if (!review) {
    req.flash("error", "Review not found!");
    return res.redirect(`/listings/${id}`);
  }
  if (!review.author.equals(res.locals.currUser._id) && !isLibrarianUser(res.locals.currUser)) {
    req.flash("error", "You are not the author of this review");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

module.exports.isActiveUser = (req, res, next) => {
  if (req.user && !req.user.isActive) {
    req.flash("error", "Your account has been deactivated. Please contact admin.");
    return res.redirect("/");
  }
  next();
};