# 🎧 Phoenix - Premium Headphone Store

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.1.0-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.13.2-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-brightgreen.svg)](package.json)

> A modern, full-featured e-commerce platform specialized in premium headphones with comprehensive admin management, secure payments, and exceptional user experience.

## 📋 Table of Contents

- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📦 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [🚀 Usage](#-usage)
- [📚 API Documentation](#-api-documentation)
- [🏗️ Project Structure](#️-project-structure)
- [🧪 Testing](#-testing)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [📞 Support](#-support)

## ✨ Features

### 🛍️ Customer Features
- **Product Catalog**: Browse premium headphones with detailed specifications
- **Advanced Search & Filtering**: Find products by brand, connectivity, price range
- **User Authentication**: Secure signup/login with Google OAuth integration
- **Shopping Cart & Wishlist**: Persistent cart and wishlist functionality
- **Secure Checkout**: Multiple payment options with Razorpay integration
- **Order Management**: Track orders, view history, download invoices
- **User Profiles**: Manage personal information, addresses, and preferences
- **Wallet System**: Store credits and manage refunds
- **Referral Program**: Earn rewards by referring friends

### 👨‍💼 Admin Features
- **Dashboard Analytics**: Comprehensive sales and user analytics
- **Product Management**: Add, edit, and manage product inventory
- **Category Management**: Organize products with custom categories
- **Order Processing**: Manage orders, returns, and refunds
- **User Management**: Monitor and manage customer accounts
- **Coupon System**: Create and manage discount coupons
- **Offer Management**: Set up promotional offers and deals
- **Return Management**: Handle product returns and exchanges

### 🔧 Technical Features
- **Responsive Design**: Mobile-first, cross-device compatibility
- **Image Management**: Cloudinary integration for optimized image storage
- **Email Notifications**: Automated emails for orders, OTP verification
- **PDF Generation**: Invoice and report generation
- **Session Management**: Secure session handling with Express Session
- **Input Validation**: Comprehensive server-side validation
- **Error Handling**: Robust error handling and logging
- **SEO Optimized**: Clean URLs and meta tag management

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.1.0
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with Google OAuth 2.0
- **Session Management**: Express Session
- **File Upload**: Multer with Cloudinary storage
- **Email Service**: Nodemailer
- **Payment Gateway**: Razorpay
- **PDF Generation**: PDFKit
- **Validation**: Custom validation middleware

### Frontend
- **Template Engine**: EJS
- **Styling**: Custom CSS with responsive design
- **JavaScript**: Vanilla JS with modern ES6+ features
- **Image Optimization**: Cloudinary transformations

### Development Tools
- **Linting**: ESLint 9+ with flat configuration
- **Process Manager**: Nodemon for development
- **Logging**: Morgan HTTP request logger
- **Environment Management**: dotenv

## 📦 Installation

### Prerequisites
- **Node.js** 18.0.0 or higher
- **MongoDB** 4.4 or higher (local or MongoDB Atlas)
- **npm** or **yarn** package manager

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/phoenix-headphone-store.git
   cd phoenix-headphone-store
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/phoenix_store

# Session Secret
SESSION_SECRET=your_super_secret_session_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Configuration
EMAIL=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password
ADMIN_EMAIL=admin@phoenix.com

# Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### Required Service Setup

1. **MongoDB**: Set up a local MongoDB instance or use MongoDB Atlas
2. **Cloudinary**: Create account at [cloudinary.com](https://cloudinary.com)
3. **Google OAuth**: Configure OAuth app in Google Cloud Console
4. **Razorpay**: Set up merchant account at [razorpay.com](https://razorpay.com)
5. **Gmail**: Enable 2FA and generate app password for email service

## 🚀 Usage

### Development
```bash
npm run dev          # Start development server with nodemon
npm run lint         # Run ESLint checks
npm run lint:fix     # Fix ESLint issues automatically
```

### Production
```bash
npm start           # Start production server
```

### Admin Access
1. Navigate to `/admin/auth/login`
2. Use admin credentials or create admin user in database
3. Access admin dashboard at `/admin/dashboard`

## 📚 API Documentation

### Authentication Endpoints
```
POST   /auth/signup              # User registration
POST   /auth/login               # User login
GET    /auth/logout              # User logout
GET    /auth/google              # Google OAuth login
GET    /auth/google/callback     # Google OAuth callback
```

### Product Endpoints
```
GET    /shopPage                 # Browse products
GET    /products/:id             # Product details
GET    /search                   # Search products
```

### Cart & Wishlist
```
GET    /cart                     # View cart
POST   /api/cart/add             # Add to cart
PUT    /api/cart/update          # Update cart item
DELETE /api/cart/remove          # Remove from cart
POST   /api/wishlist/toggle      # Toggle wishlist item
```

### Order Management
```
GET    /orders                   # User order history
GET    /orders/:id               # Order details
POST   /checkout/place-order     # Place new order
GET    /orders/:id/invoice       # View invoice
```

### Admin API
```
GET    /admin/dashboard          # Admin dashboard
GET    /admin/products           # Manage products
GET    /admin/orders             # Manage orders
GET    /admin/users              # Manage users
```

## 🏗️ Project Structure

```
phoenix/
├── app.js                      # Application entry point
├── package.json               # Dependencies and scripts
├── eslint.config.js           # ESLint configuration
├── config/                    # Configuration files
│   ├── db.js                 # Database connection
│   ├── cloudinary.js         # Cloudinary setup
│   ├── multer.js             # File upload configuration
│   ├── passport.js           # Authentication strategies
│   └── taxConfig.js          # Tax calculation settings
├── controllers/               # Request handlers
│   ├── adminController/      # Admin-specific controllers
│   └── userController/       # User-facing controllers
├── middlewares/              # Custom middleware
├── models/                   # Database schemas
├── routes/                   # Route definitions
├── helpers/                  # Utility functions
├── validators/               # Input validation
├── views/                    # EJS templates
├── public/                   # Static assets
└── uploads/                  # File uploads directory
```

## 🧪 Testing

### Running Tests
```bash
# Lint code for style and syntax issues
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Manual testing checklist
npm run dev  # Start development server for manual testing
```

### Testing Checklist

#### User Flow Testing
- [ ] User registration and email verification
- [ ] Login with email/password and Google OAuth
- [ ] Product browsing and search functionality
- [ ] Add/remove items from cart and wishlist
- [ ] Checkout process with different payment methods
- [ ] Order tracking and invoice generation
- [ ] Profile management and address handling

#### Admin Flow Testing
- [ ] Admin login and dashboard access
- [ ] Product CRUD operations
- [ ] Category management
- [ ] Order processing and status updates
- [ ] User management and blocking/unblocking
- [ ] Coupon and offer management
- [ ] Return request handling

#### Integration Testing
- [ ] Database connectivity and operations
- [ ] Cloudinary image upload and optimization
- [ ] Email delivery for OTP and notifications
- [ ] Razorpay payment processing
- [ ] Google OAuth authentication flow

### Test Data Setup
```javascript
// Example test user creation
const testUser = {
  fullName: "Test User",
  email: "test@example.com",
  password: "securePassword123",
  phone: "+91 9876543210"
};

// Example test product
const testProduct = {
  model: "Phoenix Pro X1",
  brand: "Phoenix",
  description: "Premium wireless headphones with noise cancellation",
  regularPrice: 15999,
  salePrice: 12999,
  stock: 50,
  connectivity: "Wireless"
};
```

## 🤝 Contributing

We welcome contributions to Phoenix! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
   ```bash
   git fork https://github.com/yourusername/phoenix-headphone-store.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style and conventions
   - Add appropriate comments and documentation
   - Test your changes thoroughly

4. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Provide a clear description of your changes
   - Include screenshots for UI changes
   - Reference any related issues

### Code Style Guidelines

- **JavaScript**: Follow ESLint configuration (see `eslint.config.js`)
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use semicolons
- **Naming**: Use camelCase for variables and functions
- **Comments**: Add JSDoc comments for functions and complex logic

### Commit Message Convention
```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: adding tests
chore: maintenance tasks
```

### Areas for Contribution

- 🐛 **Bug Fixes**: Report and fix bugs
- ✨ **New Features**: Add new functionality
- 📚 **Documentation**: Improve documentation
- 🎨 **UI/UX**: Enhance user interface and experience
- ⚡ **Performance**: Optimize application performance
- 🔒 **Security**: Improve security measures
- 🧪 **Testing**: Add automated tests

## 📄 License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.

```
ISC License

Copyright (c) 2024 Aswin T

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## 📞 Support

### Getting Help

- 📧 **Email**: support@phoenix.com
- 📱 **Phone**: +91 1234567890
- 💬 **Issues**: [GitHub Issues](https://github.com/yourusername/phoenix-headphone-store/issues)
- 📖 **Documentation**: [Wiki](https://github.com/yourusername/phoenix-headphone-store/wiki)

### Frequently Asked Questions

<details>
<summary><strong>How do I reset my admin password?</strong></summary>

You can reset the admin password by directly updating the database or using the forgot password feature. For security reasons, admin password reset requires database access.
</details>

<details>
<summary><strong>Why are my images not uploading?</strong></summary>

Check your Cloudinary configuration in the `.env` file. Ensure you have the correct cloud name, API key, and API secret. Also verify that your Cloudinary account has sufficient storage quota.
</details>

<details>
<summary><strong>How do I configure email notifications?</strong></summary>

Set up Gmail app password in your Google account and add the credentials to your `.env` file. Make sure 2-factor authentication is enabled on your Gmail account.
</details>

<details>
<summary><strong>Can I use a different payment gateway?</strong></summary>

Yes, you can integrate other payment gateways by modifying the checkout controller and adding the respective SDK. The current implementation uses Razorpay for Indian market compatibility.
</details>

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection failed | Check MongoDB URI and ensure MongoDB is running |
| Google OAuth not working | Verify Google OAuth credentials and callback URL |
| Images not loading | Check Cloudinary configuration and network connectivity |
| Email not sending | Verify Gmail app password and SMTP settings |
| Payment failures | Check Razorpay credentials and webhook configuration |

---

<div align="center">

**Built with ❤️ by [Aswin T](https://github.com/AswinT)**

⭐ **Star this repository if you found it helpful!**

[🔝 Back to Top](#-phoenix---premium-headphone-store)

</div>
