const { HttpStatus } = require('../../helpers/statusCode');
const User = require('../../models/userSchema');
const Referral = require('../../models/referralSchema');
const getReferrals = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect('/login');
    }
    const referralStats = await Referral.find({ referrer: userId }).populate('referred', 'fullName email createdAt');
    res.render('referrals', {
      user,
      referralCode: user.referralCode,
      referrals: referralStats
    });
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('error', {
      message: 'Internal server error'
    });
  }
};
const validateReferral = async (req, res) => {
  try {
    const { referralCode } = req.body;
    if (!referralCode) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Referral code is required'
      });
    }
    const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
    if (!referrer) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Invalid referral code'
      });
    }
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Valid referral code',
      referrerName: referrer.fullName
    });
  } catch (error) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Server error while validating referral code'
    });
  }
};

/**
 * Generate new referral code for user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateReferralCode = async (req, res) => {
  try {
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate a new unique referral code
    let newReferralCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Generate 8-character alphanumeric code
      newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Check if code already exists
      const existingUser = await User.findOne({ referralCode: newReferralCode });
      if (!existingUser) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Unable to generate unique referral code. Please try again.'
      });
    }

    // Update user with new referral code
    user.referralCode = newReferralCode;
    await user.save();

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'New referral code generated successfully',
      referralCode: newReferralCode
    });

  } catch (error) {
    console.error('Error generating referral code:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Server error while generating referral code'
    });
  }
};

module.exports = {
  getReferrals,
  validateReferral,
  generateReferralCode
};
