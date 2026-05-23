const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");

const userController = require("../controllers/users.js");

router.get("/signup", userController.renderSignupForm );

router.post(
  "/signup",
  wrapAsync(userController.signup)
);

router.get("/login", userController.renderLoginFrom);

router.post(
  "/login",
  saveRedirectUrl,
  (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        req.flash("error", info?.message || "Invalid username or password.");
        return res.redirect("/login");
      }
      // Block before session is created
      if (user.isApproved === false) {
        req.flash("error", "Your account is pending admin approval. Please wait.");
        return res.redirect("/login");
      }
      if (user.isActive === false) {
        req.flash("error", "Your account has been deactivated. Please contact admin.");
        return res.redirect("/login");
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        // Explicitly save session before proceeding to ensure it's persisted
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          next();
        });
      });
    })(req, res, next);
  },
  userController.login
);

router.get("/logout", userController.logout);

module.exports = router;
