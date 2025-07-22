/**
 * Shopping Routes
 * Handles product browsing, cart, wishlist, and checkout functionality
 * 
 * @description Routes for shopping features including products, cart, wishlist, and checkout
 * @routes /shop/*
 */

const express = require('express');
const shopRouter = express.Router();

// Import controllers with descriptive names
const shopPageController = require('../../../controllers/userController/shopPageController');
const productDetailsController = require('../../../controllers/userController/productDetailsController');
const cartController = require('../../../controllers/userController/cartController');
const wishlistController = require('../../../controllers/userController/wishlistController');
const checkoutController = require('../../../controllers/userController/checkoutController');
const userCouponController = require('../../../controllers/userController/userCouponController');
const { searchProducts } = require('../../../controllers/userController/searchController');

// Import middleware
const { isAuthenticated } = require('../../../middlewares/authMiddleware');
const checkBlockedUser = require('../../../middlewares/checkBlockedUser');
const cartWishlistMiddleware = require('../../../middlewares/cartWishlistMiddleware');

// Import validators
const cartValidator = require('../../../validators/user/cartValidator');
const wishlistValidator = require('../../../validators/user/wishlistValidator');
const checkoutValidator = require('../../../validators/user/checkoutValidator');
const searchValidator = require('../../../validators/user/searchValidator');

/**
 * @route GET /shop/products
 * @description Display shop page with products
 * @access Public
 */
shopRouter.get('/products',
  cartWishlistMiddleware,
  shopPageController.shopPage
);

/**
 * @route GET /shop/product-details/
 * @description Handle empty product ID case
 * @access Public
 */
shopRouter.get('/product-details/',
  (req, res) => {
    res.status(404).render('user/page-404');
  }
);

/**
 * @route GET /shop/product-details/:productId
 * @description Display product details page (alternative route)
 * @access Public
 */
shopRouter.get('/product-details/:productId',
  cartWishlistMiddleware,
  productDetailsController.productDetails
);

/**
 * @route GET /shop/products/:productId
 * @description Display product details page
 * @access Public
 */
shopRouter.get('/products/:productId',
  cartWishlistMiddleware,
  productDetailsController.productDetails
);

/**
 * @route GET /shop/search
 * @description Search products
 * @access Public
 */
shopRouter.get('/search',
  cartWishlistMiddleware,
  searchValidator.validateSearchQuery,
  searchProducts
);

/**
 * @route GET /shop/cart
 * @description Display shopping cart
 * @access Private
 */
shopRouter.get('/cart',
  isAuthenticated,
  checkBlockedUser,
  cartWishlistMiddleware,
  cartController.getCart
);

/**
 * @route POST /shop/cart/add
 * @description Add product to cart
 * @access Private
 */
shopRouter.post('/cart/add',
  isAuthenticated,
  checkBlockedUser,
  cartValidator.validateAddToCart,
  cartController.addToCart
);

/**
 * @route POST /shop/cart/update-quantity
 * @description Update cart item quantity (alternative route)
 * @access Private
 */
shopRouter.post('/cart/update-quantity',
  isAuthenticated,
  checkBlockedUser,
  cartValidator.validateUpdateCartQuantity,
  cartController.updateCartItem
);

/**
 * @route PUT /shop/cart/update/:productId
 * @description Update cart item quantity
 * @access Private
 */
shopRouter.put('/cart/update/:productId',
  isAuthenticated,
  checkBlockedUser,
  cartValidator.validateUpdateCartQuantity,
  cartController.updateCartItem
);

/**
 * @route DELETE /shop/cart/remove/:productId
 * @description Remove product from cart
 * @access Private
 */
shopRouter.delete('/cart/remove/:productId',
  isAuthenticated,
  checkBlockedUser,
  cartController.removeCartItem
);

/**
 * @route POST /shop/cart/clear
 * @description Clear all items from cart
 * @access Private
 */
shopRouter.post('/cart/clear',
  isAuthenticated,
  checkBlockedUser,
  cartController.clearCart
);

/**
 * @route GET /shop/wishlist
 * @description Display user wishlist
 * @access Private
 */
