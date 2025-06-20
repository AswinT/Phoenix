# 🎧 Phoenix Headphone Store

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js">
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/EJS-B4CA65?style=for-the-badge&logo=ejs&logoColor=black" alt="EJS">
  <img src="https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white" alt="Cloudinary">
</div>

<div align="center">
  <h3>🚀 Premium Headphones & Audio Solutions E-commerce Platform</h3>
  <p><em>A full-stack web application built with modern technologies for selling premium headphones and audio equipment</em></p>
</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [⚙️ Configuration](#️-configuration)
- [🔐 Authentication](#-authentication)
- [📱 API Endpoints](#-api-endpoints)
- [🎨 Frontend Features](#-frontend-features)
- [👨‍💼 Admin Panel](#-admin-panel)
- [🔧 Development](#-development)
- [📝 License](#-license)

---

## ✨ Features

### 🛍️ **Customer Features**
- 🏠 **Modern Landing Page** - Attractive homepage with featured products
- 🔍 **Product Catalog** - Browse and search premium headphones
- 📱 **Responsive Design** - Optimized for all devices
- 👤 **User Authentication** - Secure login/signup with email verification
- 🔐 **Google OAuth** - Quick login with Google account
- 🔒 **Password Recovery** - Forgot password with OTP verification
- ⭐ **Product Reviews** - Rate and review products
- 👍 **Helpful Reviews** - Mark reviews as helpful
- 📧 **Email Notifications** - OTP and account-related emails
- 📞 **Contact & About Pages** - Company information and contact form

### 👨‍💼 **Admin Features**
- 📊 **Admin Dashboard** - Comprehensive overview and analytics
- 👥 **Customer Management** - View and manage customer accounts
- 🏷️ **Category Management** - Add, edit, and manage product categories
- 📦 **Product Management** - Full CRUD operations for products
- 🖼️ **Image Management** - Upload and manage multiple product images
- 🔄 **Product Status Control** - Enable/disable products
- 🚫 **User Blocking** - Block/unblock customer accounts
- 📈 **Inventory Management** - Track stock levels

---

## 🛠️ Tech Stack

### **Backend**
- **Runtime:** Node.js
- **Framework:** Express.js 5.1.0
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** Passport.js with Google OAuth 2.0
- **Session Management:** Express Session
- **Password Hashing:** bcrypt
- **File Upload:** Multer
- **Cloud Storage:** Cloudinary
- **Email Service:** Nodemailer

### **Frontend**
- **Template Engine:** EJS
- **Styling:** CSS3 with responsive design
- **HTTP Methods:** Method Override for RESTful operations

### **Development Tools**
- **Process Manager:** Nodemon
- **Environment Variables:** dotenv
- **Security:** NoCache middleware
- **Error Handling:** Custom error middleware

---

## 📁 Project Structure

```
Phoenix/
├── 📁 config/
│   ├── db.js              # Database connection
│   └── passport.js        # Passport configuration
├── 📁 controllers/
│   ├── 📁 admin/
│   │   ├── adminController.js
│   │   ├── categoryController.js
│   │   ├── customerController.js
│   │   └── productController.js
│   └── 📁 user/
│       ├── productController.js
│       ├── reviewController.js
│       └── userController.js
├── 📁 middlewares/
│   ├── errorHandler.js    # Global error handling
│   ├── multer.js         # File upload configuration
│   └── userAuthCheck.js  # Authentication middleware
├── 📁 models/
│   ├── category.js       # Category schema
│   ├── product.js        # Product schema
│   ├── review.js         # Review schema
│   └── user.js           # User schema
├── 📁 public/
│   ├── 📁 css/          # Stylesheets
│   ├── 📁 images/       # Static images
│   └── 📁 uploads/      # Uploaded files
├── 📁 routes/
│   ├── adminRouter.js    # Admin routes
│   └── userRouter.js     # User routes
├── 📁 services/
│   └── productDataService.js
├── 📁 views/            # EJS templates
├── app.js               # Main application file
├── package.json         # Dependencies
└── .env                 # Environment variables
```

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Cloudinary account (for image storage)
- Gmail account (for email services)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Phoenix
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file** (see [Configuration](#️-configuration))

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   - **User Interface:** `http://localhost:3000`
   - **Admin Panel:** `http://localhost:3000/admin`

---

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/phoenix
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/phoenix

# Session Secret
SESSION_SECRET_KEY=your-super-secret-session-key

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Email Configuration (Gmail)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
```

---

## 🔐 Authentication

### **User Authentication**
- **Local Authentication:** Email/password with bcrypt hashing
- **Google OAuth 2.0:** Quick login with Google account
- **Email Verification:** OTP-based email verification
- **Password Recovery:** Secure password reset with OTP
- **Session Management:** Secure session handling

### **Admin Authentication**
- **Separate Admin Login:** Dedicated admin authentication
- **Session-based:** Secure admin session management
- **Access Control:** Protected admin routes

---

## 📱 API Endpoints

### **User Routes**
```
GET    /                    # Landing page
GET    /about              # About page
GET    /contact-us         # Contact page
GET    /login              # Login page
POST   /login              # User login
GET    /signup             # Signup page
POST   /signup             # User registration
POST   /verify-otp         # Email verification
POST   /resend-otp         # Resend verification OTP
GET    /forgot-password    # Forgot password page
POST   /forgot-password    # Send reset OTP
POST   /forgot-verify-otp  # Verify reset OTP
GET    /newpassword        # New password page
POST   /reset-password     # Reset password
POST   /logout             # User logout

# Google OAuth
GET    /auth/google         # Google OAuth login
GET    /auth/google/callback # Google OAuth callback

# Products
GET    /products           # Product listing
GET    /products/:id       # Product details

# Reviews
POST   /products/:id/reviews      # Submit review
GET    /products/:id/reviews      # Get product reviews
GET    /products/:id/user-review  # Check user review
POST   /reviews/:reviewId/helpful # Mark review helpful
```

### **Admin Routes**
```
GET    /admin/login        # Admin login page
POST   /admin/login        # Admin login
POST   /admin/adminlogout  # Admin logout
GET    /admin/dashboard    # Admin dashboard

# Customer Management
GET    /admin/customers    # Customer list
PATCH  /admin/customer-block-unblock/:id # Block/unblock customer

# Category Management
GET    /admin/category     # Category listing
GET    /admin/category/add # Add category page
POST   /admin/add-category # Create category
GET    /admin/category/edit/:id # Edit category page
POST   /admin/update-category/:id # Update category
POST   /admin/category-list-unlist/:id # List/unlist category
POST   /admin/category/delete/:id # Soft delete category

# Product Management
GET    /admin/products     # Product listing
GET    /admin/product/add  # Add product page
POST   /admin/product/add  # Create product
GET    /admin/product/edit/:id # Edit product page
PUT    /admin/products/:id # Update product
DELETE /admin/products/:id/images/:imageIndex # Delete product image
PATCH  /admin/products/:id/images/:imageIndex/set-main # Set main image
POST   /admin/product-toggle/:id # Toggle product status
POST   /admin/product/delete/:id # Soft delete product
```

---

## 🎨 Frontend Features

### **Responsive Design**
- 📱 Mobile-first approach
- 💻 Desktop optimization
- 🎨 Modern UI/UX design
- ⚡ Fast loading times

### **User Experience**
- 🔍 Product search and filtering
- 📸 Image galleries with zoom
- ⭐ Star rating system
- 💬 Review system with helpful votes
- 📧 Email notifications
- 🔔 Flash messages and alerts

---

## 👨‍💼 Admin Panel

### **Dashboard Features**
- 📊 Sales analytics
- 📈 User statistics
- 📦 Inventory overview
- 🔔 Recent activities

### **Management Tools**
- 👥 **Customer Management:** View, block/unblock customers
- 🏷️ **Category Management:** CRUD operations for categories
- 📦 **Product Management:** Full product lifecycle management
- 🖼️ **Image Management:** Multiple image upload with Cloudinary
- 📊 **Inventory Control:** Stock management and tracking

---

## 🔧 Development

### **Available Scripts**
```bash
npm start      # Start production server
npm run dev    # Start development server with nodemon
npm test       # Run tests (not implemented)
```

### **Development Guidelines**
- 🔄 Use nodemon for auto-restart during development
- 🛡️ Follow security best practices
- 📝 Maintain clean code structure
- 🧪 Write tests for new features
- 📚 Document new endpoints and features

### **Code Structure**
- **MVC Pattern:** Model-View-Controller architecture
- **Middleware:** Custom middleware for authentication and error handling
- **Services:** Business logic separation
- **Validation:** Input validation and sanitization
- **Error Handling:** Centralized error management

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Express.js** - Fast, unopinionated web framework
- **MongoDB** - NoSQL database for modern applications
- **Cloudinary** - Cloud-based image management
- **Passport.js** - Simple, unobtrusive authentication
- **EJS** - Embedded JavaScript templating

---

<div align="center">
  <h3>🎧 Built with ❤️ by Phoenix Team</h3>
  <p><em>Delivering premium audio experiences through technology</em></p>
</div>

---

## 📞 Support

For support, email support@phoenix-headphones.com or create an issue in this repository.

## 🔗 Links

- [Live Demo](#) - Coming Soon
- [Documentation](#) - Coming Soon
- [API Documentation](#) - Coming Soon

---

<div align="center">
  <sub>⭐ Star this repository if you found it helpful!</sub>
</div>