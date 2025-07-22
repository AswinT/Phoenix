/**
 * Admin User Management Routes
 * Handles user management operations for administrators
 * 
 * @description Routes for managing users, blocking/unblocking, and user analytics
 * @routes /admin/users/*
 */

const express = require('express');
const usersRouter = express.Router();

// Import controllers with descriptive names
const getUserController = require('../../../controllers/adminController/getUserController');

// Import middleware
const { isAdminAuthenticated } = require('../../../middlewares/adminMiddleware');

/**
 * @route GET /admin/users
 * @description Display users management page with user list
 * @access Private (Admin only)
 */
usersRouter.get('/',
  isAdminAuthenticated,
  getUserController.getUsers
);

/**
 * @route GET /admin/users/:userId
 * @description Display specific user details
 * @access Private (Admin only)
 */
usersRouter.get('/:userId',
  isAdminAuthenticated,
  getUserController.getUserDetails
);

/**
 * @route POST /admin/users/:userId/block
 * @description Block a specific user
 * @access Private (Admin only)
 */
usersRouter.post('/:userId/block',
  isAdminAuthenticated,
  getUserController.blockUser
);

/**
 * @route POST /admin/users/:userId/unblock
 * @description Unblock a specific user
 * @access Private (Admin only)
 */
usersRouter.post('/:userId/unblock',
  isAdminAuthenticated,
  getUserController.unblockUser
);

/**
 * @route GET /admin/users/analytics/overview
 * @description Display user analytics and statistics
 * @access Private (Admin only)
 */
usersRouter.get('/analytics/overview',
  isAdminAuthenticated,
  getUserController.getUserAnalytics
);

/**
 * @route GET /admin/users/search
 * @description Search users by various criteria
 * @access Private (Admin only)
 */
usersRouter.get('/search',
  isAdminAuthenticated,
  getUserController.searchUsers
);

module.exports = usersRouter;
