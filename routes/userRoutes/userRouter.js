const express = require("express");
const router = express.Router();
const passport = require("passport");

const userController = require("../../controllers/userController/userController");
const signupController = require("../../controllers/userController/signupController");
const signupValidator = require("../../validators/user/signupValidation");
const loginValidator = require('../../validators/user/loginValidator');
const loginController = require("../../controllers/userController/loginController");
const logoutController = require("../../controllers/userController/logoutController");

const passwordController = require("../../controllers/userController/forgotPasswordController");
const googleController = require("../../controllers/userController/googleAuthController");

const shopPageController = require('../../controllers/userController/shop-page-controller');
const productDetailsController = require('../../controllers/userController/product-details-controller');

const cartController = require('../../controllers/userController/cart-controller');
const wishlistController = require('../../controllers/userController/wishlist-controller');

const { isAuthenticated, isNotAuthenticated, preventBackButtonCache } = require('../../middlewares/authMiddleware');
const { addWalletBalance } = require('../../middlewares/walletMiddleware');

const { searchProducts } = require('../../controllers/userController/searchController');

const profileController = require('../../controllers/userController/profile-controller');

const addressController = require('../../controllers/userController/address-controller');

const checkoutController = require('../../controllers/userController/checkout-controller');

const orderController = require('../../controllers/userController/order-controller');

const walletController = require('../../controllers/userController/wallet-controller');

const newPasswordController = require('../../controllers/userController/change-password-controller');

const reviewController = require('../../controllers/userController/review-controller');

const contactController = require('../../controllers/userController/contact-controller');


router.use(addWalletBalance);

// Public Routes
router.get("/", userController.loadHomePage);
router.get("/pageNotFound", userController.pageNotFound);

// Authentication
router.get("/signup", isNotAuthenticated, preventBackButtonCache, signupController.getSignup);
router.post("/signup", isNotAuthenticated, signupValidator.signupValidator, signupController.postSignup);

router.get("/verify-otp", isNotAuthenticated, preventBackButtonCache, signupController.getOtp);
router.post("/verify-otp", isNotAuthenticated, signupController.verifyOtp);

router.get("/login", isNotAuthenticated, preventBackButtonCache, loginController.getLogin);
router.post("/login", isNotAuthenticated, loginValidator.loginValidator, loginController.postLogin);

// Password reset routes
router.get("/forgotPassword", isNotAuthenticated, preventBackButtonCache, passwordController.getForgotPassword);
router.post("/forgotPassword", isNotAuthenticated, passwordController.postForgotPassword);

router.get("/otpForgotPassword", isNotAuthenticated, preventBackButtonCache, passwordController.getOtpForgotPassword);
router.post("/otpForgotPassword", isNotAuthenticated, passwordController.verifyOtp);

router.post("/resend-otp", isNotAuthenticated, passwordController.resendOtp);
router.post("/resend-signup-otp", isNotAuthenticated, signupController.resendOtp);

router.get("/resetPassword", isNotAuthenticated, preventBackButtonCache, passwordController.getResetPassword);
router.patch("/resetPassword", isNotAuthenticated, passwordController.patchResetPassword);

// Logout route
router.get("/logout", isAuthenticated, logoutController.logout);

// OAuth routes
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback", googleController.googleController);

// Product routes
router.get('/shopPage', shopPageController.shopPage);
router.get('/shop', shopPageController.shopPage);
router.get('/products/:id', productDetailsController.productDetails);

// Cart routes with validation
const cartValidator = require('../../validators/user/cart-validator');
router.get('/cart', isAuthenticated, cartController.getCart);
router.post('/cart/add',
  cartValidator.validateAddToCart,
  cartValidator.validateCartItemOwnership,
  cartController.addToCart
);
router.post('/cart/update',
  isAuthenticated,
  cartValidator.validateUpdateCartQuantity,
  cartValidator.validateCartItemOwnership,
  cartController.updateCartItem
);
router.post('/cart/remove',
  isAuthenticated,
  cartValidator.validateRemoveFromCart,
  cartValidator.validateCartItemOwnership,
  cartController.removeCartItem
);
router.post('/cart/clear',
  isAuthenticated,
  cartValidator.validateCartCheckout,
  cartController.clearCart
);

