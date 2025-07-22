/**
 * Admin Dashboard Routes
 * Handles admin dashboard and overview functionality
 * 
 * @description Routes for admin dashboard and system overview
 * @routes /admin/dashboard/*
 */

const express = require('express');
const dashboardRouter = express.Router();

// Import controllers with descriptive names
const dashboardController = require('../../../controllers/adminController/dashboardController');
const adminLoginController = require('../../../controllers/adminController/adminLoginController');

// Import middleware
const { isAdminAuthenticated, isAdminNotAuthenticated } = require('../../../middlewares/adminMiddleware');

/**
 * @route GET /admin/dashboard
 * @description Display admin dashboard with analytics and overview
 * @access Private (Admin only)
 */
dashboardRouter.get('/', 
  isAdminAuthenticated, 
  dashboardController.getDashboard
);

/**
 * @route GET /admin/dashboard/login
 * @description Display admin login page
 * @access Public (Admin not authenticated)
 */
dashboardRouter.get('/login', 
  isAdminNotAuthenticated, 
  (request, response) => {
    response.render('admin/adminLogin', {
      title: 'Admin Login - Phoenix Store',
      admin: response.locals.admin
    });
  }
);

/**
 * @route POST /admin/dashboard/login
 * @description Process admin login
 * @access Public (Admin not authenticated)
 */
dashboardRouter.post('/login',
  isAdminNotAuthenticated,
  adminLoginController.postAdminLogin
);

/**
 * @route GET /admin/dashboard/logout
 * @description Process admin logout
 * @access Private (Admin only)
 */
dashboardRouter.get('/logout',
  isAdminAuthenticated,
  adminLoginController.logoutAdminDashboard
);

module.exports = dashboardRouter;
