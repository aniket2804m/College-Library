const Attendance  = require("../models/attendance.js");
const WifiConfig  = require("../models/wifiConfig.js");
const User        = require("../models/user.js");
const crypto      = require("crypto");

// ── QR Token Config ───────────────────────────────────────────────────────────
const QR_SECRET      = process.env.QR_SECRET || "bookshelf-qr-secret-2026";
const QR_WINDOW_SECS = 30; // token valid for 30 seconds
// Replay prevention: store used tokens (slotKey + userId) in memory
// Cleared every 2 minutes to avoid unbounded growth
const usedTokens = new Set();
setInterval(() => usedTokens.clear(), 2 * 60 * 1000);

function currentSlot() {
    return Math.floor(Date.now() / 1000 / QR_WINDOW_SECS);
}

function makeToken(slot) {
    return crypto.createHmac("sha256", QR_SECRET)
        .update(`attendance:${slot}`)
        .digest("hex")
        .substring(0, 32); // 32-char hex token
}

// Returns token + seconds remaining in current window
function currentToken() {
    const slot = currentSlot();
    const token = makeToken(slot);
    const secsRemaining = QR_WINDOW_SECS - (Math.floor(Date.now() / 1000) % QR_WINDOW_SECS);
    return { token, slot, secsRemaining, windowSecs: QR_WINDOW_SECS };
}

