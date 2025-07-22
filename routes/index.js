const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const passwordRoutes = require('./password');
const userRoutes = require('./users');
const adminRoutes = require('./admin');
const apiRoutes = require('./api');

// Import legacy route modules for backward compatibility
const legacyUserRouter = require('./userRoutes/userRouter');
const legacyAdminRouter = require('./adminRoutes/adminRoutes');

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

// Public routes that don't fit into hierarchical structure
// GET / - Home page
router.get('/', checkBlockedUser, userController.loadHomePage);

// GET /pageNotFound - 404 page
router.get('/pageNotFound', checkBlockedUser, userController.pageNotFound);

// GET /about - About page
router.get('/about', checkBlockedUser, userController.getAboutPage);

// GET /contact - Contact page
router.get('/contact', checkBlockedUser, contactController.getContact);

// POST /contact - Submit contact form
router.post('/contact', checkBlockedUser, contactValidator.contactValidator, contactController.postContact);

// Shopping routes
// GET /shopPage - Shop page
router.get('/shopPage', checkBlockedUser, shopPageController.shopPage);

// GET /products/:id - Product details
router.get('/products/:id', checkBlockedUser, productDetailsController.productDetails);

// GET /search - Search products
router.get('/search', checkBlockedUser, searchValidator.validateSearchQuery, searchProducts);

// Cart routes (keeping original paths for backward compatibility)
// GET /cart - View cart
router.get('/cart', isAuthenticated, cartController.getCart);

// Wishlist routes (keeping original paths for backward compatibility)
// GET /wishlist - View wishlist
router.get('/wishlist', isAuthenticated, wishlistController.getWishlist);

// Checkout routes (keeping original paths for backward compatibility)
// GET /checkout - Checkout page
router.get('/checkout', isAuthenticated, checkoutController.getCheckout);

// POST /checkout/place-order - Place order
router.post('/checkout/place-order', isAuthenticated, checkoutController.placeOrder);

// GET /checkout/payment-callback - Payment callback
router.get('/checkout/payment-callback', isAuthenticated, checkoutController.handlePaymentCallback);

// Order routes (keeping original paths for backward compatibility)
// GET /orders - View orders
router.get('/orders', isAuthenticated, orderController.getOrders);

// GET /orders/:id - View order details
router.get('/orders/:id', isAuthenticated, orderController.getOrderDetails);

// GET /order-success/:id - Order success page
router.get('/order-success/:id', isAuthenticated, orderController.getOrderSuccess);

// GET /payment-failure - Payment failure page
router.get('/payment-failure', isAuthenticated, orderController.getPaymentFailure);

// GET /orders/:id/invoice - View invoice
router.get('/orders/:id/invoice', isAuthenticated, orderController.viewInvoice);

// GET /orders/:id/invoice/download - Download invoice
router.get('/orders/:id/invoice/download', isAuthenticated, orderController.downloadInvoice);

// Additional order routes for backward compatibility
// POST /orders/:id/items/:productId/cancel - Cancel order item
router.post('/orders/:id/items/:productId/cancel', isAuthenticated, orderController.cancelOrderItem);

// POST /orders/:id/return - Return order
router.post('/orders/:id/return', isAuthenticated, orderController.returnOrder);

// POST /orders/:id/items/:productId/return - Return order item
const upload = require('../config/multer');
router.post('/orders/:id/items/:productId/return', isAuthenticated, upload.single('returnImage'), orderController.returnOrderItem);

// POST /orders/:id/reorder - Reorder
router.post('/orders/:id/reorder', isAuthenticated, orderController.reorder);

// Legacy routes for backward compatibility
// GET /user-coupons - User coupons (redirect to new structure)
router.get('/user-coupons', (req, res) => {
  res.redirect('/users/coupons');
});

// GET /wallet - Wallet (redirect to new structure)
router.get('/wallet', (req, res) => {
  res.redirect('/users/wallet');
});

// GET /referrals - Referrals (redirect to new structure)
router.get('/referrals', (req, res) => {
  res.redirect('/users/referrals');
});

// POST /change-password - Change password (redirect to new structure)
router.post('/change-password', (req, res) => {
  res.redirect(307, '/password/change'); // 307 preserves POST method
});

// Legacy authentication routes (redirect to new structure)
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

// Backward compatibility routes - redirect old admin routes to new structure
router.get('/admin/adminLogin', (req, res) => {
  res.redirect('/admin/auth/login');
});

router.post('/admin/adminLogin', (req, res) => {
  res.redirect(307, '/admin/auth/login'); // 307 preserves POST method
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
