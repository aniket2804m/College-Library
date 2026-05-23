/**
 * Email Service using Nodemailer
 * Handles all automated email notifications
 */
const nodemailer = require("nodemailer");

// Create transporter — uses Gmail by default, falls back to Ethereal for dev
let transporter;

function getTransporter() {
    if (transporter) return transporter;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    } else {
        // Dev fallback: log emails to console instead of sending
        transporter = {
            sendMail: async (opts) => {
                console.log("📧 [DEV EMAIL - not sent]");
                console.log("  To:", opts.to);
                console.log("  Subject:", opts.subject);
                return { messageId: 'dev-' + Date.now() };
            }
        };
    }
    return transporter;
}

const FROM = process.env.EMAIL_FROM || '"BookShelf Library" <noreply@bookshelf.com>';

/**
 * Send a generic email
 */
async function sendEmail({ to, subject, html, text }) {
    try {
        const t = getTransporter();
        const info = await t.sendMail({ from: FROM, to, subject, html, text });
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error("Email send error:", err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Borrow approval email (sent when librarian approves request)
 */
async function sendBorrowApproved(user, book, dueDate) {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9ff;padding:20px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#43e97b,#38f9d7);padding:24px;border-radius:10px;text-align:center;margin-bottom:20px;">
        <h1 style="color:#fff;margin:0;font-size:1.5rem;">✅ Borrow Request Approved!</h1>
      </div>
      <div style="background:#fff;padding:24px;border-radius:10px;">
        <p style="color:#333;">Hi <strong>${user.username}</strong>,</p>
        <p style="color:#555;">Your borrow request has been <strong style="color:#43e97b;">approved</strong> by the librarian!</p>
        <div style="background:#f0fff8;padding:16px;border-radius:8px;border-left:4px solid #43e97b;margin:16px 0;">
          <strong style="color:#1a1a2e;font-size:1.1rem;">${book.title}</strong><br>
          <span style="color:#666;">by ${book.author || book.country || 'Unknown'}</span><br><br>
          <span style="color:#f5576c;font-weight:600;">📅 Due Date: ${new Date(dueDate).toDateString()}</span>
        </div>
        <p style="color:#888;font-size:0.9rem;">Please collect the book from the library counter and return it on time to avoid fines.</p>
        <a href="${process.env.APP_URL || 'http://localhost:8080'}/borrow/current"
           style="display:inline-block;background:linear-gradient(135deg,#43e97b,#38f9d7);color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:600;margin-top:12px;">
          View My Books
        </a>
      </div>
      <p style="text-align:center;color:#aaa;font-size:0.8rem;margin-top:16px;">BookShelf — Siddhant College of Engineering, Pune</p>
    </div>`;
    return sendEmail({ to: user.email, subject: `✅ Borrow Approved: ${book.title} — Due ${new Date(dueDate).toDateString()}`, html });
}

/**
 * Due date changed email
 */
async function sendDueDateChanged(user, book, newDueDate) {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9ff;padding:20px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#4facfe,#00f2fe);padding:24px;border-radius:10px;text-align:center;margin-bottom:20px;">
        <h1 style="color:#fff;margin:0;font-size:1.5rem;">📅 Due Date Updated</h1>
      </div>
      <div style="background:#fff;padding:24px;border-radius:10px;">
        <p style="color:#333;">Hi <strong>${user.username}</strong>,</p>
        <p style="color:#555;">The due date for your borrowed book has been updated by the librarian:</p>
        <div style="background:#f0f8ff;padding:16px;border-radius:8px;border-left:4px solid #4facfe;margin:16px 0;">
          <strong style="color:#1a1a2e;">${book.title}</strong><br>
          <span style="color:#f5576c;font-weight:600;">New Due Date: ${new Date(newDueDate).toDateString()}</span>
        </div>
        <a href="${process.env.APP_URL || 'http://localhost:8080'}/borrow/current"
           style="display:inline-block;background:linear-gradient(135deg,#4facfe,#00f2fe);color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:600;margin-top:12px;">
          View My Books
        </a>
      </div>
    </div>`;
    return sendEmail({ to: user.email, subject: `📅 Due Date Updated: ${book.title}`, html });
}

/**
 * Notice / announcement email
 */
async function sendNoticeEmail(users, notice) {
    const typeColors = { info: '#4facfe', warning: '#feca57', urgent: '#f5576c', event: '#43e97b' };
    const color = typeColors[notice.type] || '#667eea';
    const results = [];
    for (const user of users) {
        const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9ff;padding:20px;border-radius:12px;">
          <div style="background:linear-gradient(135deg,${color},#764ba2);padding:24px;border-radius:10px;text-align:center;margin-bottom:20px;">
            <h1 style="color:#fff;margin:0;font-size:1.5rem;">📢 Library Notice</h1>
          </div>
          <div style="background:#fff;padding:24px;border-radius:10px;">
            <p style="color:#333;">Hi <strong>${user.username}</strong>,</p>
            <h3 style="color:#1a1a2e;">${notice.title}</h3>
            <div style="background:#f8f9ff;padding:16px;border-radius:8px;border-left:4px solid ${color};margin:16px 0;color:#555;line-height:1.7;">
              ${notice.content.replace(/\n/g, '<br>')}
            </div>
            <a href="${process.env.APP_URL || 'http://localhost:8080'}/notices"
               style="display:inline-block;background:linear-gradient(135deg,${color},#764ba2);color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:600;margin-top:12px;">
              View All Notices
            </a>
          </div>
          <p style="text-align:center;color:#aaa;font-size:0.8rem;margin-top:16px;">BookShelf — Siddhant College of Engineering, Pune</p>
        </div>`;
        results.push(sendEmail({ to: user.email, subject: `📢 Library Notice: ${notice.title}`, html }));
    }
    return Promise.allSettled(results);
}

/**
 * Manual reminder email (librarian sends to specific student)
 */
async function sendManualReminder(user, book, dueDate, message) {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9ff;padding:20px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#fa709a,#fee140);padding:24px;border-radius:10px;text-align:center;margin-bottom:20px;">
        <h1 style="color:#fff;margin:0;font-size:1.5rem;">⏰ Return Reminder from Librarian</h1>
      </div>
      <div style="background:#fff;padding:24px;border-radius:10px;">
        <p style="color:#333;">Hi <strong>${user.username}</strong>,</p>
        ${message ? `<p style="color:#555;">${message}</p>` : '<p style="color:#555;">The librarian has sent you a reminder about your borrowed book:</p>'}
        <div style="background:#fff8e1;padding:16px;border-radius:8px;border-left:4px solid #feca57;margin:16px 0;">
          <strong style="color:#1a1a2e;">${book.title}</strong><br>
          <span style="color:#f5576c;font-weight:600;">Due: ${new Date(dueDate).toDateString()}</span>
        </div>
        <p style="color:#888;font-size:0.9rem;">Please return or renew the book to avoid late fines (₹5/day).</p>
        <a href="${process.env.APP_URL || 'http://localhost:8080'}/borrow/current"
           style="display:inline-block;background:linear-gradient(135deg,#fa709a,#fee140);color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:600;margin-top:12px;">
          Manage My Books
        </a>
      </div>
    </div>`;
    return sendEmail({ to: user.email, subject: `⏰ Reminder: Return "${book.title}" by ${new Date(dueDate).toDateString()}`, html });
}


/**
 * Borrow confirmation email
 */
async function sendBorrowConfirmation(user, book, dueDate) {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9ff;padding:20px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:24px;border-radius:10px;text-align:center;margin-bottom:20px;">
        <h1 style="color:#fff;margin:0;font-size:1.5rem;">📚 Book Borrowed Successfully</h1>
      </div>
      <div style="background:#fff;padding:24px;border-radius:10px;">
        <p style="color:#333;">Hi <strong>${user.username}</strong>,</p>
        <p style="color:#555;">You have successfully borrowed:</p>
        <div style="background:#f0f2ff;padding:16px;border-radius:8px;border-left:4px solid #667eea;margin:16px 0;">
          <strong style="color:#1a1a2e;font-size:1.1rem;">${book.title}</strong><br>
          <span style="color:#666;">by ${book.country || book.author || 'Unknown Author'}</span>
        </div>
        <p style="color:#555;"><strong>Due Date:</strong> <span style="color:#f5576c;">${new Date(dueDate).toDateString()}</span></p>
        <p style="color:#888;font-size:0.9rem;">Please return the book on time to avoid late fines.</p>
        <a href="${process.env.APP_URL || 'http://localhost:8080'}/borrow/current"
           style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:600;margin-top:12px;">
          View My Books
        </a>
      </div>
      <p style="text-align:center;color:#aaa;font-size:0.8rem;margin-top:16px;">BookShelf Library Management System</p>
    </div>`;
    return sendEmail({ to: user.email, subject: `📚 Book Borrowed: ${book.title}`, html });
}

/**
 * Return reminder email (sent 2 days before due)
 */
async function sendReturnReminder(user, book, dueDate) {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9ff;padding:20px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#fa709a,#fee140);padding:24px;border-radius:10px;text-align:center;margin-bottom:20px;">
        <h1 style="color:#fff;margin:0;font-size:1.5rem;">⏰ Return Reminder</h1>
      </div>
      <div style="background:#fff;padding:24px;border-radius:10px;">
        <p style="color:#333;">Hi <strong>${user.username}</strong>,</p>
        <p style="color:#555;">This is a reminder that the following book is due soon:</p>
        <div style="background:#fff8e1;padding:16px;border-radius:8px;border-left:4px solid #feca57;margin:16px 0;">
          <strong style="color:#1a1a2e;">${book.title}</strong><br>
          <span style="color:#f5576c;font-weight:600;">Due: ${new Date(dueDate).toDateString()}</span>
        </div>
        <p style="color:#888;font-size:0.9rem;">Please return or renew the book to avoid late fines.</p>
        <a href="${process.env.APP_URL || 'http://localhost:8080'}/borrow/current"
           style="display:inline-block;background:linear-gradient(135deg,#fa709a,#fee140);color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:600;margin-top:12px;">
          Manage My Books
        </a>
      </div>
    </div>`;
    return sendEmail({ to: user.email, subject: `⏰ Return Reminder: ${book.title} due ${new Date(dueDate).toDateString()}`, html });
}

/**
 * Overdue alert email
 */
async function sendOverdueAlert(user, book, fineAmount) {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9ff;padding:20px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#f5576c,#f093fb);padding:24px;border-radius:10px;text-align:center;margin-bottom:20px;">
        <h1 style="color:#fff;margin:0;font-size:1.5rem;">🚨 Overdue Book Alert</h1>
      </div>
      <div style="background:#fff;padding:24px;border-radius:10px;">
        <p style="color:#333;">Hi <strong>${user.username}</strong>,</p>
        <p style="color:#555;">The following book is overdue:</p>
        <div style="background:#fff0f0;padding:16px;border-radius:8px;border-left:4px solid #f5576c;margin:16px 0;">
          <strong style="color:#1a1a2e;">${book.title}</strong><br>
          <span style="color:#f5576c;font-weight:600;">Fine: ₹${fineAmount}</span>
        </div>
        <p style="color:#888;font-size:0.9rem;">Please return the book immediately to stop accumulating fines.</p>
        <a href="${process.env.APP_URL || 'http://localhost:8080'}/borrow/current"
           style="display:inline-block;background:linear-gradient(135deg,#f5576c,#f093fb);color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:600;margin-top:12px;">
          Return Now
        </a>
      </div>
    </div>`;
    return sendEmail({ to: user.email, subject: `🚨 Overdue Book: ${book.title} — Fine: ₹${fineAmount}`, html });
}

/**
 * Reservation ready email
 */
async function sendReservationReady(user, book) {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9ff;padding:20px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#43e97b,#38f9d7);padding:24px;border-radius:10px;text-align:center;margin-bottom:20px;">
        <h1 style="color:#fff;margin:0;font-size:1.5rem;">✅ Reserved Book Available!</h1>
      </div>
      <div style="background:#fff;padding:24px;border-radius:10px;">
        <p style="color:#333;">Hi <strong>${user.username}</strong>,</p>
        <p style="color:#555;">Great news! The book you reserved is now available:</p>
        <div style="background:#f0fff8;padding:16px;border-radius:8px;border-left:4px solid #43e97b;margin:16px 0;">
          <strong style="color:#1a1a2e;">${book.title}</strong>
        </div>
        <p style="color:#888;font-size:0.9rem;">Your reservation will expire in 48 hours. Please borrow it soon!</p>
        <a href="${process.env.APP_URL || 'http://localhost:8080'}/listings/${book._id}"
           style="display:inline-block;background:linear-gradient(135deg,#43e97b,#38f9d7);color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:600;margin-top:12px;">
          Borrow Now
        </a>
      </div>
    </div>`;
    return sendEmail({ to: user.email, subject: `✅ Your reserved book is available: ${book.title}`, html });
}

/**
 * Research paper approved email
 */
async function sendResearchApproved(user, paper) {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9ff;padding:20px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#4facfe,#00f2fe);padding:24px;border-radius:10px;text-align:center;margin-bottom:20px;">
        <h1 style="color:#fff;margin:0;font-size:1.5rem;">🎓 Research Paper Approved</h1>
      </div>
      <div style="background:#fff;padding:24px;border-radius:10px;">
        <p style="color:#333;">Hi <strong>${user.username}</strong>,</p>
        <p style="color:#555;">Your research paper has been approved and published:</p>
        <div style="background:#f0f8ff;padding:16px;border-radius:8px;border-left:4px solid #4facfe;margin:16px 0;">
          <strong style="color:#1a1a2e;">${paper.title}</strong>
        </div>
        <a href="${process.env.APP_URL || 'http://localhost:8080'}/research/${paper._id}"
           style="display:inline-block;background:linear-gradient(135deg,#4facfe,#00f2fe);color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:600;margin-top:12px;">
          View Paper
        </a>
      </div>
    </div>`;
    return sendEmail({ to: user.email, subject: `🎓 Research Paper Approved: ${paper.title}`, html });
}

/**
 * Welcome email after account creation
 */
async function sendWelcomeEmail(user, password) {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9ff;padding:20px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:24px;border-radius:10px;text-align:center;margin-bottom:20px;">
        <h1 style="color:#fff;margin:0;font-size:1.5rem;">📚 Welcome to BookShelf Library</h1>
      </div>
      <div style="background:#fff;padding:24px;border-radius:10px;">
        <p style="color:#333;">Hi <strong>${user.username}</strong>,</p>
        <p style="color:#555;">Your account has been created successfully. Here are your login details:</p>
        <div style="background:#f0f2ff;padding:16px;border-radius:8px;border-left:4px solid #667eea;margin:16px 0;">
          <p style="margin:4px 0;color:#333;"><strong>Username:</strong> ${user.username}</p>
          <p style="margin:4px 0;color:#333;"><strong>Email:</strong> ${user.email}</p>
          ${password ? `<p style="margin:4px 0;color:#333;"><strong>Password:</strong> ${password}</p>` : ''}
          <p style="margin:4px 0;color:#333;"><strong>Role:</strong> ${user.role}</p>
        </div>
        <p style="color:#888;font-size:0.9rem;">Please change your password after your first login for security.</p>
        <a href="${process.env.APP_URL || 'http://localhost:8080'}/login"
           style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:600;margin-top:12px;">
          Login Now
        </a>
      </div>
      <p style="text-align:center;color:#aaa;font-size:0.8rem;margin-top:16px;">BookShelf Library Management System</p>
    </div>`;
    return sendEmail({ to: user.email, subject: `Welcome to BookShelf Library, ${user.username}!`, html });
}

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendBorrowConfirmation,
    sendBorrowApproved,
    sendDueDateChanged,
    sendReturnReminder,
    sendManualReminder,
    sendOverdueAlert,
    sendReservationReady,
    sendResearchApproved,
    sendNoticeEmail
};
