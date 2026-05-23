/**
 * Creates a librarian account.
 * Run: node init/createLibrarian.js
 */
if (process.env.NODE_ENV !== "production") require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/user");

const USERNAME = "librarian1";
const EMAIL    = "librarian1@library.local";
const PASSWORD = "Librarian#2026";

async function main() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✓ Connected to MongoDB");

  await User.deleteOne({ $or: [{ username: USERNAME }, { email: EMAIL }] });

  const user = new User({ username: USERNAME, email: EMAIL });

  await new Promise((resolve, reject) => {
    user.setPassword(PASSWORD, async (err, u) => {
      if (err) return reject(err);
      u.role     = "librarian";
      u.isActive = true;
      u.fullName = "Library Staff";
      await User.collection.updateOne(
        { _id: user._id },
        { $set: { salt: u.salt, hash: u.hash } }
      );
      resolve();
    });
  });

  await User.findOneAndUpdate({ username: USERNAME }, { role: "librarian", isActive: true, fullName: "Library Staff" });

  console.log("✓ Librarian created:");
  console.log("  Username:", USERNAME);
  console.log("  Password:", PASSWORD);
  console.log("  Role    : librarian");

  await mongoose.disconnect();
}

main().catch(e => { console.error("✗", e.message); process.exit(1); });
