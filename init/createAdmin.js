/**
 * One-time script to create the main admin account.
 * Run: node init/createAdmin.js
 */

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const mongoose = require("mongoose");
const User = require("../models/user");

const USERNAME = "aniket_admin";
const EMAIL    = "aniket_admin@library.local";
const PASSWORD = "Aniket#2026";

async function main() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✓ Connected to MongoDB");

  // Wipe any existing account
  await User.deleteOne({ $or: [{ username: USERNAME }, { email: EMAIL }] });

  // Step 1: create the user doc without password
  const user = await User.create({
    username: USERNAME,
    email:    EMAIL,
    role:     "admin",
    isActive: true,
    fullName: "Aniket (Admin)"
  });

  // Step 2: use setPassword then grab salt+hash directly from the instance
  await new Promise((resolve, reject) => {
    user.setPassword(PASSWORD, async (err, userWithPw) => {
      if (err) return reject(err);
      // Use raw MongoDB update to bypass Mongoose select:false stripping
      await User.collection.updateOne(
        { _id: user._id },
        { $set: { salt: userWithPw.salt, hash: userWithPw.hash } }
      );
      resolve();
    });
  });

  // Verify
  const saved = await User.collection.findOne({ username: USERNAME });
  const ok = !!(saved.hash && saved.salt);

  console.log("✓ Admin account created:");
  console.log("  Username :", USERNAME);
  console.log("  Password : Aniket#2026");
  console.log("  Role     :", saved.role);
  console.log("  Login ready:", ok ? "YES ✓" : "NO ✗");

  await mongoose.disconnect();
  console.log("✓ Done.");
}

main().catch(err => {
  console.error("✗ Error:", err.message);
  process.exit(1);
});