// Wishlist
const wishlistValidator = require('../../validators/user/wishlist-validator');
router.get('/wishlist', isAuthenticated, wishlistController.getWishlist);
router.post('/wishlist/toggle',
  wishlistValidator.validateWishlistToggle,
  wishlistValidator.validateWishlistAuth,
  wishlistController.toggleWishlist
);
router.post('/wishlist/add-all-to-cart',
  isAuthenticated,
  wishlistValidator.validateWishlistAuth,
  wishlistController.addAllToCart
);
router.post('/wishlist/add-to-cart',
  wishlistValidator.validateWishlistToggle,
  wishlistValidator.validateWishlistAuth,
  wishlistController.addToCartFromWishlist
);
router.post('/wishlist/clear',
  isAuthenticated,
  wishlistValidator.validateClearWishlist,
  wishlistController.clearWishlist
);

// Search
const searchValidator = require('../../validators/user/search-validator');
router.get('/search', searchValidator.validateSearchQuery, searchProducts);


router.get('/profile', isAuthenticated, profileController.getProfile);
router.patch('/profile',
  isAuthenticated,
  profileController.updateProfile
);
router.post('/profile/image',
  isAuthenticated,
  profileController.uploadProfileImage
);
router.post('/request-email-update',
  isAuthenticated,
  profileController.requestEmailUpdate
);
router.get('/verify-email-otp', isAuthenticated, preventBackButtonCache, (req, res) => {
  const { createOtpMessage } = require('../../helpers/email-mask');
  const email = req.session.newEmail;
  const otpMessage = createOtpMessage(email, 'email-update');

  res.render('profile-otp', {
    maskedEmail: otpMessage.maskedEmail,
    otpMessage: otpMessage.fullMessage
  });
});
router.post('/verify-email-otp', isAuthenticated, profileController.verifyEmailOtp);
router.post('/resend-email-otp', isAuthenticated, profileController.resendEmailOtp);

// Address routes
router.get('/address', isAuthenticated, addressController.getAddress);
router.post('/address', isAuthenticated, addressController.addAddress);
router.put('/address/:id', isAuthenticated, addressController.updateAddress);
router.delete('/address/:id', isAuthenticated, addressController.deleteAddress);
router.patch('/address/:id/default', isAuthenticated, addressController.setDefaultAddress);
router.get('/address/:id', isAuthenticated, addressController.getAddressById);

// Checkout routes
const orderValidator = require('../../validators/user/order-validator');
router.get('/checkout', isAuthenticated, checkoutController.getCheckout);
router.get('/checkout/current-total', isAuthenticated, checkoutController.getCurrentCartTotal);

router.post('/checkout/place-order', isAuthenticated, orderValidator.validatePlaceOrder, checkoutController.placeOrder);




// Orders
router.get('/order-success/:id', isAuthenticated, orderController.getOrderSuccess);
router.get('/orders', isAuthenticated, orderController.getOrders);
router.get('/orders/:id', isAuthenticated, (req, res, next) => {
  console.log('=== ROUTE HIT DEBUG ===');
  console.log('Route /orders/:id hit with ID:', req.params.id);
  console.log('User session:', req.session.user_id);
  next();
}, orderController.getOrderDetails);

router.get('/orders/:id/invoice', isAuthenticated, orderController.viewInvoice);
router.get('/orders/:id/invoice/download', isAuthenticated, orderController.downloadInvoice);

router.post('/orders/:id/cancel',isAuthenticated,orderController.cancelOrder);
router.post('/orders/:id/items/:productId/cancel',isAuthenticated, orderController.cancelOrderItem);
router.post('/orders/:id/return',  isAuthenticated,orderController.returnOrder);
router.post('/orders/:id/items/:productId/return',isAuthenticated,orderController.returnOrderItem);
router.post('/orders/:id/reorder',isAuthenticated, orderController.reorder);

// Wallet
router.get('/wallet', isAuthenticated, walletController.getWallet);


router.post('/change-password', isAuthenticated, newPasswordController.changePassword);





// Contact
const contactValidator = require('../../validators/user/contact-validator');
router.get('/contact', contactController.getContact);
router.post('/contact', contactValidator.contactValidator, contactController.postContact);


router.get('/about', userController.getAboutPage);

// Reviews
router.get('/products/:productId/reviews', reviewController.getProductReviews);
router.post('/products/:productId/reviews', isAuthenticated, reviewController.submitReview);
router.delete('/reviews/:reviewId', isAuthenticated, reviewController.deleteReview);

module.exports = router;