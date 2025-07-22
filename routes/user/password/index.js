/**
 * Password Management Routes
 * Handles forgot password, reset password, and change password functionality
 * 
 * @description Routes for password-related operations
 * @routes /password/*
 */

const express = require('express');
const passwordRouter = express.Router();

// Import controllers with descriptive names
const forgotPasswordController = require('../../../controllers/userController/forgotPasswordController');
const changePasswordController = require('../../../controllers/userController/changePasswordController');

// Import middleware
const { isAuthenticated, isNotAuthenticated, preventBackButtonCache } = require('../../../middlewares/authMiddleware');

/**
 * @route GET /password/forgot
 * @description Display forgot password page
 * @access Public
 */
passwordRouter.get('/forgot', isNotAuthenticated, preventBackButtonCache, (request, response) => {
  response.render('user/forgotPassword', {
    title: 'Forgot Password - Phoenix Store',
    user: response.locals.user
  });
});

/**
 * @route POST /password/forgot
 * @description Process forgot password request
 * @access Public
 */
passwordRouter.post('/forgot',
  isNotAuthenticated,
  forgotPasswordController.postForgotPassword
);

/**
 * @route GET /password/reset
 * @description Display reset password page with token validation
 * @access Public
 */
passwordRouter.get('/reset',
  isNotAuthenticated,
  preventBackButtonCache,
  forgotPasswordController.getResetPassword
);

/**
 * @route POST /password/reset
 * @description Process password reset with new password
 * @access Public
 */
passwordRouter.post('/reset',
  isNotAuthenticated,
  forgotPasswordController.patchResetPassword
);

/**
 * @route GET /password/change
 * @description Display change password page for authenticated users
 * @access Private
 */
passwordRouter.get('/change', isAuthenticated, (request, response) => {
  response.render('user/changePassword', {
    title: 'Change Password - Phoenix Store',
    user: response.locals.user
  });
});

/**
 * @route POST /password/change
 * @description Process password change for authenticated users
 * @access Private
 */
passwordRouter.post('/change',
  isAuthenticated,
  changePasswordController.changePassword
);

module.exports = passwordRouter;
