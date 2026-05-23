const Listing = require("../models/listing");
const ExpressError = require("../Utils/ExpressError.js");
const { listingSchema } = require("../Schema.js");

module.exports.index = async (req, res) => {
    const search = req.query.search || "";
    const sort   = req.query.sort   || "";
    let query = {};
    if (search) {
        query.$or = [
            { title:    { $regex: search, $options: "i" } },
            { author:   { $regex: search, $options: "i" } },
            { country:  { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
        ];
    }
    let sortOpt = { createdAt: -1 };
    if (sort === "trending") sortOpt = { borrowCount: -1 };
    const allListings = await Listing.find(query).sort(sortOpt);
    res.render("listings/index.ejs", { allListings, search, sort });
};

module.exports.display = (req, res) => {
    res.render("listings/display.ejs");
}

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
      .populate({
        path: "reviews",
        populate: {
          path: "author",
        },
      })
      .populate("owner");
    if (!listing) {
      req.flash("error", "BookShelf you requested for does not exist!");
      return res.redirect("/listings");
    }
    // console.log(listing);
    res.render("listings/show.ejs", { listing });
  };

module.exports.createListing = async (req, res, next) => {
    let result = listingSchema.validate(req.body);
    if (result.error) {
      throw new ExpressError(404, result.error);
    }
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    if (req.file) {
      newListing.image = { url: req.file.path, filename: req.file.filename };
    }
    // Sync legacy fields
    if (!newListing.author && newListing.country) newListing.author = newListing.country;
    if (!newListing.country && newListing.author) newListing.country = newListing.author;
    if (!newListing.totalQuantity && newListing.price) newListing.totalQuantity = newListing.price;
    if (!newListing.availableQuantity) newListing.availableQuantity = newListing.totalQuantity || newListing.price || 1;
    if (!newListing.price) newListing.price = newListing.totalQuantity || 1;
    await newListing.save();
    req.flash("success", "New Book Added!");
    res.redirect("/listings");
  };

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Book not found!");
      return res.redirect("/listings");
    }
    let originalImageUrl = (listing.image && listing.image.url) ? listing.image.url.replace("/upload", "/upload/h_300,w_250") : "";
    res.render("listings/edit.ejs", { listing, originalImageUrl });
  };

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    const updateData = { ...req.body.listing };
    // Sync legacy fields
    if (updateData.author && !updateData.country) updateData.country = updateData.author;
    if (updateData.country && !updateData.author) updateData.author = updateData.country;
    if (updateData.totalQuantity && !updateData.price) updateData.price = updateData.totalQuantity;
    if (updateData.price && !updateData.totalQuantity) updateData.totalQuantity = updateData.price;
    let listing = await Listing.findByIdAndUpdate(id, updateData, { new: true });

    if(typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = {url, filename};
    await listing.save();
    }
    req.flash("success", "Book Updated");
    res.redirect(`/listings/${id}`);
  };

module.exports.destroyListings = async (req, res) => {
    let { id } = req.params;
    let deleteListing = await Listing.findByIdAndDelete(id);
    console.log(deleteListing);
    req.flash("success", "BookShelf Created! Deleted");
    res.redirect("/listings");
  }