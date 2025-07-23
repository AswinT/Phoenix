const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const passwordRoutes = require('./password');
const userRoutes = require('./users');
const adminRoutes = require('./admin');
const apiRoutes = require('./api');

// Import controllers for routes that don't fit the new structure yet
const userController = require('../controllers/userController/userController');
const shopPageController = require('../controllers/userController/shopPageController');
const productDetailsController = require('../controllers/userController/productDetailsController');
const cartController = require('../controllers/userController/cartController');
const wishlistController = require('../controllers/userController/wishlistController');
const checkoutController = require('../controllers/userController/checkoutController');
const orderController = require('../controllers/userController/orderController');
const contactController = require('../controllers/userController/contactController');
const { searchProducts } = require('../controllers/userController/searchController');

// Import validators
const searchValidator = require('../validators/user/searchValidator');
const contactValidator = require('../validators/user/contactValidator');

// Import middleware
const { isAuthenticated } = require('../middlewares/authMiddleware');
const checkBlockedUser = require('../middlewares/checkBlockedUser');

// Mount hierarchical route modules
router.use('/auth', authRoutes);
router.use('/password', passwordRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/api', apiRoutes);

// Public routes
router.get('/', checkBlockedUser, userController.loadHomePage);
router.get('/pageNotFound', checkBlockedUser, userController.pageNotFound);
router.get('/about', checkBlockedUser, userController.getAboutPage);
router.get('/contact', checkBlockedUser, contactController.getContact);
router.post('/contact', checkBlockedUser, contactValidator.contactValidator, contactController.postContact);

// Shopping routes
router.get('/shopPage', checkBlockedUser, shopPageController.shopPage);
router.get('/products/:id', checkBlockedUser, productDetailsController.productDetails);
router.get('/search', checkBlockedUser, searchValidator.validateSearchQuery, searchProducts);

// Cart routes
router.get('/cart', isAuthenticated, cartController.getCart);
// Backward compatibility for cart API routes
router.post('/cart/add', (req, res) => {
  res.redirect(307, '/api/cart/add');
});
router.put('/cart/update', (req, res) => {
  res.redirect(307, '/api/cart/update');
});
router.delete('/cart/remove', (req, res) => {
  res.redirect(307, '/api/cart/remove');
});
router.post('/cart/remove', (req, res) => {
  res.redirect(307, '/api/cart/remove');
});
router.post('/cart/clear', (req, res) => {
  res.redirect(307, '/api/cart/clear');
});

// Wishlist routes
router.get('/wishlist', isAuthenticated, wishlistController.getWishlist);
// Backward compatibility for wishlist API routes
router.post('/wishlist/toggle', (req, res) => {
  res.redirect(307, '/api/wishlist/toggle');
});
router.post('/wishlist/add-to-cart', (req, res) => {
  res.redirect(307, '/api/wishlist/add-to-cart');
});
router.post('/wishlist/add-all-to-cart', (req, res) => {
  res.redirect(307, '/api/wishlist/add-all-to-cart');
});
router.post('/wishlist/clear', (req, res) => {
  res.redirect(307, '/api/wishlist/clear');
});

// Checkout routes
router.get('/checkout', isAuthenticated, checkoutController.getCheckout);
router.post('/checkout/place-order', isAuthenticated, checkoutController.placeOrder);
router.get('/checkout/payment-callback', isAuthenticated, checkoutController.handlePaymentCallback);

// Order routes
router.get('/orders', isAuthenticated, orderController.getOrders);
router.get('/orders/:id', isAuthenticated, orderController.getOrderDetails);
router.get('/order-success/:id', isAuthenticated, orderController.getOrderSuccess);
router.get('/payment-failure', isAuthenticated, orderController.getPaymentFailure);
router.get('/orders/:id/invoice', isAuthenticated, orderController.viewInvoice);
router.get('/orders/:id/invoice/download', isAuthenticated, orderController.downloadInvoice);
router.post('/orders/:id/items/:productId/cancel', isAuthenticated, orderController.cancelOrderItem);
router.post('/orders/:id/return', isAuthenticated, orderController.returnOrder);

const upload = require('../config/multer');
router.post('/orders/:id/items/:productId/return', isAuthenticated, upload.single('returnImage'), orderController.returnOrderItem);
router.post('/orders/:id/reorder', isAuthenticated, orderController.reorder);

// Legacy routes for backward compatibility
router.get('/user-coupons', (req, res) => {
  res.redirect('/users/coupons');
});
router.get('/wallet', (req, res) => {
  res.redirect('/users/wallet');
});
router.get('/referrals', (req, res) => {
  res.redirect('/users/referrals');
});
router.post('/change-password', (req, res) => {
  res.redirect(307, '/password/change');
});

// Legacy address routes
router.get('/address', (req, res) => {
  res.redirect('/users/addresses');
});
router.post('/address', (req, res) => {
  res.redirect(307, '/users/addresses');
});
router.get('/address/:id', (req, res) => {
  res.redirect(`/users/addresses/${req.params.id}`);
});
router.put('/address/:id', (req, res) => {
  res.redirect(307, `/users/addresses/${req.params.id}`);
});
router.delete('/address/:id', (req, res) => {
  res.redirect(307, `/users/addresses/${req.params.id}`);
});
router.patch('/address/:id/default', (req, res) => {
  res.redirect(307, `/users/addresses/${req.params.id}/default`);
});

// Legacy referral validation route
router.post('/validate-referral', (req, res) => {
  res.redirect(307, '/users/referrals/validate');
});

// Legacy profile routes
router.get('/profile', (req, res) => {
  res.redirect('/users/profile');
});
router.patch('/profile', (req, res) => {
  res.redirect(307, '/users/profile');
});
router.post('/profile/image', (req, res) => {
  res.redirect(307, '/users/profile/image');
});
router.post('/request-email-update', (req, res) => {
  res.redirect(307, '/users/profile/email/request');
});

// Legacy OTP routes
router.get('/verify-otp', (req, res) => {
  res.redirect('/auth/verify-otp');
});
router.post('/verify-otp', (req, res) => {
  res.redirect(307, '/auth/verify-otp');
});
router.get('/otpForgotPassword', (req, res) => {
  res.redirect('/password/verify-otp');
});
router.post('/otpForgotPassword', (req, res) => {
  res.redirect(307, '/password/verify-otp');
});

// Legacy authentication routes
router.get('/signup', (req, res) => {
  res.redirect('/auth/signup');
});
router.post('/signup', (req, res) => {
  res.redirect(307, '/auth/signup');
});
router.get('/login', (req, res) => {
  res.redirect('/auth/login');
});
router.post('/login', (req, res) => {
  res.redirect(307, '/auth/login');
});
router.get('/logout', (req, res) => {
  res.redirect('/auth/logout');
});
router.get('/forgotPassword', (req, res) => {
  res.redirect('/password/forgot');
});
router.post('/forgotPassword', (req, res) => {
  res.redirect(307, '/password/forgot');
});
router.get('/resetPassword', (req, res) => {
  res.redirect('/password/reset');
});
router.patch('/resetPassword', (req, res) => {
  res.redirect(307, '/password/reset');
});

// Backward compatibility admin routes
router.get('/admin/adminLogin', (req, res) => {
  res.redirect('/admin/auth/login');
});
router.post('/admin/adminLogin', (req, res) => {
  res.redirect(307, '/admin/auth/login');
});
router.get('/admin/adminLogout', (req, res) => {
  res.redirect('/admin/auth/logout');
});
router.get('/admin/adminDashboard', (req, res) => {
  res.redirect('/admin/dashboard');
});
router.get('/admin/getUsers', (req, res) => {
  res.redirect('/admin/users');
});
router.get('/admin/getProducts', (req, res) => {
  res.redirect('/admin/products');
});
router.get('/admin/add-product', (req, res) => {
  res.redirect('/admin/products/add');
});
router.get('/admin/getOrders', (req, res) => {
  res.redirect('/admin/orders');
});
router.get('/admin/return-management', (req, res) => {
  res.redirect('/admin/returns');
});

module.exports = router;
