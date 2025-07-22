/**
 * User Profile Management Routes
 * Handles user profile viewing, editing, and address management
 * 
 * @description Routes for user profile and address management
 * @routes /profile/*
 */

const express = require('express');
const profileRouter = express.Router();

// Import controllers with descriptive names
const profileController = require('../../../controllers/userController/profileController');
const addressController = require('../../../controllers/userController/addressController');
const referralController = require('../../../controllers/userController/referralController');
const walletController = require('../../../controllers/userController/walletController');

// Import middleware
const { isAuthenticated } = require('../../../middlewares/authMiddleware');
const checkBlockedUser = require('../../../middlewares/checkBlockedUser');

// Import validators
const addressValidator = require('../../../validators/user/addressValidator');

/**
 * @route GET /profile/view
 * @description Display user profile page
 * @access Private
 */
profileRouter.get('/view',
  isAuthenticated,
  checkBlockedUser,
  profileController.getProfile
);

/**
 * @route POST /profile/edit
 * @description Update user profile information
 * @access Private
 */
profileRouter.post('/edit',
  isAuthenticated,
  checkBlockedUser,
  profileController.updateProfile
);

/**
 * @route POST /profile/upload-avatar
 * @description Upload user profile picture
 * @access Private
 */
profileRouter.post('/upload-avatar',
  isAuthenticated,
  checkBlockedUser,
  profileController.uploadProfileImage
);

/**
 * @route GET /profile/addresses
 * @description Display user addresses page
 * @access Private
 */
profileRouter.get('/addresses',
  isAuthenticated,
  checkBlockedUser,
  addressController.getAddress
);

/**
 * @route GET /profile/addresses/add
 * @description Display add address form
 * @access Private
 */
profileRouter.get('/addresses/add',
  isAuthenticated,
  checkBlockedUser,
  (req, res) => {
    res.render('user/add-address', {
      title: 'Add Address - Phoenix Store',
      user: res.locals.user
    });
  }
);

/**
 * @route POST /profile/addresses/add
 * @description Add new user address
 * @access Private
 */
profileRouter.post('/addresses/add',
  isAuthenticated,
  checkBlockedUser,
  addressValidator.validateAddressData,
  addressController.addAddress
);

/**
 * @route POST /profile/addresses/edit
 * @description Update existing user address (alternative route)
 * @access Private
 */
profileRouter.post('/addresses/edit',
  isAuthenticated,
  checkBlockedUser,
  addressValidator.validateAddressData,
  addressController.updateAddress
);

/**
 * @route PUT /profile/addresses/:addressId
 * @description Update existing user address
 * @access Private
 */
profileRouter.put('/addresses/:addressId',
  isAuthenticated,
  checkBlockedUser,
  addressValidator.validateAddressData,
  addressController.updateAddress
);

/**
 * @route DELETE /profile/addresses/delete
 * @description Delete user address (alternative route)
 * @access Private
 */
profileRouter.delete('/addresses/delete',
  isAuthenticated,
  checkBlockedUser,
  addressController.deleteAddress
);

/**
 * @route DELETE /profile/addresses/:addressId
 * @description Delete user address
 * @access Private
 */
profileRouter.delete('/addresses/:addressId',
  isAuthenticated,
  checkBlockedUser,
  addressController.deleteAddress
);

/**
 * @route GET /profile/wallet
 * @description Display user wallet page
 * @access Private
 */
profileRouter.get('/wallet',
  isAuthenticated,
  checkBlockedUser,
  walletController.getWallet
);

/**
 * @route GET /profile/wallet/transactions
 * @description Display user wallet transactions
 * @access Private
 */
profileRouter.get('/wallet/transactions',
  isAuthenticated,
  checkBlockedUser,
  walletController.getWalletTransactions
);

/**
 * @route GET /profile/referrals
 * @description Display user referral program page
 * @access Private
 */
profileRouter.get('/referrals',
  isAuthenticated,
  checkBlockedUser,
  referralController.getReferrals
);

/**
 * @route POST /profile/referrals/generate
 * @description Generate new referral code for user
 * @access Private
 */
profileRouter.post('/referrals/generate',
  isAuthenticated,
  checkBlockedUser,
  referralController.generateReferralCode
);

module.exports = profileRouter;
