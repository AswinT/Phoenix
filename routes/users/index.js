const express = require('express');
const router = express.Router();

// Import controllers
const profileController = require('../../controllers/userController/profileController');
const addressController = require('../../controllers/userController/addressController');
const walletController = require('../../controllers/userController/walletController');
const userCouponController = require('../../controllers/userController/userCouponController');
const referralController = require('../../controllers/userController/referralController');

// Import middleware
const { isAuthenticated } = require('../../middlewares/authMiddleware');

// Import validators
const { profileUpdateValidator } = require('../../validators/user/profileValidator');

// User Profile Routes
router.get('/profile', isAuthenticated, profileController.getProfile);
router.patch('/profile', isAuthenticated, profileUpdateValidator, profileController.updateProfile);
router.post('/profile/image', isAuthenticated, profileController.uploadProfileImage);
router.post('/profile/email/request', isAuthenticated, profileController.requestEmailUpdate);
router.post('/profile/email/verify', isAuthenticated, profileController.verifyEmailOtp);
router.post('/profile/email/resend-otp', isAuthenticated, profileController.resendEmailOtp);

// Address Management Routes
router.get('/addresses', isAuthenticated, addressController.getAddress);
router.post('/addresses', isAuthenticated, addressController.addAddress);
router.get('/addresses/:id', isAuthenticated, addressController.getAddressById);
router.put('/addresses/:id', isAuthenticated, addressController.updateAddress);
router.delete('/addresses/:id', isAuthenticated, addressController.deleteAddress);
router.patch('/addresses/:id/default', isAuthenticated, addressController.setDefaultAddress);

// Wallet Routes
router.get('/wallet', isAuthenticated, walletController.getWallet);

// User Coupons Routes
router.get('/coupons', isAuthenticated, userCouponController.getUserCoupons);

// Referral Routes
router.get('/referrals', isAuthenticated, referralController.getReferrals);
router.post('/referrals/validate', referralController.validateReferral);

module.exports = router;
