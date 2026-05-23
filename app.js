if(process.env.NODE_ENV != "production") {
require('dotenv').config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const User = require("./models/user.js");

// Import routes
const listingsRouter = require("./routes/listing.js");
const reviewsRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const borrowRouter = require("./routes/borrow.js");
const blogRouter = require("./routes/blog.js");
const researchRouter = require("./routes/research.js");
const adminRouter = require("./routes/admin.js");
const qrRouter = require("./routes/qr.js");
const profileRouter = require("./routes/profile.js");
const notificationRouter = require("./routes/notification.js");
const ebookRouter = require("./routes/ebook.js");
const chatbotRouter = require("./routes/chatbot.js");
const recommendationRouter = require("./routes/recommendation.js");
const reservationRouter = require("./routes/reservation.js");
const attendanceRouter  = require("./routes/attendance.js");
const noticeRouter      = require("./routes/notice.js");

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

// Security middleware - helmet with safe defaults
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Too many requests from this IP, please try again later."
});
app.use("/api/", limiter);

// Session configuration
const sessionOptions = {
  secret: process.env.SESSION_SECRET || process.env.SECRET || "bookshelf-secret-key",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL,
    touchAfter: 24 * 3600
  }),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
  },
};

// Database connection
main()
  .then(() => {
    console.log("✓ Connected to MongoDB");
  })
  .catch((err) => {
    console.log("✗ MongoDB connection error:", err);
  });

async function main() {
  await mongoose.connect(process.env.MONGO_URL);
}

app.use(session(sessionOptions));
app.use(flash());

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Custom local strategy — queries raw collection to always get hash+salt
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const db = require("mongoose").connection.db;
    const raw = await db.collection("users").findOne({
      $or: [{ username }, { email: username }]
    });
    if (!raw) return done(null, false, { message: "Incorrect username or password." });
    if (!raw.hash || !raw.salt) return done(null, false, { message: "Account setup incomplete. Please contact admin." });
    // Verify password using same params as passport-local-mongoose defaults
    require("crypto").pbkdf2(password, raw.salt, 25000, 512, "sha256", async (err, hash) => {
      if (err) return done(err);
      if (hash.toString("hex") !== raw.hash) return done(null, false, { message: "Incorrect username or password." });
      // Password correct — load full Mongoose user
      const user = await User.findById(raw._id);
      return done(null, user);
    });
  } catch(err) {
    return done(err);
  }
}));
// Always serialize/deserialize by _id
passport.serializeUser((user, done) => {
  done(null, user._id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch(err) {
    done(null, false);
  }
});

const { isAdminUser, isLibrarianUser } = require("./middleware.js");

// Global middleware for flash messages and current user
app.use(async (req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  res.locals.moment = require('moment');
  res.locals.isAdmin = isAdminUser(req.user);
  res.locals.isLibrarian = isLibrarianUser(req.user);
  res.locals.currentPath = req.originalUrl.split('?')[0]; // full path, no query string
  // Unread notification count for navbar badge
  if (req.user) {
    try {
      const Notification = require("./models/notification.js");
      res.locals.unreadNotifCount = await Notification.countDocuments({ user: req.user._id, read: false });
    } catch(e) { res.locals.unreadNotifCount = 0; }
    // Pending user approvals count for admin sidebar badge
    if (isAdminUser(req.user)) {
      try {
        const User = require("./models/user.js");
        res.locals.pendingCount = await User.countDocuments({ isApproved: false, role: { $ne: 'admin' } });
      } catch(e) { res.locals.pendingCount = 0; }
    } else {
      res.locals.pendingCount = 0;
    }
  } else {
    res.locals.unreadNotifCount = 0;
    res.locals.pendingCount = 0;
  }
  next();
});

// Home route
app.get("/", (req, res) => {
  res.render("./listings/Home.ejs");
});

// Router Middlewares
app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/", userRouter);
app.use("/borrow", borrowRouter);
app.use("/blogs", blogRouter);
app.use("/research", researchRouter);
app.use("/admin", adminRouter);
app.use("/qr", qrRouter);
app.use("/profile", profileRouter);
app.use("/notifications", notificationRouter);
app.use("/ebooks", ebookRouter);
app.use("/api", chatbotRouter);
app.use("/recommendations", recommendationRouter);
app.use("/reservations", reservationRouter);
app.use("/attendance",  attendanceRouter);
app.use("/notices",     noticeRouter);

// 404 handler
app.use((req, res, next) => {
  res.status(404).render("./listings/error.ejs", { 
    message: "Page Not Found", 
    err: { statusCode: 404, message: "The page you're looking for doesn't exist." }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong!" } = err;
  console.error("=== ERROR ===");
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);
  console.error("=============");
  try {
    res.status(statusCode).render("./listings/error.ejs", { message, err });
  } catch(renderErr) {
    console.error("Error rendering error page:", renderErr.message);
    res.status(statusCode).send(`<h1>Error ${statusCode}</h1><p>${message}</p><pre>${err.stack}</pre>`);
  }
});

// ── Auto-reminder scheduler (runs every hour, sends reminder 1 day before due) ──
function startReminderScheduler() {
    const BorrowRecord = require("./models/borrowRecord.js");
    const { sendReturnReminder } = require("./Utils/emailService.js");

    async function checkAndSendReminders() {
        try {
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const windowStart = new Date(tomorrow); windowStart.setHours(0, 0, 0, 0);
            const windowEnd   = new Date(tomorrow); windowEnd.setHours(23, 59, 59, 999);

            const records = await BorrowRecord.find({
                status: { $in: ['Borrowed', 'Overdue'] },
                dueDate: { $gte: windowStart, $lte: windowEnd },
                reminderSent: { $ne: true }
            }).populate('book borrower');

            for (const rec of records) {
                if (rec.borrower && rec.borrower.email) {
                    await sendReturnReminder(rec.borrower, rec.book, rec.dueDate).catch(() => {});
                    await BorrowRecord.updateOne({ _id: rec._id }, { $set: { reminderSent: true } });
                    console.log(`📧 Reminder sent to ${rec.borrower.username} for "${rec.book.title}"`);
                }
            }
        } catch (e) {
            console.error("Reminder scheduler error:", e.message);
        }
    }

    // Run once on startup, then every hour
    checkAndSendReminders();
    setInterval(checkAndSendReminders, 60 * 60 * 1000);
    console.log("✓ Auto-reminder scheduler started");
}

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  startReminderScheduler();
});
