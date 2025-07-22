/**
 * User Authentication Routes
 * Handles login, logout, signup, and Google authentication
 * 
 * @description Authentication routes for user login, registration, and social auth
 * @routes /auth/*
 */

const express = require('express');
const passport = require('passport');
const authRouter = express.Router();

// Import controllers with descriptive names
const loginController = require('../../../controllers/userController/loginController');
const logoutController = require('../../../controllers/userController/logoutController');
const signupController = require('../../../controllers/userController/signupController');
const googleAuthController = require('../../../controllers/userController/googleAuthController');

// Import middleware
const { isAuthenticated, isNotAuthenticated, preventBackButtonCache } = require('../../../middlewares/authMiddleware');
const checkBlockedUser = require('../../../middlewares/checkBlockedUser');

// Import validators
const { loginValidator } = require('../../../validators/user/loginValidator');
const { signupValidator } = require('../../../validators/user/signupValidation');
const { validateBasicOtp, validateOtpSession } = require('../../../validators/user/basicOtpValidator');

/**
 * @route GET /auth/login
 * @description Display login page
 * @access Public
 * @param {Object} request - Express request object
 * @param {Object} response - Express response object
 */
authRouter.get('/login', isNotAuthenticated, preventBackButtonCache, (request, response) => {
  response.render('user/login', {
    title: 'Login - Phoenix Store',
    user: response.locals.user
  });
});

/**
 * @route POST /auth/login
 * @description Process user login
 * @access Public
 */
authRouter.post('/login',
  isNotAuthenticated,
  loginValidator,
  checkBlockedUser,
  loginController.postLogin
);

/**
 * @route GET /auth/logout
 * @description Process user logout
 * @access Private
 */
authRouter.get('/logout', isAuthenticated, logoutController.logout);

/**
 * @route GET /auth/signup
 * @description Display signup page
 * @access Public
 * @param {Object} request - Express request object
 * @param {Object} response - Express response object
 */
authRouter.get('/signup', isNotAuthenticated, preventBackButtonCache, (request, response) => {
  response.render('user/signup', {
    title: 'Sign Up - Phoenix Store',
    user: response.locals.user
  });
});

/**
 * @route POST /auth/signup
 * @description Process user registration
 * @access Public
 */
authRouter.post('/signup',
  isNotAuthenticated,
  signupValidator,
  signupController.postSignup
);

/**
 * @route POST /auth/verify-otp
 * @description Verify OTP during signup
 * @access Public
 */
authRouter.post('/verify-otp',
  isNotAuthenticated,
  validateBasicOtp,
  validateOtpSession,
  signupController.verifyOtp
);

/**
 * @route POST /auth/resend-otp
 * @description Resend OTP during signup
 * @access Public
 */
authRouter.post('/resend-otp',
  isNotAuthenticated,
  validateOtpSession,
  signupController.resendOtp
);

/**
 * @route GET /auth/google
 * @description Initiate Google OAuth authentication
 * @access Public
 */
authRouter.get('/google', 
  isNotAuthenticated,
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * @route GET /auth/google/callback
 * @description Handle Google OAuth callback
 * @access Public
 */
authRouter.get('/google/callback',
  isNotAuthenticated,
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  googleAuthController.googleController
);

module.exports = authRouter;
