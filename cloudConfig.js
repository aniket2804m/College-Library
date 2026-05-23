const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Image-only storage (book covers, listing images)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "wanderlust_DEV",
    allowed_formats: ["png", "jpg", "jpeg"],
    resource_type: "image",
  },
});

// Mixed storage — detects field name at upload time:
//   pdfFile  → resource_type: raw  (stored under /raw/upload/)
//   anything else → resource_type: image
const mixedStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isPdf = file.fieldname === "pdfFile";
    return {
      folder: isPdf ? "wanderlust_DEV/pdfs" : "wanderlust_DEV",
      resource_type: isPdf ? "raw" : "image",
      allowed_formats: isPdf ? ["pdf"] : ["png", "jpg", "jpeg"],
    };
  },
});

module.exports = { cloudinary, storage, mixedStorage };
