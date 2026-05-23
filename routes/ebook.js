const express = require("express");
const router = express.Router();
const wrapAsync = require("../Utils/wrapAsync.js");
const { isLoggedIn, isAdmin, isLibrarian } = require("../middleware.js");
const multer = require("multer");
const { mixedStorage } = require("../cloudConfig.js");
const upload = multer({ storage: mixedStorage });
const ebookController = require("../controllers/ebook.js");

router.get("/", wrapAsync(ebookController.index));
router.get("/upload", isLoggedIn, isLibrarian, ebookController.renderUpload);
router.post("/", isLoggedIn, isLibrarian,
    upload.fields([{ name: 'pdfFile', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]),
    wrapAsync(ebookController.upload)
);
router.get("/:id", wrapAsync(ebookController.show));
router.get("/:id/download", wrapAsync(ebookController.download));
router.delete("/:id", isLoggedIn, isAdmin, wrapAsync(ebookController.destroy)); // admin only

module.exports = router;
