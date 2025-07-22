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

// User Profile Routes
// GET /users/profile - Get user profile
router.get('/profile', isAuthenticated, profileController.getProfile);

// PATCH /users/profile - Update user profile
router.patch('/profile', isAuthenticated, profileController.updateProfile);

// POST /users/profile/image - Upload profile image
router.post('/profile/image', isAuthenticated, profileController.uploadProfileImage);

// POST /users/profile/email/request - Request email update
router.post('/profile/email/request', isAuthenticated, profileController.requestEmailUpdate);

// POST /users/profile/email/verify - Verify email update OTP
router.post('/profile/email/verify', isAuthenticated, profileController.verifyEmailOtp);

// POST /users/profile/email/resend-otp - Resend email verification OTP
router.post('/profile/email/resend-otp', isAuthenticated, profileController.resendEmailOtp);

// Address Management Routes
// GET /users/addresses - Get user addresses
router.get('/addresses', isAuthenticated, addressController.getAddress);

// POST /users/addresses - Add new address
router.post('/addresses', isAuthenticated, addressController.addAddress);

// GET /users/addresses/:id - Get specific address
router.get('/addresses/:id', isAuthenticated, addressController.getAddressById);

// PUT /users/addresses/:id - Update address
router.put('/addresses/:id', isAuthenticated, addressController.updateAddress);

// DELETE /users/addresses/:id - Delete address
router.delete('/addresses/:id', isAuthenticated, addressController.deleteAddress);

// PATCH /users/addresses/:id/default - Set default address
router.patch('/addresses/:id/default', isAuthenticated, addressController.setDefaultAddress);

// Wallet Routes
// GET /users/wallet - Get wallet details (includes transactions with pagination)
router.get('/wallet', isAuthenticated, walletController.getWallet);

// User Coupons Routes
// GET /users/coupons - Get available coupons for user
router.get('/coupons', isAuthenticated, userCouponController.getUserCoupons);

// Referral Routes
// GET /users/referrals - Get user referral information
router.get('/referrals', isAuthenticated, referralController.getReferrals);

// POST /users/referrals/validate - Validate referral code
router.post('/referrals/validate', referralController.validateReferral);

module.exports = router;
