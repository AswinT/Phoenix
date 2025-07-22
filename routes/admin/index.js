/**
 * Admin Routes Index
 * Main router that combines all admin-related route modules
 * 
 * @description Centralized admin routing with feature-based organization
 * @routes /admin/*
 */

const express = require('express');
const adminMainRouter = express.Router();

// Import feature-based route modules
const dashboardRoutes = require('./dashboard');
const usersRoutes = require('./users');
const productsRoutes = require('./products');
const ordersRoutes = require('./orders');
const reportsRoutes = require('./reports');

// Import middleware
const { isAdminAuthenticated, isAdminNotAuthenticated } = require('../../middlewares/adminMiddleware');

// Import admin login controller for direct routes
const adminLoginController = require('../../controllers/adminController/adminLoginController');

/**
 * Mount feature-based route modules
 */
adminMainRouter.use('/dashboard', dashboardRoutes);
adminMainRouter.use('/users', usersRoutes);
adminMainRouter.use('/products', productsRoutes);
adminMainRouter.use('/orders', ordersRoutes);
adminMainRouter.use('/reports', reportsRoutes);

/**
 * @route GET /admin
 * @description Redirect to admin dashboard
 * @access Private (Admin only)
 */
adminMainRouter.get('/', (request, response) => {
  response.redirect('/admin/dashboard');
});

/**
 * @route GET /admin/login
 * @description Redirect to admin login page
 * @access Public
 */
adminMainRouter.get('/login', (request, response) => {
  response.redirect('/admin/dashboard/login');
});

/**
 * @route POST /admin/adminLogin
 * @description Process admin login (direct route)
 * @access Public (Admin not authenticated)
 */
adminMainRouter.post('/adminLogin',
  isAdminNotAuthenticated,
  adminLoginController.postAdminLogin
);

/**
 * @route GET /admin/logout
 * @description Redirect to admin logout
 * @access Private (Admin only)
 */
adminMainRouter.get('/logout', (request, response) => {
  response.redirect('/admin/dashboard/logout');
});

module.exports = adminMainRouter;
