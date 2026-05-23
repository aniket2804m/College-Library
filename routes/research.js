const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const { isLoggedIn, isAdmin, isLibrarian } = require("../middleware.js");
const multer = require("multer");
const { mixedStorage } = require("../cloudConfig.js");
const upload = multer({ storage: mixedStorage });
const researchController = require("../controllers/research.js");

router.get("/", wrapAsync(researchController.index));
router.get("/upload", isLoggedIn, researchController.renderUploadForm);
router.post("/",
  isLoggedIn,
  upload.fields([{ name: 'pdfFile', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]),
  wrapAsync(researchController.uploadPaper)
);
router.get("/:id", wrapAsync(researchController.showPaper));
router.get("/:id/download", wrapAsync(researchController.downloadPaper));
router.delete("/:id", isLoggedIn, isAdmin, wrapAsync(researchController.deletePaper));   // admin only
router.post("/:id/review", isLoggedIn, wrapAsync(researchController.addReview));
router.post("/:id/approve", isLoggedIn, isLibrarian, wrapAsync(researchController.approvePaper)); // librarian+admin
router.post("/:id/reject",  isLoggedIn, isLibrarian, wrapAsync(researchController.rejectPaper));  // librarian+admin

module.exports = router;
