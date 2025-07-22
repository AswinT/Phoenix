const createOtpMessage = (email, purpose = 'signup') => {
  if (!email) {
    return {
      maskedEmail: '',
      fullMessage: 'Please provide a valid email address.'
    };
  }

  const maskEmail = (email) => {
    const [username, domain] = email.split('@');
    if (!username || !domain) {
      return email; // Return original if invalid format
    }

    const maskedUsername = username.length > 2
      ? username.substring(0, 2) + '*'.repeat(Math.max(username.length - 2, 1))
      : username;
    return `${maskedUsername}@${domain}`;
  };

  const maskedEmail = maskEmail(email);

  const messages = {
    'signup': `We've sent a verification code to ${maskedEmail}. Please enter the code to complete your registration.`,
    'password-reset': `We've sent a password reset code to ${maskedEmail}. Please enter the code to reset your password.`,
    'email-update': `We've sent a verification code to ${maskedEmail}. Please enter the code to update your email address.`
  };

  return {
    maskedEmail,
    fullMessage: messages[purpose] || messages['signup']
  };
};

module.exports = {
  createOtpMessage
};
