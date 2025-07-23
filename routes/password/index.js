const express = require('express');
const router = express.Router();

// Import controllers
const passwordController = require('../../controllers/userController/forgotPasswordController');
const changePasswordController = require('../../controllers/userController/changePasswordController');

// Import middleware
const { isAuthenticated, isNotAuthenticated, preventBackButtonCache } = require('../../middlewares/authMiddleware');

// Password Management Routes
router.get('/forgot', isNotAuthenticated, preventBackButtonCache, passwordController.getForgotPassword);
router.post('/forgot', isNotAuthenticated, passwordController.postForgotPassword);
router.get('/verify-otp', isNotAuthenticated, preventBackButtonCache, passwordController.getOtpForgotPassword);
router.post('/verify-otp', isNotAuthenticated, passwordController.verifyOtp);
router.post('/resend-otp', isNotAuthenticated, passwordController.resendOtp);
router.get('/reset', isNotAuthenticated, preventBackButtonCache, passwordController.getResetPassword);
router.patch('/reset', isNotAuthenticated, passwordController.patchResetPassword);

// Change password for authenticated users
router.post('/change', isAuthenticated, changePasswordController.changePassword);

module.exports = router;
