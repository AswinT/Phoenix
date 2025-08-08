const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const passwordRoutes = require('./password');
const userRoutes = require('./users');
const adminRoutes = require('./admin');
const apiRoutes = require('./api');

const userController = require('../controllers/userController/userController');
const shopPageController = require('../controllers/userController/shopPageController');
const productDetailsController = require('../controllers/userController/productDetailsController');
const cartController = require('../controllers/userController/cartController');
const wishlistController = require('../controllers/userController/wishlistController');
const checkoutController = require('../controllers/userController/checkoutController');
const orderController = require('../controllers/userController/orderController');
const contactController = require('../controllers/userController/contactController');
const { searchProducts } = require('../controllers/userController/searchController');

const searchValidator = require('../validators/user/searchValidator');
const contactValidator = require('../validators/user/contactValidator');

const { isAuthenticated } = require('../middlewares/authMiddleware');
const checkBlockedUser = require('../middlewares/checkBlockedUser');

router.use('/auth', authRoutes);
router.use('/password', passwordRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/api', apiRoutes);

router.get('/', checkBlockedUser, userController.loadHomePage);
router.get('/pageNotFound', checkBlockedUser, userController.pageNotFound);
router.get('/about', checkBlockedUser, userController.getAboutPage);
router.get('/contact', checkBlockedUser, contactController.getContact);
router.post('/contact', checkBlockedUser, contactValidator.contactValidator, contactController.postContact);

router.get('/shopPage', checkBlockedUser, shopPageController.shopPage);
router.get('/products/:id', checkBlockedUser, productDetailsController.productDetails);
router.get('/search', checkBlockedUser, searchValidator.validateSearchQuery, searchProducts);

router.get('/cart', isAuthenticated, cartController.getCart);
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

router.get('/wishlist', isAuthenticated, wishlistController.getWishlist);
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

router.get('/checkout', isAuthenticated, checkoutController.getCheckout);
router.post('/checkout/place-order', isAuthenticated, checkoutController.placeOrder);
router.get('/checkout/payment-callback', isAuthenticated, checkoutController.handlePaymentCallback);

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

router.post('/validate-referral', (req, res) => {
  res.redirect(307, '/users/referrals/validate');
});

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
router.post('/profile/send-email-otp', (req, res) => {
  res.redirect(307, '/users/profile/send-email-otp');
});
router.post('/profile/verify-email-otp', (req, res) => {
  res.redirect(307, '/users/profile/verify-email-otp');
});
router.post('/profile/send-current-email-otp', (req, res) => {
  res.redirect(307, '/users/profile/send-current-email-otp');
});
router.post('/profile/verify-current-email-otp', (req, res) => {
  res.redirect(307, '/users/profile/verify-current-email-otp');
});
router.post('/profile/send-new-email-otp', (req, res) => {
  res.redirect(307, '/users/profile/send-new-email-otp');
});
router.post('/profile/verify-new-email-otp', (req, res) => {
  res.redirect(307, '/users/profile/verify-new-email-otp');
});

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
router.post('/resend-otp', (req, res) => {
  res.redirect(307, '/password/resend-otp');
});

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
router.post('/logout', (req, res) => {
  res.redirect(307, '/auth/logout');
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
router.get('/admin/return-management/:id', (req, res) => {
  res.redirect(`/admin/returns/${req.params.id}`);
});

module.exports = router;