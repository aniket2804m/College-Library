# 📚 Smart AI Library Platform v2.0

A production-ready, feature-rich library management system built with Node.js, Express, MongoDB, and modern web technologies.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## ✨ Features

### 📖 Book Management
- Advanced catalog with categories, ISBN, tags
- Real-time availability tracking
- Quantity management
- QR code generation for each book
- Advanced search and filtering
- Pagination support

### 🔄 Borrow/Return System
- Complete borrowing workflow
- Automatic due date calculation
- Late fine calculation
- Book renewal (up to 2 times)
- Borrow history tracking
- Overdue notifications

### 📱 QR Code System
- QR generation for books and users
- Quick borrow/return via QR scanning
- Mobile-friendly scanner interface

### 📝 Blog Platform
- Create, edit, delete blog posts
- Categories and tags
- Comments and likes
- View counter
- Featured posts

### 🔬 Research Paper Repository
- PDF upload to cloud storage
- Multiple authors support
- Keywords and categories
- Download tracking
- Review and rating system
- Admin approval workflow

### 👨‍💼 Admin Dashboard
- Comprehensive statistics
- User management
- Borrow management
- Popular books tracking
- Overdue monitoring
- Reports and analytics

### 🔒 Security Features
- Role-based access control
- Helmet.js security headers
- MongoDB injection prevention
- Rate limiting
- Input sanitization
- Secure session management

---

## 🚀 Quick Start

### Prerequisites

- Node.js v16 or higher
- MongoDB (local or Atlas)
- Cloudinary account
- Git

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd "College Library System"
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Edit `.env` file with your credentials:
```env
MONGO_URL=your_mongodb_connection_string
CLOUD_NAME=your_cloudinary_name
CLOUD_API_KEY=your_cloudinary_key
CLOUD_API_SECRET=your_cloudinary_secret
SESSION_SECRET=your_secret_key
NEWS_API_KEY=your_news_api_key (optional)
```

4. **Start the application**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

5. **Access the application**
```
http://localhost:8080
```

---

## 📁 Project Structure

```
College Library System/
├── controllers/          # Request handlers
│   ├── listings.js      # Book management
│   ├── users.js         # User authentication
│   ├── borrow.js        # Borrow/return logic
│   ├── blog.js          # Blog management
│   ├── research.js      # Research papers
│   ├── admin.js         # Admin operations
│   └── qr.js            # QR code operations
├── models/              # Database schemas
│   ├── listing.js       # Book model
│   ├── user.js          # User model
│   ├── borrowRecord.js  # Borrow tracking
│   ├── blog.js          # Blog model
│   ├── researchPaper.js # Research model
│   └── review.js        # Review model
├── routes/              # API routes
│   ├── listing.js
│   ├── user.js
│   ├── borrow.js
│   ├── blog.js
│   ├── research.js
│   ├── admin.js
│   └── qr.js
├── views/               # EJS templates
│   ├── listings/        # Book views
│   ├── users/           # Auth views
│   ├── borrow/          # Borrow views
│   ├── blogs/           # Blog views
│   ├── research/        # Research views
│   ├── admin/           # Admin views
│   ├── qr/              # QR scanner
│   ├── layouts/         # Layout templates
│   └── includes/        # Reusable components
├── public/              # Static files
│   ├── css/             # Stylesheets
│   └── js/              # Client-side scripts
├── Utils/               # Utility functions
├── middleware.js        # Custom middleware
├── Schema.js            # Joi validation schemas
├── cloudConfig.js       # Cloudinary configuration
├── app.js               # Application entry point
├── .env                 # Environment variables
└── package.json         # Dependencies

```

---

## 🔑 Default Admin Credentials

After installation, you can use these credentials:

**Username:** `admin` or `Aniket`  
**Password:** (Set during first signup)

---

## 📚 API Endpoints

### Books
- `GET /listings` - List all books
- `GET /listings/:id` - Get book details
- `POST /listings` - Create new book (admin)
- `PUT /listings/:id` - Update book (admin)
- `DELETE /listings/:id` - Delete book (admin)

### Borrow
- `GET /borrow/current` - Current borrowed books
- `GET /borrow/history` - Borrow history
- `POST /borrow/:bookId` - Borrow a book
- `POST /borrow/:recordId/return` - Return a book
- `POST /borrow/:recordId/renew` - Renew a book

