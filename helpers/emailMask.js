/**
 * Creates a masked email and OTP message for different purposes
 * @param {string} email - The email address to mask
 * @param {string} purpose - The purpose of the OTP (forgot-password, resend, email-update, etc.)
 * @returns {object} - Object containing maskedEmail, message, and fullMessage
 */
const createOtpMessage = (email, purpose = 'forgot-password') => {
  const maskEmail = (email) => {
    if (!email || !email.includes('@')) {
      return 'your***@example.com';
    }
    
    const [username, domain] = email.split('@');
    const maskedUsername = username.length > 2
      ? username.substring(0, 2) + '*'.repeat(username.length - 2)
      : username;
    return `${maskedUsername}@${domain}`;
  };

  const maskedEmail = maskEmail(email);
  
  let message, fullMessage;
  
  switch (purpose) {
    case 'forgot-password':
      message = `We've sent a password reset code to ${maskedEmail}. Please check your email and enter the code below.`;
      fullMessage = `We've sent a 6-digit verification code to ${maskedEmail}. Please enter the code below to reset your password.`;
      break;
      
    case 'resend':
      message = `A new verification code has been sent to ${maskedEmail}. Please check your email.`;
      fullMessage = `We've sent a new 6-digit verification code to ${maskedEmail}. Please enter the code below.`;
      break;
      
    case 'email-update':
      message = `We've sent a verification code to ${maskedEmail} to confirm your email update.`;
      fullMessage = `We've sent a 6-digit verification code to ${maskedEmail}. Please enter the code below to update your email address.`;
      break;
      
    default:
      message = `We've sent a verification code to ${maskedEmail}. Please check your email.`;
      fullMessage = `We've sent a 6-digit verification code to ${maskedEmail}. Please enter the code below to continue.`;
  }
  
  return {
    maskedEmail,
    message,
    fullMessage
  };
};

module.exports = {
  createOtpMessage
};