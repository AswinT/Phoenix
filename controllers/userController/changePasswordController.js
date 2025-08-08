const User = require('../../models/userSchema');
const bcrypt = require('bcrypt');
const { hashPassword } = require('../../helpers/hash');
const {HttpStatus} = require('../../helpers/statusCode');

// Enhanced password validation function
const validatePasswordStrength = (password) => {
  const requirements = {
    minLength: { met: false, description: 'At least 8 characters long' },
    hasLowercase: { met: false, description: 'Contains lowercase letter (a-z)' },
    hasUppercase: { met: false, description: 'Contains uppercase letter (A-Z)' },
    hasNumber: { met: false, description: 'Contains at least one number (0-9)' },
    hasSpecialChar: { met: false, description: 'Contains special character (!@#$%^&*(),.?":{}|<>)' },
    noCommonPatterns: { met: true, description: 'Does not contain common patterns' }
  };

  // Check minimum length
  requirements.minLength.met = password.length >= 8;

  // Check for lowercase
  requirements.hasLowercase.met = /[a-z]/.test(password);

  // Check for uppercase
  requirements.hasUppercase.met = /[A-Z]/.test(password);

  // Check for numbers
  requirements.hasNumber.met = /[0-9]/.test(password);

  // Check for special characters
  requirements.hasSpecialChar.met = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Check for common patterns
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /(.)\1{2,}/, // Three or more consecutive identical characters
    /012345/,
    /abcdef/i
  ];

  requirements.noCommonPatterns.met = !commonPatterns.some(pattern => pattern.test(password));

  const allRequirementsMet = Object.values(requirements).every(req => req.met);

  if (!allRequirementsMet) {
    const unmetRequirements = Object.entries(requirements)
      .filter(([key, req]) => !req.met)
      .map(([key, req]) => req.description);

    return {
      isValid: false,
      message: `Password does not meet requirements: ${unmetRequirements.join(', ')}`,
      requirements: requirements
    };
  }

  return {
    isValid: true,
    message: 'Password meets all requirements',
    requirements: requirements
  };
};
const changePassword = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Please login to change password',
      });
    }
    const { currentPassword, newPassword, confirmPassword } = req.body;
    // Enhanced field validation with specific error messages
    if (!currentPassword || !currentPassword.trim()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Current password is required',
        field: 'currentPassword',
        errorType: 'REQUIRED_FIELD'
      });
    }

    if (!newPassword || !newPassword.trim()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'New password is required',
        field: 'newPassword',
        errorType: 'REQUIRED_FIELD'
      });
    }

    if (!confirmPassword || !confirmPassword.trim()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Password confirmation is required',
        field: 'confirmPassword',
        errorType: 'REQUIRED_FIELD'
      });
    }

    // Enhanced password validation with detailed requirements
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: passwordValidation.message,
        field: 'newPassword',
        errorType: 'VALIDATION_ERROR',
        requirements: passwordValidation.requirements
      });
    }

    // Password confirmation matching
    if (newPassword !== confirmPassword) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'New password and confirmation password do not match',
        field: 'confirmPassword',
        errorType: 'MISMATCH_ERROR'
      });
    }
    const user = await User.findById(req.session.user_id);
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }
    // Check if user has a password (not Google OAuth user)
    if (!user.password) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Password cannot be changed for accounts created via Google. Please use Google account settings to manage your password.',
        field: 'currentPassword',
        errorType: 'OAUTH_ACCOUNT'
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'The current password you entered is incorrect. Please try again.',
        field: 'currentPassword',
        errorType: 'INCORRECT_PASSWORD'
      });
    }

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Your new password must be different from your current password. Please choose a different password.',
        field: 'newPassword',
        errorType: 'SAME_PASSWORD'
      });
    }
    const hashedNewPassword = await hashPassword(newPassword);
    user.password = hashedNewPassword;
    await user.save();
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to change password. Please try again.',
    });
  }
};
module.exports = { changePassword };