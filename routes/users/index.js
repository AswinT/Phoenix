const express = require('express');
const router = express.Router();

const profileController = require('../../controllers/userController/profileController');
const addressController = require('../../controllers/userController/addressController');
const walletController = require('../../controllers/userController/walletController');
const userCouponController = require('../../controllers/userController/userCouponController');
const referralController = require('../../controllers/userController/referralController');

const { isAuthenticated } = require('../../middlewares/authMiddleware');

const { profileUpdateValidator } = require('../../validators/user/profileValidator');

router.get('/profile', isAuthenticated, profileController.getProfile);
router.patch('/profile', isAuthenticated, profileUpdateValidator, profileController.updateProfile);
router.post('/profile/image', isAuthenticated, profileController.uploadProfileImage);
router.delete('/profile/image', isAuthenticated, profileController.removeProfileImage);
router.post('/profile/email/request', isAuthenticated, profileController.requestEmailUpdate);
router.post('/profile/email/verify', isAuthenticated, profileController.verifyEmailOtp);
router.post('/profile/email/resend-otp', isAuthenticated, profileController.resendEmailOtp);
router.post('/profile/send-email-otp', isAuthenticated, profileController.sendEmailOtp);
router.post('/profile/verify-email-otp', isAuthenticated, profileController.verifyEmailOtpNew);
router.post('/profile/send-current-email-otp', isAuthenticated, profileController.sendCurrentEmailOtp);
router.post('/profile/verify-current-email-otp', isAuthenticated, profileController.verifyCurrentEmailOtp);
router.post('/profile/send-new-email-otp', isAuthenticated, profileController.sendNewEmailOtp);
router.post('/profile/verify-new-email-otp', isAuthenticated, profileController.verifyNewEmailOtp);

router.get('/addresses', isAuthenticated, addressController.getAddress);
router.post('/addresses', isAuthenticated, addressController.addAddress);
router.get('/addresses/:id', isAuthenticated, addressController.getAddressById);
router.put('/addresses/:id', isAuthenticated, addressController.updateAddress);
router.delete('/addresses/:id', isAuthenticated, addressController.deleteAddress);
router.patch('/addresses/:id/default', isAuthenticated, addressController.setDefaultAddress);

router.get('/wallet', isAuthenticated, walletController.getWallet);

router.get('/coupons', isAuthenticated, userCouponController.getUserCoupons);

router.get('/referrals', isAuthenticated, referralController.getReferrals);
router.post('/referrals/validate', referralController.validateReferral);

module.exports = router;
