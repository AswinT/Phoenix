const express = require('express');
const router = express.Router();

// Import controllers
const passwordController = require('../../controllers/userController/forgotPasswordController');
const changePasswordController = require('../../controllers/userController/changePasswordController');

// Import middleware
const { isAuthenticated, isNotAuthenticated, preventBackButtonCache } = require('../../middlewares/authMiddleware');

// Password Management Routes

// GET /password/forgot - Show forgot password form
router.get('/forgot', isNotAuthenticated, preventBackButtonCache, passwordController.getForgotPassword);

// POST /password/forgot - Process forgot password request
router.post('/forgot', isNotAuthenticated, passwordController.postForgotPassword);

// GET /password/verify-otp - Show OTP verification form for password reset
router.get('/verify-otp', isNotAuthenticated, preventBackButtonCache, passwordController.getOtpForgotPassword);

// POST /password/verify-otp - Process OTP verification for password reset
router.post('/verify-otp', isNotAuthenticated, passwordController.verifyOtp);

// POST /password/resend-otp - Resend password reset OTP
router.post('/resend-otp', isNotAuthenticated, passwordController.resendOtp);

// GET /password/reset - Show password reset form
router.get('/reset', isNotAuthenticated, preventBackButtonCache, passwordController.getResetPassword);

// PATCH /password/reset - Process password reset
router.patch('/reset', isNotAuthenticated, passwordController.patchResetPassword);

// POST /password/change - Process password change (for authenticated users)
// Note: Change password is handled via AJAX/API calls, no GET route needed
router.post('/change', isAuthenticated, changePasswordController.changePassword);

module.exports = router;
