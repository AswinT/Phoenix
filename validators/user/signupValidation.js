const { createValidationMiddleware } = require('../../helpers/validation-helper');
const validateFullName = (value) => {
  if (!value || value.trim().length < 3) {
    return { isValid: false, message: "Full name must be at least 3 characters" };
  }
  const trimmedName = value.trim();
  const nameWords = trimmedName.split(' ').filter(word => word.length > 0);
  if (nameWords.length < 2) {
    return { isValid: false, message: "Please provide both first and last name" };
  }
  if (!/^[A-Za-z\s'-]+$/.test(trimmedName)) {
    return { isValid: false, message: "Name contains invalid characters" };
  }
  return { isValid: true, sanitized: trimmedName };
};
const validateEmailWithDisposableCheck = (value) => {
  if (!value) {
    return { isValid: false, message: "Email is required" };
  }
  const email = value.toLowerCase().trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: "Enter a valid email address" };
  }
  const disposableDomains = ['mailinator.com', 'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'yopmail.com', 'sharklasers.com'];
  const domain = email.split('@')[1];
  if (disposableDomains.includes(domain)) {
    return { isValid: false, message: "Please use a non-disposable email address" };
  }
  return { isValid: true, sanitized: email };
};
const validatePhoneNumberEnhanced = (value) => {
  if (!value) {
    return { isValid: false, message: "Phone number is required" };
  }
  const cleanPhone = value.replace(/\D/g, '');
  if (cleanPhone.length !== 10 && (cleanPhone.length < 11 || cleanPhone.length > 15)) {
    return { isValid: false, message: "Phone number must be 10 digits or include a valid country code" };
  }
  if (!/^\d+$/.test(cleanPhone)) {
    return { isValid: false, message: "Phone number must contain only digits" };
  }
  if (/^(.)\1+$/.test(cleanPhone) || /^0{10}$/.test(cleanPhone) || /^1{10}$/.test(cleanPhone)) {
    return { isValid: false, message: "Please enter a valid phone number" };
  }
  return { isValid: true, sanitized: cleanPhone };
};
const validatePasswordEnhanced = (value) => {
  if (!value) {
    return { isValid: false, message: "Password is required" };
  }
  const minLength = value.length >= 8;
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[@$!%*?&_\-#]/.test(value);
  if (!minLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    let errorMsg = "Password must include: ";
    const missing = [];
    if (!minLength) missing.push("at least 8 characters");
    if (!hasUppercase) missing.push("uppercase letter");
    if (!hasLowercase) missing.push("lowercase letter");
    if (!hasNumber) missing.push("number");
    if (!hasSpecial) missing.push("special character (@$!%*?&_-#)");
    return { isValid: false, message: errorMsg + missing.join(", ") };
  }
  if (/123456|password|qwerty/i.test(value)) {
    return { isValid: false, message: "Password contains a common pattern and is not secure" };
  }
  return { isValid: true, sanitized: value };
};
const validatePasswordConfirmation = (req, res, next) => {
  const { password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Passwords do not match']
    });
  }
  next();
};
const signupValidator = createValidationMiddleware({
  fullName: {
    type: 'text',
    fieldName: 'Full Name',
    customValidator: validateFullName,
    required: true
  },
  email: {
    type: 'text',
    fieldName: 'Email',
    customValidator: validateEmailWithDisposableCheck,
    required: true
  },
  phoneNumber: {
    type: 'text',
    fieldName: 'Phone Number',
    customValidator: validatePhoneNumberEnhanced,
    required: true
  },
  password: {
    type: 'text',
    fieldName: 'Password',
    customValidator: validatePasswordEnhanced,
    required: true
  }
});
const validateCompleteSignup = [
  signupValidator,
  validatePasswordConfirmation
];
module.exports = {
  signupValidator,
  validatePasswordConfirmation,
  validateCompleteSignup,
  validateFullName,
  validateEmailWithDisposableCheck,
  validatePhoneNumberEnhanced,
  validatePasswordEnhanced
};