const express = require('express');
const router = express.Router();
const passport = require('passport');

const signupController = require('../../controllers/userController/signupController');
const loginController = require('../../controllers/userController/loginController');
const logoutController = require('../../controllers/userController/logoutController');
const googleController = require('../../controllers/userController/googleAuthController');

const { validateCompleteSignup } = require('../../validators/user/signupValidation');
const loginValidator = require('../../validators/user/loginValidator');

const { isAuthenticated, isNotAuthenticated, preventBackButtonCache } = require('../../middlewares/authMiddleware');

router.get('/signup', isNotAuthenticated, preventBackButtonCache, signupController.getSignup);
router.post('/signup', isNotAuthenticated, validateCompleteSignup, signupController.postSignup);
router.get('/verify-otp', isNotAuthenticated, preventBackButtonCache, signupController.getOtp);
router.post('/verify-otp', isNotAuthenticated, signupController.verifyOtp);
router.post('/resend-otp', isNotAuthenticated, signupController.resendOtp);
router.get('/login', isNotAuthenticated, preventBackButtonCache, loginController.getLogin);
router.post('/login', isNotAuthenticated, loginValidator.loginValidator, loginController.postLogin);
router.get('/logout', logoutController.logout);
router.post('/logout', logoutController.logout);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', googleController.googleController);

module.exports = router;