shopRouter.get('/wishlist',
  isAuthenticated,
  checkBlockedUser,
  cartWishlistMiddleware,
  wishlistController.getWishlist
);

/**
 * @route POST /shop/wishlist/add
 * @description Add product to wishlist
 * @access Private
 */
shopRouter.post('/wishlist/add',
  isAuthenticated,
  checkBlockedUser,
  wishlistValidator.validateWishlistToggle,
  wishlistController.toggleWishlist
);

/**
 * @route DELETE /shop/wishlist/remove/:productId
 * @description Remove product from wishlist
 * @access Private
 */
shopRouter.delete('/wishlist/remove/:productId',
  isAuthenticated,
  checkBlockedUser,
  wishlistController.toggleWishlist
);

/**
 * @route POST /shop/wishlist/move-to-cart/:productId
 * @description Move product from wishlist to cart
 * @access Private
 */
shopRouter.post('/wishlist/move-to-cart/:productId',
  isAuthenticated,
  checkBlockedUser,
  wishlistController.addToCartFromWishlist
);

/**
 * @route GET /shop/checkout
 * @description Display checkout page
 * @access Private
 */
shopRouter.get('/checkout',
  isAuthenticated,
  checkBlockedUser,
  checkoutController.getCheckout
);

/**
 * @route POST /shop/checkout/process
 * @description Process checkout and create order
 * @access Private
 */
shopRouter.post('/checkout/process',
  isAuthenticated,
  checkBlockedUser,
  checkoutValidator.validateAddressForm,
  checkoutController.placeOrder
);

/**
 * @route POST /shop/checkout/place-order
 * @description Alternative route for placing order
 * @access Private
 */
shopRouter.post('/checkout/place-order',
  isAuthenticated,
  checkBlockedUser,
  checkoutValidator.validateAddressForm,
  checkoutController.placeOrder
);

/**
 * @route POST /shop/checkout/apply-coupon
 * @description Apply coupon to checkout
 * @access Private
 */
shopRouter.post('/checkout/apply-coupon',
  isAuthenticated,
  checkBlockedUser,
  checkoutController.applyCoupon
);

/**
 * @route POST /shop/checkout/remove-coupon
 * @description Remove applied coupon from checkout
 * @access Private
 */
shopRouter.post('/checkout/remove-coupon',
  isAuthenticated,
  checkBlockedUser,
  checkoutController.removeCoupon
);

/**
 * @route POST /shop/checkout/payment/verify
 * @description Verify payment after successful transaction
 * @access Private
 */
shopRouter.post('/checkout/payment/verify',
  isAuthenticated,
  checkBlockedUser,
  checkoutController.verifyRazorpayPayment
);

/**
 * @route POST /shop/checkout/payment/failed
 * @description Handle failed payment
 * @access Private
 */
shopRouter.post('/checkout/payment/failed',
  isAuthenticated,
  checkBlockedUser,
  checkoutController.handlePaymentFailure
);

/**
 * @route GET /shop/payment-success
 * @description Display payment success page
 * @access Private
 */
shopRouter.get('/payment-success',
  isAuthenticated,
  checkBlockedUser,
  (req, res) => {
    res.render('user/order-success', {
      title: 'Payment Successful - Phoenix Store',
      user: res.locals.user,
      message: 'Your payment was successful!'
    });
  }
);

/**
 * @route GET /shop/payment-failure
 * @description Display payment failure page
 * @access Private
 */
shopRouter.get('/payment-failure',
  isAuthenticated,
  checkBlockedUser,
  (req, res) => {
    res.render('user/payment-failure', {
      title: 'Payment Failed - Phoenix Store',
      user: res.locals.user,
      message: 'Your payment failed. Please try again.'
    });
  }
);

/**
 * @route GET /shop/coupons
 * @description Display available coupons for user
 * @access Private
 */
shopRouter.get('/coupons',
  isAuthenticated,
  checkBlockedUser,
  userCouponController.getUserCoupons
);

/**
 * @route POST /shop/coupons/validate
 * @description Validate coupon code
 * @access Private
 */
shopRouter.post('/coupons/validate',
  isAuthenticated,
  checkBlockedUser,
  userCouponController.validateCoupon
);

module.exports = shopRouter;
