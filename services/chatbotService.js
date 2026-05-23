/**
 * chatbotService.js
 * Smart library assistant — navigation, book queries, general library Q&A
 */
const Listing        = require("../models/listing.js");
const BorrowRecord   = require("../models/borrowRecord.js");
const ResearchPaper  = require("../models/researchPaper.js");
const Ebook          = require("../models/ebook.js");
const Blog           = require("../models/blog.js");
const User           = require("../models/user.js");

// ── Helpers ───────────────────────────────────────────────────────────────────
function link(label, url) {
    return `<a href='${url}' style='color:#667eea;font-weight:600;'>${label}</a>`;
}

function extractSearchTerm(msg) {
    return msg
        .replace(/\b(open|go to|take me to|navigate to|show|find|search|look for|get|fetch|books?|about|on|for|a|an|the|some|any|please|can you|i want|i need|give me|page|section)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

// ── Navigation map (checked early, before anything else) ─────────────────────
const NAV_MAP = [
    { p: /\b(home|main page|go home|open home|homepage)\b/i,                          url: "/",                       label: "Home" },
    { p: /\b(login|sign in|log in|open login|login page|go to login)\b/i,             url: "/login",                  label: "Login" },
    { p: /\b(signup|sign up|register|create account|open signup|signup page)\b/i,     url: "/signup",                 label: "Sign Up" },
    { p: /\b(logout|sign out|log out)\b/i,                                             url: "/logout",                 label: "Logout" },
    { p: /\b(all books|catalog|browse books|book list|open books|book catalog)\b/i,   url: "/listings",               label: "Book Catalog" },
    { p: /\b(trending|popular books|hot books|most borrowed)\b/i,                     url: "/listings?sort=trending", label: "Trending Books" },
    { p: /\b(e.?books?|digital books?|open ebooks?|ebook page)\b/i,                   url: "/ebooks",                 label: "E-Books" },
    { p: /\b(my books?|borrowed books?|current borrow|active borrow)\b/i,             url: "/borrow/current",         label: "My Books" },
    { p: /\b(borrow history|my history|past borrow|return history)\b/i,               url: "/borrow/history",         label: "Borrow History" },
    { p: /\b(research|papers?|journals?|open research|research page)\b/i,             url: "/research",               label: "Research Papers" },
    { p: /\b(blogs?|articles?|open blog|blog page)\b/i,                               url: "/blogs",                  label: "Blogs" },
    { p: /\b(recommend|for me|suggestions?|open recommend|recommendation)\b/i,        url: "/recommendations",        label: "Recommendations" },
    { p: /\b(profile|my account|my profile|open profile|edit profile)\b/i,            url: "/profile",                label: "Profile" },
    { p: /\b(notifications?|alerts?|open notification)\b/i,                           url: "/notifications",          label: "Notifications" },
    { p: /\b(dashboard|admin panel|admin dashboard|open dashboard)\b/i,               url: "/admin/dashboard",        label: "Admin Dashboard" },
    { p: /\b(reservations?|my reservations?|open reservation)\b/i,                    url: "/reservations",           label: "Reservations" },
    { p: /\b(qr|qr scanner|scanner|scan book)\b/i,                                    url: "/qr/scanner",             label: "QR Scanner" },
    { p: /\b(my attendance|attendance|mark attendance|check in|check-in)\b/i,          url: "/attendance/my",          label: "My Attendance" },
    { p: /\b(attendance report|admin attendance|all attendance)\b/i,                   url: "/admin/attendance",       label: "Attendance Report" },
    { p: /\b(add book|new book|upload book)\b/i,                                       url: "/admin/books/new",        label: "Add Book" },
    { p: /\b(upload ebook|add ebook|new ebook)\b/i,                                   url: "/admin/ebooks/upload",    label: "Upload E-Book" },
    { p: /\b(upload research|submit paper|new research)\b/i,                          url: "/research/upload",        label: "Upload Research" },
    { p: /\b(write blog|new blog|create blog|new post)\b/i,                           url: "/blogs/new",              label: "Write Blog" },
    { p: /\b(pending|pending users?|approve users?)\b/i,                              url: "/admin/users/pending",    label: "Pending Approvals" },
    { p: /\b(manage users?|all users?|user list)\b/i,                                 url: "/admin/users",            label: "User Management" },
    { p: /\b(manage books?|book management|admin books?)\b/i,                         url: "/admin/books",            label: "Book Management" },
    { p: /\b(borrow requests?|manage borrow|admin borrow)\b/i,                        url: "/admin/borrows",          label: "Borrow Management" },
    { p: /\b(reports?|analytics|statistics|stats)\b/i,                                url: "/admin/reports",          label: "Reports" },
];

async function processMessage(msg, user) {
    const lower = msg.toLowerCase().trim();

    // ── Greetings ─────────────────────────────────────────────────────────────
    if (/^(hi+|hello+|hey+|good\s*(morning|evening|afternoon|day)|howdy|sup|what'?s up|hiya)\b/.test(lower)) {
        const name = user ? `, ${user.username}` : "";
        return {
            reply: `👋 Hello${name}! I'm your BookShelf Library Assistant.<br><br>
I can help you:<br>
• 🔍 <strong>Find & search books</strong><br>
• ✅ <strong>Check book availability</strong><br>
• 🗺️ <strong>Navigate any page</strong> — "open login page"<br>
• 📋 <strong>Library rules & fines</strong><br>
• 📚 <strong>Your borrows & history</strong><br>
• 🔥 <strong>Trending & recommendations</strong><br><br>
What can I help you with?`
        };
    }

    // ── Navigation — check FIRST before anything else ─────────────────────────
    for (const nav of NAV_MAP) {
        if (nav.p.test(lower)) {
            return {
                reply: `🔗 Opening <strong>${nav.label}</strong>...`,
                action: "redirect",
                url: nav.url
            };
        }
    }

    // ── My borrowed books ─────────────────────────────────────────────────────
    if (/\b(my borrow|my book|what.*borrow|currently borrow|active borrow|issued book)\b/.test(lower)) {
        if (!user) return { reply: `Please ${link("log in", "/login")} to see your borrowed books.`, action: "redirect", url: "/login" };
        const records = await BorrowRecord.find({ borrower: user._id, status: { $in: ["Borrowed", "Overdue"] } })
            .populate("book", "title").limit(5);
        if (records.length === 0) return { reply: `You have no active borrows. ${link("Browse books →", "/listings")}` };
        let reply = `📚 You have <strong>${records.length}</strong> active borrow(s):<br><br>`;
        records.forEach(r => {
            const due = r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "N/A";
            const overdue = r.status === "Overdue" ? " ⚠️ <span style='color:#f5576c;'>Overdue</span>" : "";
            reply += `• <strong>${r.book ? r.book.title : "Unknown"}</strong> — Due: ${due}${overdue}<br>`;
        });
        reply += `<br>${link("View all →", "/borrow/current")}`;
        return { reply, action: "redirect", url: "/borrow/current" };
    }

    // ── Borrow history ────────────────────────────────────────────────────────
    if (/\b(borrow history|past borrow|returned book|history)\b/.test(lower)) {
        if (!user) return { reply: `Please ${link("log in", "/login")} to see your history.`, action: "redirect", url: "/login" };
        return { reply: `📜 Here's your ${link("Borrow History →", "/borrow/history")}`, action: "redirect", url: "/borrow/history" };
    }

    // ── Overdue / fines ───────────────────────────────────────────────────────
    if (/\b(overdue|fine|penalty|late fee|pay fine|outstanding)\b/.test(lower)) {
        if (user) {
            const overdue = await BorrowRecord.countDocuments({ borrower: user._id, status: "Overdue" });
            if (overdue > 0) {
                return { reply: `⚠️ You have <strong>${overdue}</strong> overdue book(s). Fine: <strong>₹5 per day</strong> per book. ${link("View now →", "/borrow/current")}`, action: "redirect", url: "/borrow/current" };
            }
            return { reply: `✅ Great news — you have no overdue books!` };
        }
        return { reply: `📋 Late fine is <strong>₹5 per day</strong> per book after the due date. ${link("Log in", "/login")} to check your status.` };
    }

    // ── Trending books ────────────────────────────────────────────────────────
    if (/\b(trend|popular|most borrow|hot book|top book|best book)\b/.test(lower)) {
        const books = await Listing.find().sort({ trendingScore: -1, borrowCount: -1 }).limit(5).select("title author borrowCount");
        if (books.length === 0) return { reply: "No trending data yet.", action: "redirect", url: "/listings" };
        let reply = `🔥 <strong>Trending Books Right Now:</strong><br><br>`;
        books.forEach((b, i) => { reply += `${i + 1}. <strong>${b.title}</strong> by ${b.author || "Unknown"} — ${b.borrowCount || 0} borrows<br>`; });
        reply += `<br>${link("Browse all →", "/listings")}`;
        return { reply, action: "redirect", url: "/listings?sort=trending" };
    }

    // ── Availability check ────────────────────────────────────────────────────
    if (/\b(available|availability|in stock|copies|do you have|have the book)\b/.test(lower)) {
        const term = extractSearchTerm(lower.replace(/\b(available|availability|in stock|copies|do you have|is|are|the|book|have)\b/g, ""));
        if (term.length > 1) {
            const book = await Listing.findOne({
                $or: [
                    { title: { $regex: term, $options: "i" } },
                    { author: { $regex: term, $options: "i" } }
                ]
            }).select("title author availableQuantity totalQuantity location _id");
            if (book) {
                if (book.availableQuantity > 0) {
                    return { reply: `✅ <strong>${book.title}</strong> by ${book.author || "Unknown"} is available!<br><strong>${book.availableQuantity}</strong> of ${book.totalQuantity || "?"} copies on shelf${book.location ? ` — <strong>${book.location}</strong>` : ""}.<br><br>${link("View book →", `/listings/${book._id}`)}` };
                } else {
                    return { reply: `❌ <strong>${book.title}</strong> is currently out of stock. All copies are borrowed.<br><br>${link("Reserve it →", `/listings/${book._id}`)} and we'll notify you when it's back!` };
                }
            }
        }
        return { reply: `Which book would you like to check? Try: <em>"is Clean Code available?"</em>` };
    }

    // ── Search / find books ───────────────────────────────────────────────────
    if (/\b(find|search|look|show me|get|fetch|suggest|books? about|books? on|books? by)\b/.test(lower)) {
        const term = extractSearchTerm(lower);
        if (term.length > 1) {
            const books = await Listing.find({
                $or: [
                    { title: { $regex: term, $options: "i" } },
                    { author: { $regex: term, $options: "i" } },
                    { category: { $regex: term, $options: "i" } },
                    { tags: { $regex: term, $options: "i" } },
                    { description: { $regex: term, $options: "i" } }
                ]
            }).limit(5).select("title author availableQuantity _id");

            if (books.length > 0) {
                let reply = `📚 Found <strong>${books.length}</strong> result(s) for "<strong>${term}</strong>":<br><br>`;
                books.forEach(b => {
                    const avail = b.availableQuantity > 0 ? `<span style='color:#43e97b;'>✅ ${b.availableQuantity} available</span>` : `<span style='color:#f5576c;'>❌ Out of stock</span>`;
                    reply += `• ${link(`<strong>${b.title}</strong>`, `/listings/${b._id}`)} by ${b.author || "Unknown"} — ${avail}<br>`;
                });
                reply += `<br>${link("See all results →", `/listings?search=${encodeURIComponent(term)}`)}`;
                return { reply, action: "redirect", url: `/listings?search=${encodeURIComponent(term)}` };
            }
            return { reply: `😕 No books found for "<strong>${term}</strong>". ${link("Browse full catalog →", "/listings")}` };
        }
        return { reply: `What are you looking for? Try: <em>"find machine learning books"</em>` };
    }

    // ── How to borrow ─────────────────────────────────────────────────────────
    if (/\b(how to borrow|borrow a book|issue book|request book|how do i borrow|get a book)\b/.test(lower)) {
        return {
            reply: `📖 <strong>How to Borrow a Book:</strong><br><br>
1. ${link("Browse the catalog", "/listings")}<br>
2. Click on a book you want<br>
3. Click <strong>"Request to Borrow"</strong><br>
4. Wait for librarian approval<br>
5. Book is issued for <strong>14 days</strong><br>
6. Return on time to avoid fines!`
        };
    }

    // ── How to return ─────────────────────────────────────────────────────────
    if (/\b(how to return|return a book|return book|give back)\b/.test(lower)) {
        return {
            reply: `🔄 To return a book:<br><br>
1. Go to ${link("My Books", "/borrow/current")}<br>
2. Click <strong>"Return Book"</strong> next to the title<br>
3. Or visit the library counter with the book`,
            action: "redirect", url: "/borrow/current"
        };
    }

    // ── How to renew ──────────────────────────────────────────────────────────
    if (/\b(renew|renewal|extend|extend due date|extend borrow)\b/.test(lower)) {
        return {
            reply: `🔁 To renew a book:<br><br>
1. Go to ${link("My Books", "/borrow/current")}<br>
2. Click <strong>"Renew"</strong> next to the book<br>
3. You can renew up to <strong>2 times</strong><br>
4. Each renewal adds <strong>7 days</strong>`
        };
    }

    // ── Reservation ───────────────────────────────────────────────────────────
    if (/\b(reserv|reserve a book|how to reserve|book reservation|put on hold)\b/.test(lower)) {
        return {
            reply: `🔖 <strong>How to Reserve a Book:</strong><br><br>
1. Find a book that's out of stock<br>
2. Click <strong>"Reserve"</strong> on the book page<br>
3. You'll get notified when it's available<br>
4. Reservation holds for <strong>48 hours</strong><br><br>
${link("View my reservations →", "/reservations")}`,
            action: "redirect", url: "/reservations"
        };
    }

    // ── Library rules / policy ────────────────────────────────────────────────
    if (/\b(rule|policy|policies|fine|how long|borrow limit|penalty|late|regulation|guideline)\b|library rule|library polic/.test(lower)) {
        return {
            reply: `📋 <strong>Library Rules & Policy:</strong><br><br>
• Max <strong>5 books</strong> borrowed at a time<br>
• Borrowing period: <strong>14 days</strong><br>
• Renewals: up to <strong>2 times</strong> (7 days each)<br>
• Late fine: <strong>₹5 per day</strong> per book<br>
• Requests need librarian approval<br>
• Reservations expire after <strong>48 hours</strong><br>
• Library hours: <strong>Mon–Sat, 9 AM – 6 PM</strong><br>
• Lost book: replacement cost applies`
        };
    }

    // ── Library hours / location ──────────────────────────────────────────────
    if (/\b(hour|timing|time|when open|open time|close time|location|where is|address)\b|library hour|library timing|library time/.test(lower)) {
        return {
            reply: `🕐 <strong>Library Information:</strong><br><br>
• <strong>Hours:</strong> Monday – Saturday, 9:00 AM – 6:00 PM<br>
• <strong>Closed:</strong> Sundays & public holidays<br>
• <strong>Location:</strong> Siddhant College of Engineering, Pune<br>
• <strong>Contact:</strong> library@siddhant.edu.in`
        };
    }

    // ── E-books ───────────────────────────────────────────────────────────────
    if (/\b(ebook|e-book|digital book|pdf book|online book|download book)\b/.test(lower)) {
        const count = await Ebook.countDocuments();
        return {
            reply: `📱 We have <strong>${count}</strong> e-books available for download.<br><br>${link("Browse E-Books →", "/ebooks")}`,
            action: "redirect", url: "/ebooks"
        };
    }

    // ── Research papers ───────────────────────────────────────────────────────
    if (/\b(research|paper|journal|academic|thesis|dissertation|publication)\b/.test(lower)) {
        const count = await ResearchPaper.countDocuments({ status: "Approved" });
        return {
            reply: `🔬 We have <strong>${count}</strong> approved research papers.<br><br>${link("Browse Research Papers →", "/research")}`,
            action: "redirect", url: "/research"
        };
    }

    // ── Blogs ─────────────────────────────────────────────────────────────────
    if (/\b(blog|article|post|write|read blog)\b/.test(lower)) {
        const count = await Blog.countDocuments();
        return {
            reply: `📰 We have <strong>${count}</strong> blog posts.<br><br>${link("Read Blogs →", "/blogs")} &nbsp;|&nbsp; ${link("Write a Blog →", "/blogs/new")}`,
            action: "redirect", url: "/blogs"
        };
    }

    // ── Account / signup / login help ─────────────────────────────────────────
    if (/\b(account|create account|how to register|how to signup|how to login|forgot password|reset password)\b/.test(lower)) {
        return {
            reply: `👤 <strong>Account Help:</strong><br><br>
• ${link("Create an account", "/signup")} — fill the signup form<br>
• After signup, wait for <strong>admin approval</strong><br>
• Once approved, ${link("log in here", "/login")}<br>
• Forgot password? Contact the librarian at the counter`
        };
    }

    // ── Total books / catalog stats ───────────────────────────────────────────
    if (/\b(how many books|total books|book count|catalog size|number of books)\b/.test(lower)) {
        const total = await Listing.countDocuments();
        const available = await Listing.countDocuments({ availableQuantity: { $gt: 0 } });
        return {
            reply: `📊 <strong>Library Stats:</strong><br><br>
• Total books in catalog: <strong>${total}</strong><br>
• Currently available: <strong>${available}</strong><br><br>
${link("Browse catalog →", "/listings")}`
        };
    }

    // ── Recommendations ───────────────────────────────────────────────────────
    if (/\b(recommend|suggestion|what should i read|what to read|for me|personali[sz]ed)\b/.test(lower)) {
        if (!user) return { reply: `${link("Log in", "/login")} to get personalized book recommendations based on your reading history!`, action: "redirect", url: "/login" };
        return { reply: `✨ Here are your ${link("personalized recommendations →", "/recommendations")}`, action: "redirect", url: "/recommendations" };
    }

    // ── QR code ───────────────────────────────────────────────────────────────
    if (/\b(qr|qr code|scan|barcode)\b/.test(lower)) {
        return {
            reply: `📷 <strong>QR Code System:</strong><br><br>
• Scan a book's QR code to borrow or return instantly<br>
• ${link("Open QR Scanner →", "/qr/scanner")}`
        };
    }

    // ── Notifications ─────────────────────────────────────────────────────────
    if (/\b(notification|alert|update|message|inform)\b/.test(lower)) {
        return { reply: `🔔 Check your ${link("Notifications →", "/notifications")}`, action: "redirect", url: "/notifications" };
    }

    // ── Thanks / positive ─────────────────────────────────────────────────────
    if (/\b(thank|thanks|thank you|great|awesome|perfect|good|nice|helpful|cool)\b/.test(lower)) {
        return { reply: `😊 You're welcome! Happy reading! 📚` };
    }

    // ── Bye ───────────────────────────────────────────────────────────────────
    if (/\b(bye|goodbye|exit|close|see you|later|cya)\b/.test(lower)) {
        return { reply: `👋 Goodbye! Come back anytime. Happy reading! 📚` };
    }

    // ── Who are you ───────────────────────────────────────────────────────────
    if (/\b(who are you|what are you|your name|what is bookshelf|about you|about library)\b/.test(lower)) {
        return {
            reply: `📚 <strong>BookShelf</strong> is the digital library system of <strong>Siddhant College of Engineering, Pune</strong>.<br><br>
I'm your AI Library Assistant. I can help you find books, check availability, navigate the site, and answer library questions.<br><br>
${link("Explore the library →", "/listings")}`
        };
    }

    // ── Help ──────────────────────────────────────────────────────────────────
    if (/\b(help|what can you do|commands|options|menu)\b/.test(lower)) {
        return {
            reply: `🤖 <strong>Here's what I can do:</strong><br><br>
🔍 <strong>Find books</strong> — <em>"find python books"</em><br>
✅ <strong>Check availability</strong> — <em>"is Clean Code available?"</em><br>
🔥 <strong>Trending</strong> — <em>"show trending books"</em><br>
📚 <strong>My borrows</strong> — <em>"show my borrowed books"</em><br>
🗺️ <strong>Navigate</strong> — <em>"open login page"</em>, <em>"go to dashboard"</em><br>
📋 <strong>Rules</strong> — <em>"what are the library rules?"</em><br>
🕐 <strong>Hours</strong> — <em>"what are library hours?"</em><br>
🔖 <strong>Reserve</strong> — <em>"how to reserve a book?"</em><br>
🔁 <strong>Renew</strong> — <em>"how to renew a book?"</em><br>
📱 <strong>E-Books</strong> — <em>"show ebooks"</em><br>
🔬 <strong>Research</strong> — <em>"open research papers"</em>`
        };
    }

    // ── Default ───────────────────────────────────────────────────────────────
    return {
        reply: `🤔 I'm not sure about that. Try asking:<br><br>
• <em>"find data structures books"</em><br>
• <em>"is Python Programming available?"</em><br>
• <em>"open login page"</em><br>
• <em>"what are library rules?"</em><br>
• Type <strong>"help"</strong> to see all commands`
    };
}

module.exports = { processMessage };
