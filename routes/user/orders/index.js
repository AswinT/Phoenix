/**
 * Order Management Routes
 * Handles order history, tracking, cancellation, and returns
 * 
 * @description Routes for order management operations
 * @routes /orders/*
 */

const express = require('express');
const ordersRouter = express.Router();

// Import controllers with descriptive names
const orderController = require('../../../controllers/userController/orderController');

// Import middleware
const { isAuthenticated } = require('../../../middlewares/authMiddleware');
const checkBlockedUser = require('../../../middlewares/checkBlockedUser');
const cartWishlistMiddleware = require('../../../middlewares/cartWishlistMiddleware');

// Import validators
const orderValidator = require('../../../validators/user/orderValidator');

/**
 * @route GET /orders/history
 * @description Display user order history
 * @access Private
 */
ordersRouter.get('/history',
  isAuthenticated,
  checkBlockedUser,
  cartWishlistMiddleware,
  orderController.getOrders
);

/**
 * @route GET /orders/details/:orderId
 * @description Display specific order details (alternative route)
 * @access Private
 */
ordersRouter.get('/details/:orderId',
  isAuthenticated,
  checkBlockedUser,
  cartWishlistMiddleware,
  orderController.getOrderDetails
);

/**
 * @route GET /orders/:orderId
 * @description Display specific order details
 * @access Private
 */
ordersRouter.get('/:orderId',
  isAuthenticated,
  checkBlockedUser,
  cartWishlistMiddleware,
  orderController.getOrderDetails
);

/**
 * @route GET /orders/:orderId/track
 * @description Display order tracking information
 * @access Private
 */
ordersRouter.get('/:orderId/track',
  isAuthenticated,
  checkBlockedUser,
  cartWishlistMiddleware,
  orderController.trackOrder
);

/**
 * @route POST /orders/cancel
 * @description Cancel an order (alternative route)
 * @access Private
 */
ordersRouter.post('/cancel',
  isAuthenticated,
  checkBlockedUser,
  orderValidator.validateCancelOrder,
  orderController.cancelOrder
);

/**
 * @route POST /orders/:orderId/cancel
 * @description Cancel an order
 * @access Private
 */
ordersRouter.post('/:orderId/cancel',
  isAuthenticated,
  checkBlockedUser,
  orderValidator.validateCancelOrder,
  orderController.cancelOrder
);

/**
 * @route POST /orders/:orderId/items/:itemId/cancel
 * @description Cancel specific item from an order
 * @access Private
 */
ordersRouter.post('/:orderId/items/:itemId/cancel',
  isAuthenticated,
  checkBlockedUser,
  orderValidator.validateCancelOrder,
  orderController.cancelOrderItem
);

/**
 * @route POST /orders/return
 * @description Request return for an order (alternative route)
 * @access Private
 */
ordersRouter.post('/return',
  isAuthenticated,
  checkBlockedUser,
  orderValidator.validateReturnOrder,
  orderController.returnOrder
);

/**
 * @route POST /orders/:orderId/return
 * @description Request return for an order
 * @access Private
 */
ordersRouter.post('/:orderId/return',
  isAuthenticated,
  checkBlockedUser,
  orderValidator.validateReturnOrder,
  orderController.returnOrder
);

/**
 * @route POST /orders/:orderId/items/:itemId/return
 * @description Request return for specific item from an order
 * @access Private
 */
ordersRouter.post('/:orderId/items/:itemId/return',
  isAuthenticated,
  checkBlockedUser,
  orderValidator.validateReturnOrder,
  orderController.returnOrderItem
);

/**
 * @route GET /orders/invoice/:orderId
 * @description Download order invoice (alternative route)
 * @access Private
 */
ordersRouter.get('/invoice/:orderId',
  isAuthenticated,
  checkBlockedUser,
  orderController.downloadInvoice
);

/**
 * @route GET /orders/:orderId/invoice
 * @description Download order invoice
 * @access Private
 */
ordersRouter.get('/:orderId/invoice',
  isAuthenticated,
  checkBlockedUser,
  orderController.downloadInvoice
);

/**
 * @route POST /orders/:orderId/review
 * @description Submit review for ordered products
 * @access Private
 * Note: This method doesn't exist in orderController, commenting out for now
 */
// ordersRouter.post('/:orderId/review',
//   isAuthenticated,
//   checkBlockedUser,
//   orderController.submitProductReview
// );

module.exports = ordersRouter;
