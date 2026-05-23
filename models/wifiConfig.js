const mongoose = require("mongoose");

const wifiConfigSchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true },  // e.g. "Library WiFi"
    ssid:        { type: String, trim: true },                  // display only (browser can't read it)
    allowedIPs:  [{ type: String, trim: true }],                // IP addresses/ranges allowed
    isActive:    { type: Boolean, default: true },
    addedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note:        { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model("WifiConfig", wifiConfigSchema);
