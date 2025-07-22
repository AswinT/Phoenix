const express = require('express');
const router = express.Router();

// Import controllers
const cartController = require('../../controllers/userController/cartController');
const wishlistController = require('../../controllers/userController/wishlistController');
const checkoutController = require('../../controllers/userController/checkoutController');
const orderController = require('../../controllers/userController/orderController');

// Import validators
const cartValidator = require('../../validators/user/cartValidator');
const wishlistValidator = require('../../validators/user/wishlistValidator');

// Import middleware
const { isAuthenticated } = require('../../middlewares/authMiddleware');
const checkBlockedUser = require('../../middlewares/checkBlockedUser');

// Cart API Routes
// POST /api/cart/add - Add item to cart
router.post('/cart/add',
  isAuthenticated,
  cartValidator.validateAddToCart,
  cartController.addToCart
);

// PUT /api/cart/update - Update cart item quantity
router.put('/cart/update',
  isAuthenticated,
  cartValidator.validateUpdateCartQuantity,
  cartController.updateCartItem
);

// DELETE /api/cart/remove - Remove item from cart
router.delete('/cart/remove',
  isAuthenticated,
  cartValidator.validateRemoveFromCart,
  cartController.removeCartItem
);

// POST /api/cart/clear - Clear entire cart
router.post('/cart/clear',
  isAuthenticated,
  cartValidator.validateCartCheckout,
  cartController.clearCart
);

// Wishlist API Routes
// POST /api/wishlist/toggle - Toggle item in wishlist
router.post('/wishlist/toggle',
  wishlistValidator.validateWishlistToggle,
  wishlistValidator.validateWishlistAuth,
  wishlistController.toggleWishlist
);

// POST /api/wishlist/add-to-cart - Add wishlist item to cart
router.post('/wishlist/add-to-cart',
  isAuthenticated,
  wishlistValidator.validateWishlistAuth,
  wishlistController.addToCartFromWishlist
);

// POST /api/wishlist/add-all-to-cart - Add all wishlist items to cart
router.post('/wishlist/add-all-to-cart',
  isAuthenticated,
  wishlistValidator.validateWishlistAuth,
  wishlistController.addAllToCart
);

// POST /api/wishlist/clear - Clear entire wishlist
router.post('/wishlist/clear',
  isAuthenticated,
  wishlistValidator.validateClearWishlist,
  wishlistController.clearWishlist
);

// Checkout API Routes
// GET /api/checkout/current-total - Get current cart total
router.get('/checkout/current-total', isAuthenticated, checkoutController.getCurrentCartTotal);

// POST /api/checkout/apply-coupon - Apply coupon to checkout
router.post('/checkout/apply-coupon', isAuthenticated, checkoutController.applyCoupon);

// POST /api/checkout/remove-coupon - Remove coupon from checkout
router.post('/checkout/remove-coupon', isAuthenticated, checkoutController.removeCoupon);

// POST /api/checkout/create-payment - Create Razorpay order
router.post('/checkout/create-payment', isAuthenticated, checkoutController.createRazorpayOrder);

// POST /api/checkout/verify-payment - Verify Razorpay payment
router.post('/checkout/verify-payment', isAuthenticated, checkoutController.verifyRazorpayPayment);

// POST /api/checkout/payment-failure - Handle payment failure
router.post('/checkout/payment-failure', isAuthenticated, checkoutController.handlePaymentFailure);

// Order API Routes
// POST /api/orders/:id/cancel - Cancel order
router.post('/orders/:id/cancel', isAuthenticated, orderController.cancelOrder);

// POST /api/orders/:id/return - Request order return
router.post('/orders/:id/return', isAuthenticated, orderController.returnOrder);

// POST /api/orders/:orderId/retry-payment - Retry payment for failed order
router.post('/orders/:orderId/retry-payment', isAuthenticated, checkoutController.retryPayment);

// POST /api/orders/verify-retry-payment - Verify retry payment
router.post('/orders/verify-retry-payment', isAuthenticated, checkoutController.verifyRetryPayment);

module.exports = router;