function validateToken(token) {
    const slot = currentSlot();
    // Accept current slot and previous slot (grace period for slow scanners)
    return makeToken(slot) === token || makeToken(slot - 1) === token
        ? slot : null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function dayStart(date = new Date()) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

function getClientIP(req) {
    return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
        || req.socket.remoteAddress
        || req.ip
        || '';
}

// ── GET /attendance/qr-token — librarian only, returns current QR token ───────
module.exports.qrToken = async (req, res) => {
    const { token, secsRemaining, windowSecs } = currentToken();
    // Build the URL the QR code will encode — points to student scan page
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const qrUrl   = `${baseUrl}/attendance/scan?t=${token}`;
    return res.json({ token, qrUrl, secsRemaining, windowSecs });
};

// ── GET /attendance/scan — student lands here after scanning QR ───────────────
// This is a redirect-to-mark page (handled in routes, rendered in my.ejs via query param)
// Actually we handle it as a POST from the scan page JS

// ── POST /attendance/qr-mark — student submits scanned token ─────────────────
module.exports.qrMark = async (req, res) => {
    const { token } = req.body;
    const studentId = req.user._id;

    if (!token) {
        return res.status(400).json({ success: false, message: "No QR token provided." });
    }

    // Validate token
    const slot = validateToken(token);
    if (!slot) {
        return res.status(400).json({ success: false, message: "QR code has expired. Please scan the latest code." });
    }

    // Replay prevention — one scan per user per slot
    const replayKey = `${slot}:${studentId}`;
    if (usedTokens.has(replayKey)) {
        return res.status(400).json({ success: false, message: "You already used this QR code. Wait for the next one." });
    }
    usedTokens.add(replayKey);

    // Check already marked today
    const today = dayStart();
    const existing = await Attendance.findOne({ studentId, date: today });
    if (existing) {
        return res.json({ success: false, message: "Attendance already marked today.", timeIn: existing.timeIn });
    }

    const clientIP = getClientIP(req);
    const record = await Attendance.create({
        studentId,
        date: today,
        timeIn: new Date(),
        markedVia: "qr",
        clientIP
    });

    return res.json({
        success: true,
        message: `Attendance marked via QR at ${record.timeIn.toLocaleTimeString()}.`,
        record
    });
};

// ── POST /attendance/mark ─────────────────────────────────────────────────────
module.exports.mark = async (req, res) => {
    const { via } = req.body;
    const studentId = req.user._id;
    const clientIP  = getClientIP(req);

    const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1'
        || clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1';

    // ── WiFi check ────────────────────────────────────────────────────────────
    const wifiConfigs = await WifiConfig.find({ isActive: true });
    let wifiAllowed = false;
    let matchedWifi = null;

    if (wifiConfigs.length > 0) {
        for (const cfg of wifiConfigs) {
            for (const ip of cfg.allowedIPs) {
                if (clientIP === ip || clientIP.startsWith(ip)) {
                    wifiAllowed = true;
                    matchedWifi = cfg.name;
                    break;
                }
            }
            if (wifiAllowed) break;
        }
        if (!wifiAllowed && !isLocalhost) {
            return res.status(403).json({
                success: false,
                message: `You must be connected to the library WiFi to mark attendance. Your IP: ${clientIP}`,
                wifiRequired: true,
                clientIP
            });
        }
    }

    const today = dayStart();
    const existing = await Attendance.findOne({ studentId, date: today });
    if (existing) {
        return res.json({ success: false, message: "Attendance already marked today.", timeIn: existing.timeIn });
    }

    const record = await Attendance.create({
        studentId,
        date: today,
        timeIn: new Date(),
        markedVia: via || "button",
        markedViaWifi: matchedWifi || null,
        clientIP
    });

    return res.json({
        success: true,
        message: `Attendance marked successfully at ${record.timeIn.toLocaleTimeString()}.${matchedWifi ? ` (via ${matchedWifi})` : ''}`,
        record
    });
};

// ── POST /attendance/checkout ─────────────────────────────────────────────────
module.exports.checkout = async (req, res) => {
    const today = dayStart();
    const record = await Attendance.findOne({ studentId: req.user._id, date: today });
    if (!record) return res.status(404).json({ success: false, message: "No attendance record found for today." });
    if (record.timeOut) return res.json({ success: false, message: "Already checked out today." });
    record.timeOut = new Date();
    await record.save();
    return res.json({ success: true, message: `Checked out at ${record.timeOut.toLocaleTimeString()}.` });
};

// ── GET /attendance/today ─────────────────────────────────────────────────────
module.exports.todayStatus = async (req, res) => {
    const today = dayStart();
    const record = await Attendance.findOne({ studentId: req.user._id, date: today });
    return res.json({ marked: !!record, record: record || null });
};

// ── GET /attendance/wifi-status ───────────────────────────────────────────────
module.exports.wifiStatus = async (req, res) => {
    const clientIP    = getClientIP(req);
    const isLocalhost = clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1';
    const wifiConfigs = await WifiConfig.find({ isActive: true });

    let allowed = isLocalhost;
    let matchedName = isLocalhost ? 'Localhost (dev)' : null;

    for (const cfg of wifiConfigs) {
        for (const ip of cfg.allowedIPs) {
            if (clientIP === ip || clientIP.startsWith(ip)) {
                allowed = true;
                matchedName = cfg.name;
                break;
            }
        }
        if (allowed) break;
    }

    return res.json({ clientIP, allowed, matchedWifi: matchedName, wifiConfigured: wifiConfigs.length > 0, isLocalhost });
};

// ── GET /attendance/my ────────────────────────────────────────────────────────
module.exports.myAttendance = async (req, res) => {
    const records = await Attendance.find({ studentId: req.user._id })
        .sort({ date: -1 }).limit(30);
    res.render("attendance/my.ejs", { records });
};

// ── GET /admin/attendance ─────────────────────────────────────────────────────
module.exports.adminReport = async (req, res) => {
    const page  = parseInt(req.query.page) || 1;
    const limit = 30;
    const dateFilter = req.query.date ? dayStart(new Date(req.query.date)) : null;
    const query = dateFilter ? { date: dateFilter } : {};

    const records = await Attendance.find(query)
        .populate("studentId", "username email department")
        .sort({ date: -1, timeIn: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await Attendance.countDocuments(query);

    const since = new Date(); since.setDate(since.getDate() - 13); since.setUTCHours(0,0,0,0);
    const dailyCounts = await Attendance.aggregate([
        { $match: { date: { $gte: since } } },
        { $group: { _id: "$date", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);

    const students = await User.find({ role: 'user', isActive: true })
        .select('username email department').sort({ username: 1 });

    const wifiConfigs = await WifiConfig.find().sort({ createdAt: -1 });

    res.render("admin/attendance.ejs", {
        records, total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        dateFilter: req.query.date || "",
        dailyCounts,
        students,
        wifiConfigs
    });
};

// ── POST /admin/attendance/mark ───────────────────────────────────────────────
module.exports.adminMark = async (req, res) => {
    const { studentId, date, timeIn, timeOut } = req.body;
    if (!studentId) { req.flash("error", "Please select a student."); return res.redirect("/admin/attendance"); }

    const markDate   = date ? dayStart(new Date(date)) : dayStart();
    const timeInVal  = timeIn  ? new Date(`${date || new Date().toISOString().split('T')[0]}T${timeIn}`) : new Date();
    const timeOutVal = timeOut ? new Date(`${date || new Date().toISOString().split('T')[0]}T${timeOut}`) : null;

    const existing = await Attendance.findOne({ studentId, date: markDate });
    if (existing) {
        existing.timeIn    = timeInVal;
        existing.timeOut   = timeOutVal || existing.timeOut;
        existing.markedVia = 'manual';
        await existing.save();
        req.flash("success", "Attendance record updated.");
    } else {
        await Attendance.create({
            studentId, date: markDate,
            timeIn: timeInVal, timeOut: timeOutVal || undefined,
            markedVia: 'manual'
        });
        req.flash("success", "Attendance marked manually.");
    }
    res.redirect("/admin/attendance");
};

// ── POST /admin/attendance/delete/:id ────────────────────────────────────────
module.exports.adminDelete = async (req, res) => {
    await Attendance.findByIdAndDelete(req.params.id);
    req.flash("success", "Attendance record deleted.");
    res.redirect("/admin/attendance");
};

// ── POST /admin/attendance/wifi ───────────────────────────────────────────────
module.exports.addWifi = async (req, res) => {
    const { name, ssid, ips, note } = req.body;
    if (!name || !ips) { req.flash("error", "Name and IP(s) are required."); return res.redirect("/admin/attendance"); }
    const allowedIPs = ips.split('\n').map(s => s.trim()).filter(Boolean);
    await WifiConfig.create({ name, ssid, allowedIPs, note, addedBy: req.user._id });
    req.flash("success", `WiFi "${name}" added.`);
    res.redirect("/admin/attendance");
};

// ── POST /admin/attendance/wifi/:id/toggle ────────────────────────────────────
module.exports.toggleWifi = async (req, res) => {
    const cfg = await WifiConfig.findById(req.params.id);
    if (!cfg) { req.flash("error", "WiFi config not found."); return res.redirect("/admin/attendance"); }
    cfg.isActive = !cfg.isActive;
    await cfg.save();
    req.flash("success", `WiFi "${cfg.name}" ${cfg.isActive ? 'enabled' : 'disabled'}.`);
    res.redirect("/admin/attendance");
};

// ── POST /admin/attendance/wifi/:id/delete ────────────────────────────────────
module.exports.deleteWifi = async (req, res) => {
    await WifiConfig.findByIdAndDelete(req.params.id);
    req.flash("success", "WiFi config deleted.");
    res.redirect("/admin/attendance");
};
