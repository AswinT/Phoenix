const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require('../../controllers/userController/userController');
const signupController = require('../../controllers/userController/signupController');
const { validateCompleteSignup } = require('../../validators/user/signupValidation');
const loginValidator = require('../../validators/user/loginValidator');
const loginController = require('../../controllers/userController/loginController');
const logoutController = require('../../controllers/userController/logoutController');
const passwordController = require('../../controllers/userController/forgotPasswordController');
const googleController = require('../../controllers/userController/googleAuthController');
const shopPageController = require('../../controllers/userController/shopPageController');
const productDetailsController = require('../../controllers/userController/productDetailsController');
const cartController = require('../../controllers/userController/cartController');
const wishlistController = require('../../controllers/userController/wishlistController');
const { isAuthenticated, isNotAuthenticated, preventBackButtonCache } = require('../../middlewares/authMiddleware');
const checkBlockedUser = require('../../middlewares/checkBlockedUser');
const { searchProducts } = require('../../controllers/userController/searchController');
const profileController = require('../../controllers/userController/profileController');
const addressController = require('../../controllers/userController/addressController');
const checkoutController = require('../../controllers/userController/checkoutController');
const orderController = require('../../controllers/userController/orderController');
const newPasswordController = require('../../controllers/userController/changePasswordController');
const userCouponController = require('../../controllers/userController/userCouponController');
const walletController = require('../../controllers/userController/walletController');
const referralController = require('../../controllers/userController/referralController');
const contactController = require('../../controllers/userController/contactController');
const upload = require('../../config/multer');
router.get('/', checkBlockedUser, userController.loadHomePage);
router.get('/pageNotFound', checkBlockedUser, userController.pageNotFound);
router.get('/signup', isNotAuthenticated, preventBackButtonCache, signupController.getSignup);
router.post('/signup', isNotAuthenticated, validateCompleteSignup, signupController.postSignup);
router.get('/verify-otp', isNotAuthenticated, preventBackButtonCache, signupController.getOtp);
router.post('/verify-otp', isNotAuthenticated, signupController.verifyOtp);
router.get('/login', isNotAuthenticated, preventBackButtonCache, loginController.getLogin);
router.post('/login', isNotAuthenticated, loginValidator.loginValidator, loginController.postLogin);
router.get('/forgotPassword', isNotAuthenticated, preventBackButtonCache, passwordController.getForgotPassword);
router.post('/forgotPassword', isNotAuthenticated, passwordController.postForgotPassword);
router.get('/otpForgotPassword', isNotAuthenticated, preventBackButtonCache, passwordController.getOtpForgotPassword);
router.post('/otpForgotPassword', isNotAuthenticated, passwordController.verifyOtp);
router.post('/resend-otp', isNotAuthenticated, passwordController.resendOtp);
router.post('/resend-signup-otp', isNotAuthenticated, signupController.resendOtp);
router.get('/resetPassword', isNotAuthenticated, preventBackButtonCache, passwordController.getResetPassword);
router.patch('/resetPassword', isNotAuthenticated, passwordController.patchResetPassword);
router.get('/logout', isAuthenticated, logoutController.logout);
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', googleController.googleController);
router.get('/shopPage', checkBlockedUser, shopPageController.shopPage);
router.get('/products/:id', checkBlockedUser, productDetailsController.productDetails);
const cartValidator = require('../../validators/user/cartValidator');
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
const wishlistValidator = require('../../validators/user/wishlistValidator');
router.get('/wishlist', isAuthenticated, wishlistController.getWishlist);
router.post('/wishlist/toggle',
  wishlistValidator.validateWishlistToggle,
  wishlistValidator.validateWishlistAuth,
  wishlistController.toggleWishlist
);
router.post('/wishlist/add-to-cart',
  isAuthenticated,
  wishlistValidator.validateWishlistAuth,
  wishlistController.addToCartFromWishlist
);
router.post('/wishlist/add-all-to-cart',
  isAuthenticated,
  wishlistValidator.validateWishlistAuth,
  wishlistController.addAllToCart
);
router.post('/wishlist/clear',
  isAuthenticated,
  wishlistValidator.validateClearWishlist,
  wishlistController.clearWishlist
);
const searchValidator = require('../../validators/user/searchValidator');
router.get('/search', checkBlockedUser, searchValidator.validateSearchQuery, searchProducts);
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
  const { createOtpMessage } = require('../../helpers/emailMask');
  const email = req.session.newEmail;
  const otpMessage = createOtpMessage(email, 'email-update');
  res.render('profile-otp', {
    maskedEmail: otpMessage.maskedEmail,
    otpMessage: otpMessage.fullMessage
  });
});
router.post('/verify-email-otp', isAuthenticated, profileController.verifyEmailOtp);
router.post('/resend-email-otp', isAuthenticated, profileController.resendEmailOtp);
router.get('/address', isAuthenticated, addressController.getAddress);
router.post('/address', isAuthenticated, addressController.addAddress);
router.put('/address/:id', isAuthenticated, addressController.updateAddress);
router.delete('/address/:id', isAuthenticated, addressController.deleteAddress);
router.patch('/address/:id/default', isAuthenticated, addressController.setDefaultAddress);
router.get('/address/:id', isAuthenticated, addressController.getAddressById);
router.get('/checkout', isAuthenticated, checkoutController.getCheckout);
router.get('/checkout/current-total', isAuthenticated, checkoutController.getCurrentCartTotal);
router.post('/checkout/place-order', isAuthenticated, checkoutController.placeOrder);
router.post('/checkout/apply-coupon', isAuthenticated, checkoutController.applyCoupon);
router.post('/checkout/remove-coupon', isAuthenticated, checkoutController.removeCoupon);
router.post('/checkout/create-razorpay-order', isAuthenticated, checkoutController.createRazorpayOrder);
router.post('/checkout/verify-payment', isAuthenticated, checkoutController.verifyRazorpayPayment);
router.post('/checkout/payment-failure', isAuthenticated, checkoutController.handlePaymentFailure);
router.get('/checkout/payment-callback', isAuthenticated, checkoutController.handlePaymentCallback);
router.post('/orders/:orderId/retry-payment', isAuthenticated, checkoutController.retryPayment);
router.post('/checkout/verify-retry-payment', isAuthenticated, checkoutController.verifyRetryPayment);
router.get('/orders', isAuthenticated, orderController.getOrders);
router.get('/orders/:id', isAuthenticated, orderController.getOrderDetails);
router.get('/order-success/:id', isAuthenticated, orderController.getOrderSuccess);
router.get('/payment-failure', isAuthenticated, orderController.getPaymentFailure);
router.get('/orders/:id/invoice', isAuthenticated, orderController.viewInvoice);
router.get('/orders/:id/invoice/download', isAuthenticated, orderController.downloadInvoice);
router.post('/orders/:id/cancel',isAuthenticated,orderController.cancelOrder);
router.post('/orders/:id/items/:productId/cancel',isAuthenticated, orderController.cancelOrderItem);
router.post('/orders/:id/return',  isAuthenticated,orderController.returnOrder);
router.post('/orders/:id/items/:productId/return', isAuthenticated, upload.single('returnImage'), orderController.returnOrderItem);
router.post('/orders/:id/reorder',isAuthenticated, orderController.reorder);
router.post('/change-password', isAuthenticated, newPasswordController.changePassword);
router.get('/user-coupons', isAuthenticated, userCouponController.getUserCoupons);
router.get('/wallet', isAuthenticated, walletController.getWallet);
router.get('/referrals', isAuthenticated, referralController.getReferrals);
router.post('/validate-referral', referralController.validateReferral);
const contactValidator = require('../../validators/user/contactValidator');
router.get('/contact', checkBlockedUser, contactController.getContact);
router.post('/contact', checkBlockedUser, contactValidator.contactValidator, contactController.postContact);
router.get('/about', checkBlockedUser, userController.getAboutPage);
module.exports = router;
