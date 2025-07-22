/**
 * User Routes Index
 * Main router that combines all user-related route modules
 * 
 * @description Centralized user routing with feature-based organization
 * @routes /user/*
 */

const express = require('express');
const userMainRouter = express.Router();

// Import feature-based route modules
const authRoutes = require('./auth');
const passwordRoutes = require('./password');
const profileRoutes = require('./profile');
const shopRoutes = require('./shop');
const ordersRoutes = require('./orders');

// Import additional controllers for routes that don't fit into specific modules
const userController = require('../../controllers/userController/userController');
const categoryController = require('../../controllers/userController/categoryController');
const contactController = require('../../controllers/userController/contactController');

// Import auth controllers for direct routes
const loginController = require('../../controllers/userController/loginController');
const signupController = require('../../controllers/userController/signupController');

// Import profile controller for direct profile route
const profileController = require('../../controllers/userController/profileController');

// Import middleware
const cartWishlistMiddleware = require('../../middlewares/cartWishlistMiddleware');
const { isAuthenticated, isNotAuthenticated, preventBackButtonCache } = require('../../middlewares/authMiddleware');
const checkBlockedUser = require('../../middlewares/checkBlockedUser');

// Import validators
const { contactValidator } = require('../../validators/user/contactValidator');
const { loginValidator } = require('../../validators/user/loginValidator');
const { signupValidator } = require('../../validators/user/signupValidation');

/**
 * Mount feature-based route modules
 */
userMainRouter.use('/auth', authRoutes);
userMainRouter.use('/password', passwordRoutes);
userMainRouter.use('/profile', profileRoutes);
userMainRouter.use('/shop', shopRoutes);
userMainRouter.use('/orders', ordersRoutes);

/**
 * @route GET /
 * @description Display home page
 * @access Public
 */
userMainRouter.get('/',
  cartWishlistMiddleware,
  userController.loadHomePage
);

/**
 * Direct Authentication Routes (for backward compatibility)
 */

/**
 * @route GET /login
 * @description Display login page
 * @access Public
 */
userMainRouter.get('/login',
  isNotAuthenticated,
  preventBackButtonCache,
  loginController.getLogin
);

/**
 * @route POST /login
 * @description Process user login
 * @access Public
 */
userMainRouter.post('/login',
  isNotAuthenticated,
  loginValidator,
  loginController.postLogin
);

/**
 * @route GET /signup
 * @description Display signup page
 * @access Public
 */
userMainRouter.get('/signup',
  isNotAuthenticated,
  preventBackButtonCache,
  signupController.getSignup
);

/**
 * @route POST /signup
 * @description Process user registration
 * @access Public
 */
userMainRouter.post('/signup',
  isNotAuthenticated,
  signupValidator,
  signupController.postSignup
);

/**
 * @route GET /verify-otp
 * @description Display OTP verification page
 * @access Public
 */
userMainRouter.get('/verify-otp',
  isNotAuthenticated,
  signupController.getOtp
);

/**
 * @route POST /verify-otp
 * @description Process OTP verification
 * @access Public
 */
userMainRouter.post('/verify-otp',
  isNotAuthenticated,
  signupController.verifyOtp
);

/**
 * @route GET /profile
 * @description Display user profile (redirect to profile view)
 * @access Private
 */
userMainRouter.get('/profile',
  isAuthenticated,
  checkBlockedUser,
  (req, res) => res.redirect('/profile/view')
);

/**
 * @route GET /about
 * @description Display about page
 * @access Public
 */
userMainRouter.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Us - Phoenix Store',
    user: res.locals.user
  });
});

/**
 * @route GET /privacy
 * @description Display privacy policy page
 * @access Public
 */
userMainRouter.get('/privacy', (req, res) => {
  res.render('privacy', {
    title: 'Privacy Policy - Phoenix Store',
    user: res.locals.user
  });
});

/**
 * @route GET /terms
 * @description Display terms of service page
 * @access Public
 */
userMainRouter.get('/terms', (req, res) => {
  res.render('terms', {
    title: 'Terms of Service - Phoenix Store',
    user: res.locals.user
  });
});

/**
 * @route GET /shopPage
 * @description Legacy shop page route (redirect to new route)
 * @access Public
 */
userMainRouter.get('/shopPage',
  (req, res) => {
    // Preserve query parameters
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const redirectUrl = queryString ? `/shop/products?${queryString}` : '/shop/products';
    res.redirect(redirectUrl);
  }
);

/**
 * @route GET /products/:id
 * @description Legacy product details route (redirect to new route)
 * @access Public
 */
userMainRouter.get('/products/:id',
  (req, res) => {
    res.redirect(`/shop/products/${req.params.id}`);
  }
);

/**
 * @route GET /categories
 * @description Display categories page
 * @access Public
 */
userMainRouter.get('/categories',
  cartWishlistMiddleware,
  categoryController.getCategories
);

/**
 * @route GET /categories/:categoryId
 * @description Display products by category
 * @access Public
 */
// Temporarily commented out - need to implement this method
// userMainRouter.get('/categories/:categoryId',
//   attachCartAndWishlistCounts,
//   categoryController.getProductsByCategory
// );

/**
 * @route GET /contact
 * @description Display contact page
 * @access Public
 */
userMainRouter.get('/contact',
  cartWishlistMiddleware,
  (request, response) => {
    response.render('user/contact', {
      title: 'Contact Us - Phoenix Store',
      user: response.locals.user,
      cartCount: response.locals.cartCount,
      wishlistCount: response.locals.wishlistCount
    });
  }
);

/**
 * @route POST /contact
 * @description Process contact form submission
 * @access Public
 */
userMainRouter.post('/contact',
  contactValidator,
  contactController.postContact
);

/**
 * @route GET /about
 * @description Display about page
 * @access Public
 */
userMainRouter.get('/about',
  cartWishlistMiddleware,
  (request, response) => {
    response.render('user/about', {
      title: 'About Us - Phoenix Store',
      user: response.locals.user,
      cartCount: response.locals.cartCount,
      wishlistCount: response.locals.wishlistCount
    });
  }
);

/**
 * @route GET /privacy
 * @description Display privacy policy page
 * @access Public
 */
userMainRouter.get('/privacy',
  cartWishlistMiddleware,
  (request, response) => {
    response.render('user/privacy', {
      title: 'Privacy Policy - Phoenix Store',
      user: response.locals.user,
      cartCount: response.locals.cartCount,
      wishlistCount: response.locals.wishlistCount
    });
  }
);

/**
 * @route GET /terms
 * @description Display terms of service page
 * @access Public
 */
userMainRouter.get('/terms',
  cartWishlistMiddleware,
  (request, response) => {
    response.render('user/terms', {
      title: 'Terms of Service - Phoenix Store',
      user: response.locals.user,
      cartCount: response.locals.cartCount,
      wishlistCount: response.locals.wishlistCount
    });
  }
);

module.exports = userMainRouter;
