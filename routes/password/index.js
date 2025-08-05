const express = require('express');
const router = express.Router();

const passwordController = require('../../controllers/userController/forgotPasswordController');
const changePasswordController = require('../../controllers/userController/changePasswordController');

const { isAuthenticated, isNotAuthenticated, preventBackButtonCache } = require('../../middlewares/authMiddleware');

router.get('/forgot', isNotAuthenticated, preventBackButtonCache, passwordController.getForgotPassword);
router.post('/forgot', isNotAuthenticated, passwordController.postForgotPassword);
router.get('/verify-otp', isNotAuthenticated, preventBackButtonCache, passwordController.getOtpForgotPassword);
router.post('/verify-otp', isNotAuthenticated, passwordController.verifyOtp);
router.post('/resend-otp', isNotAuthenticated, passwordController.resendOtp);
router.get('/reset', isNotAuthenticated, preventBackButtonCache, passwordController.getResetPassword);
router.patch('/reset', isNotAuthenticated, passwordController.patchResetPassword);

router.post('/change', isAuthenticated, changePasswordController.changePassword);

module.exports = router;
