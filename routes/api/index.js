const express = require('express');
const router = express.Router();

const cartController = require('../../controllers/userController/cartController');
const wishlistController = require('../../controllers/userController/wishlistController');
const checkoutController = require('../../controllers/userController/checkoutController');
const orderController = require('../../controllers/userController/orderController');
const productController = require('../../controllers/userController/productController');

const cartValidator = require('../../validators/user/cartValidator');
const wishlistValidator = require('../../validators/user/wishlistValidator');
const productValidator = require('../../validators/user/productValidator');

const { isAuthenticated } = require('../../middlewares/authMiddleware');

router.post('/cart/add',
  isAuthenticated,
  cartValidator.validateAddToCart,
  cartController.addToCart
);
router.put('/cart/update',
  isAuthenticated,
  cartValidator.validateUpdateCartQuantity,
  cartController.updateCartItem
);
router.delete('/cart/remove',
  isAuthenticated,
  cartValidator.validateRemoveFromCart,
  cartController.removeCartItem
);
router.post('/cart/clear',
  isAuthenticated,
  cartValidator.validateCartCheckout,
  cartController.clearCart
);

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

router.get('/checkout/current-total', isAuthenticated, checkoutController.getCurrentCartTotal);
router.post('/checkout/apply-coupon', isAuthenticated, checkoutController.applyCoupon);
router.post('/checkout/remove-coupon', isAuthenticated, checkoutController.removeCoupon);
router.post('/checkout/adjust-quantities', isAuthenticated, checkoutController.adjustCartQuantities);
router.post('/checkout/place-order', isAuthenticated, checkoutController.placeOrder);
router.post('/checkout/create-payment', isAuthenticated, checkoutController.createRazorpayOrder);
router.post('/checkout/verify-payment', isAuthenticated, checkoutController.verifyRazorpayPayment);
router.post('/checkout/payment-failure', isAuthenticated, checkoutController.handlePaymentFailure);

router.post('/orders/:id/cancel', isAuthenticated, orderController.cancelOrder);
router.post('/orders/:id/return', isAuthenticated, orderController.returnOrder);
router.post('/orders/:orderId/retry-payment', isAuthenticated, checkoutController.retryPayment);
router.post('/orders/verify-retry-payment', isAuthenticated, checkoutController.verifyRetryPayment);

router.post('/products/validate-quantity',
  productValidator.validateQuantityCheck,
  productController.validateQuantity
);

module.exports = router;
