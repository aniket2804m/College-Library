const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const path = require("path");
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URL);
    console.log("connected to DB");
    
    // Clean up existing data
    await Listing.deleteMany({});
    await User.deleteMany({});
    console.log("Old data cleared");
    
    // Create Aniket user (primary admin)
    const aniketUser = new User({
      username: "Aniket",
      email: "suryawanshianiket7576@gmail.com"
    });
    
    const registeredAniket = await User.register(aniketUser, "aniket123");
    console.log("Aniket user created successfully");
    console.log("Username: Aniket");
    console.log("Password: aniket123");
    
    // Create admin user (secondary admin)
    const adminUser = new User({
      username: "admin",
      email: "admin@bookshelf.com"
    });
    
    const registeredAdmin = await User.register(adminUser, "admin123");
    console.log("\nAdmin user created successfully");
    console.log("Username: admin");
    console.log("Password: admin123");
    
    // Add listings with Aniket as owner
    const listingsWithOwner = initData.data.map((obj) => ({
      ...obj,
      owner: registeredAniket._id,
    }));
    
    await Listing.insertMany(listingsWithOwner);
    console.log("\nAll listings initialized successfully");
    console.log(`Total books added: ${listingsWithOwner.length}`);
    
    // Close database connection
    await mongoose.connection.close();
    console.log("Database connection closed");
    process.exit(0);
    
  } catch (err) {
    console.error("Error during initialization:", err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the initialization
main();
