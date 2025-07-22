const express = require('express');
const router = express.Router();
const passport = require('passport');

// Import controllers
const signupController = require('../../controllers/userController/signupController');
const loginController = require('../../controllers/userController/loginController');
const logoutController = require('../../controllers/userController/logoutController');
const googleController = require('../../controllers/userController/googleAuthController');

// Import validators
const { validateCompleteSignup } = require('../../validators/user/signupValidation');
const loginValidator = require('../../validators/user/loginValidator');

// Import middleware
const { isAuthenticated, isNotAuthenticated, preventBackButtonCache } = require('../../middlewares/authMiddleware');
const checkBlockedUser = require('../../middlewares/checkBlockedUser');

// Authentication Routes
// GET /auth/signup - Show signup form
router.get('/signup', isNotAuthenticated, preventBackButtonCache, signupController.getSignup);

// POST /auth/signup - Process signup
router.post('/signup', isNotAuthenticated, validateCompleteSignup, signupController.postSignup);

// GET /auth/verify-otp - Show OTP verification form
router.get('/verify-otp', isNotAuthenticated, preventBackButtonCache, signupController.getOtp);

// POST /auth/verify-otp - Process OTP verification
router.post('/verify-otp', isNotAuthenticated, signupController.verifyOtp);

// POST /auth/resend-otp - Resend signup OTP
router.post('/resend-otp', isNotAuthenticated, signupController.resendOtp);

// GET /auth/login - Show login form
router.get('/login', isNotAuthenticated, preventBackButtonCache, loginController.getLogin);

// POST /auth/login - Process login
router.post('/login', isNotAuthenticated, loginValidator.loginValidator, loginController.postLogin);

// GET /auth/logout - Process logout
router.get('/logout', isAuthenticated, logoutController.logout);

// Google OAuth Routes
// GET /auth/google - Initiate Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /auth/google/callback - Handle Google OAuth callback
router.get('/google/callback', googleController.googleController);

module.exports = router;