### Blogs
- `GET /blogs` - List all blogs
- `GET /blogs/:id` - Get blog details
- `POST /blogs` - Create blog
- `PUT /blogs/:id` - Update blog
- `DELETE /blogs/:id` - Delete blog
- `POST /blogs/:id/like` - Like/unlike blog
- `POST /blogs/:id/comment` - Add comment

### Research Papers
- `GET /research` - List papers
- `GET /research/:id` - Get paper details
- `POST /research` - Upload paper
- `GET /research/:id/download` - Download PDF
- `POST /research/:id/review` - Add review

### Admin
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/users` - User management
- `GET /admin/borrows` - Borrow management
- `GET /admin/api/stats` - Statistics API

### QR Codes
- `GET /qr/book/:bookId` - Generate book QR
- `GET /qr/user/:userId` - Generate user QR
- `GET /qr/scanner` - QR scanner page
- `POST /qr/scan/borrow` - Process borrow scan
- `POST /qr/scan/return` - Process return scan

---

## 🎨 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js 5.1.0** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Passport.js** - Authentication

### Frontend
- **EJS** - Template engine
- **Bootstrap 5** - UI framework
- **Font Awesome** - Icons
- **Vanilla JavaScript** - Client-side logic

### Storage & APIs
- **Cloudinary** - Image and PDF storage
- **NewsAPI** - Technology news (optional)

### Security
- **Helmet.js** - Security headers
- **express-mongo-sanitize** - NoSQL injection prevention
- **express-rate-limit** - Rate limiting
- **sanitize-html** - XSS prevention

### Utilities
- **Moment.js** - Date formatting
- **QRCode** - QR code generation
- **Joi** - Validation
- **Axios** - HTTP client

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server port | No (default: 8080) |
| `MONGO_URL` | MongoDB connection string | Yes |
| `SESSION_SECRET` | Session encryption key | Yes |
| `CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUD_API_KEY` | Cloudinary API key | Yes |
| `CLOUD_API_SECRET` | Cloudinary API secret | Yes |
| `NEWS_API_KEY` | NewsAPI key | No |
| `LATE_FINE_PER_DAY` | Fine amount per day | No (default: 5) |
| `MAX_BORROW_DAYS` | Maximum borrow period | No (default: 14) |
| `MAX_BOOKS_PER_USER` | Max books per user | No (default: 5) |

---

## 👥 User Roles

### User (Default)
- Browse books
- Borrow/return books
- Write reviews
- Create blogs
- Upload research papers

### Admin/Librarian
- All user permissions
- Add/edit/delete books
- Manage users
- Approve research papers
- View analytics
- Force return books
- Manage fines

---

## 📊 Database Schema

### Collections
- **users** - User accounts and profiles
- **listings** - Book catalog
- **borrowrecords** - Borrow transactions
- **blogs** - Blog posts
- **researchpapers** - Research repository
- **reviews** - Book reviews

---

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

---

## 📈 Performance Optimization

- Database indexing for fast queries
- Pagination for large datasets
- Image optimization via Cloudinary
- Lazy loading for images
- Caching strategies
- Rate limiting

---

## 🔐 Security Best Practices

1. **Never commit `.env` file**
2. **Use strong session secrets**
3. **Enable HTTPS in production**
4. **Regular dependency updates**
5. **Input validation on all forms**
6. **Sanitize user-generated content**
7. **Implement CSRF protection**
8. **Use secure cookies**

---

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error**
```bash
# Check if MongoDB is running
# Verify MONGO_URL in .env
```

**Cloudinary Upload Error**
```bash
# Verify Cloudinary credentials
# Check file size limits
```

**Port Already in Use**
```bash
# Change PORT in .env
# Or kill process using port 8080
```

---

## 📝 TODO / Roadmap

- [ ] Complete all frontend views
- [ ] Implement E-News feature
- [ ] Add dark mode
- [ ] Integrate Chart.js for analytics
- [ ] Add email notifications
- [ ] Implement advanced search filters
- [ ] Add book recommendations
- [ ] Mobile app (React Native)
- [ ] API documentation (Swagger)
- [ ] Unit and integration tests

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👨‍💻 Authors

- **Aniket Suryawanshi** - Initial work and upgrades

---

## 🙏 Acknowledgments

- Bootstrap team for the amazing UI framework
- MongoDB team for the excellent database
- Cloudinary for cloud storage
- All open-source contributors

---

## 📞 Support

For support, email suryawanshianiket7576@gmail.com or create an issue in the repository.

---

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

---

**Made with ❤️ for education and learning**
