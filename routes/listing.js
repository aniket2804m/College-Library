const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const { isLoggedIn, isOwner, isLibrarian, isAdmin } = require("../middleware.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });
const listingController = require("../controllers/listings.js");

router
  .route("/")
  .get(wrapAsync(listingController.index))
  .post(isLibrarian, upload.single("image"), wrapAsync(listingController.createListing)); // librarian+admin

router.get("/new", isLibrarian, listingController.renderNewForm); // librarian+admin
router.get("/display", isLoggedIn, listingController.display);

router
  .route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(isLoggedIn, isOwner, upload.single("image"), wrapAsync(listingController.updateListing))
  .delete(isLoggedIn, isAdmin, wrapAsync(listingController.destroyListings)); // admin only

router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;
