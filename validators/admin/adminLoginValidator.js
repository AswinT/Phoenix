const { createValidationMiddleware } = require('../../helpers/validationHelper');

// Enhanced email validation for admin
const validateAdminEmail = (value) => {
  if (!value || typeof value !== 'string') {
    return { isValid: false, message: "Email is required" };
  }
  
  const trimmedEmail = value.trim().toLowerCase();
  
  if (!trimmedEmail) {
    return { isValid: false, message: "Email is required" };
  }
  
  // Enhanced email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, message: "Please enter a valid email address" };
  }
  
  // Check for common admin email patterns (optional security check)
  if (trimmedEmail.length > 100) {
    return { isValid: false, message: "Email address is too long" };
  }
  
  return { isValid: true, sanitized: trimmedEmail };
};

// Enhanced password validation for admin
const validateAdminPassword = (value) => {
  if (!value || typeof value !== 'string') {
    return { isValid: false, message: "Password is required" };
  }
  
  if (value.length < 6) {
    return { isValid: false, message: "Password must be at least 6 characters long" };
  }
  
  if (value.length > 128) {
    return { isValid: false, message: "Password is too long" };
  }
  
  // Check for common weak passwords
  const weakPasswords = ['password', '123456', 'admin', 'qwerty'];
  if (weakPasswords.includes(value.toLowerCase())) {
    return { isValid: false, message: "Please use a stronger password" };
  }
  
  return { isValid: true, sanitized: value };
};

// Create admin login validator
const adminLoginValidator = createValidationMiddleware({
  email: {
    type: 'text',
    fieldName: 'Email',
    customValidator: validateAdminEmail,
    required: true
  },
  password: {
    type: 'text',
    fieldName: 'Password',
    customValidator: validateAdminPassword,
    required: true
  }
});

module.exports = {
  adminLoginValidator,
  validateAdminEmail,
  validateAdminPassword
};
