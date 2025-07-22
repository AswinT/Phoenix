/**
 * Admin Order Management Routes
 * Handles order processing, status updates, and returns management
 * 
 * @description Routes for managing orders, returns, and order analytics
 * @routes /admin/orders/*
 */

const express = require('express');
const ordersRouter = express.Router();

// Import controllers with descriptive names
const manageOrderController = require('../../../controllers/adminController/manageOrders');
const returnManagementController = require('../../../controllers/adminController/returnManagement');

// Import middleware
const { isAdminAuthenticated } = require('../../../middlewares/adminMiddleware');

/**
 * @route GET /admin/orders
 * @description Display orders management page with order list
 * @access Private (Admin only)
 */
ordersRouter.get('/',
  isAdminAuthenticated,
  manageOrderController.getManageOrders
);

/**
 * @route GET /admin/orders/:orderId
 * @description Display specific order details
 * @access Private (Admin only)
 */
ordersRouter.get('/:orderId', 
  isAdminAuthenticated, 
  manageOrderController.getOrderDetails
);

/**
 * @route PUT /admin/orders/:orderId/status
 * @description Update order status
 * @access Private (Admin only)
 */
ordersRouter.put('/:orderId/status', 
  isAdminAuthenticated, 
  manageOrderController.updateOrderStatus
);

/**
 * @route POST /admin/orders/:orderId/cancel
 * @description Cancel an order from admin side
 * @access Private (Admin only)
 */
ordersRouter.post('/:orderId/cancel',
  isAdminAuthenticated,
  manageOrderController.cancelOrderByAdmin
);

/**
 * @route GET /admin/orders/search
 * @description Search orders by various criteria
 * @access Private (Admin only)
 */
ordersRouter.get('/search',
  isAdminAuthenticated,
  manageOrderController.searchOrders
);

/**
 * @route GET /admin/orders/filter
 * @description Filter orders by status, date range, etc.
 * @access Private (Admin only)
 */
ordersRouter.get('/filter',
  isAdminAuthenticated,
  manageOrderController.filterOrders
);

/**
 * @route GET /admin/orders/returns
 * @description Display returns management page
 * @access Private (Admin only)
 */
ordersRouter.get('/returns',
  isAdminAuthenticated,
  returnManagementController.getReturnRequests
);

/**
 * @route GET /admin/orders/returns/:returnId
 * @description Display specific return request details
 * @access Private (Admin only)
 */
ordersRouter.get('/returns/:returnId', 
  isAdminAuthenticated, 
  returnManagementController.getReturnRequestDetails
);

/**
 * @route POST /admin/orders/returns/:returnId/approve
 * @description Approve return request
 * @access Private (Admin only)
 */
// ordersRouter.post('/returns/:returnId/approve',
//   isAdminAuthenticated,
//   returnManagementController.approveReturnRequest // TODO: This method doesn't exist
// );

/**
 * @route POST /admin/orders/returns/:returnId/reject
 * @description Reject return request
 * @access Private (Admin only)
 * Note: This method doesn't exist in returnManagementController, commenting out for now
 */
// ordersRouter.post('/returns/:returnId/reject',
//   isAdminAuthenticated,
//   returnManagementController.rejectReturnRequest
// );

/**
 * @route POST /admin/orders/returns/:returnId/process-refund
 * @description Process refund for approved return
 * @access Private (Admin only)
 */
ordersRouter.post('/returns/:returnId/process-refund',
  isAdminAuthenticated,
  returnManagementController.processReturnRefundRequest
);

/**
 * @route GET /admin/orders/analytics/overview
 * @description Display order analytics and statistics
 * @access Private (Admin only)
 */
ordersRouter.get('/analytics/overview',
  isAdminAuthenticated,
  manageOrderController.getOrderAnalytics
);

module.exports = ordersRouter;
