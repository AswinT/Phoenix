const { createValidationMiddleware } = require('../../helpers/validationHelper');

// Enhanced full name validation for profile
const validateProfileFullName = (value) => {
  if (!value || typeof value !== 'string') {
    return { isValid: false, message: "Full name is required" };
  }
  
  const trimmedName = value.trim();
  
  if (trimmedName.length < 2) {
    return { isValid: false, message: "Full name must be at least 2 characters" };
  }
  
  if (trimmedName.length > 50) {
    return { isValid: false, message: "Full name cannot exceed 50 characters" };
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[A-Za-z\s'-]+$/.test(trimmedName)) {
    return { isValid: false, message: "Name can only contain letters, spaces, hyphens, and apostrophes" };
  }
  
  // Check for at least two words
  const nameWords = trimmedName.split(/\s+/).filter(word => word.length > 0);
  if (nameWords.length < 2) {
    return { isValid: false, message: "Please provide both first and last name" };
  }
  
  // Check for reasonable word lengths
  const hasValidWords = nameWords.every(word => word.length >= 1 && word.length <= 20);
  if (!hasValidWords) {
    return { isValid: false, message: "Each name part must be between 1-20 characters" };
  }
  
  return { isValid: true, sanitized: trimmedName };
};

// Enhanced phone validation for profile (optional field)
const validateProfilePhone = (value) => {
  // Phone is optional, so empty values are valid
  if (!value || typeof value !== 'string' || !value.trim()) {
    return { isValid: true, sanitized: null };
  }
  
  const trimmedPhone = value.trim();
  
  // Remove common formatting characters
  const cleanPhone = trimmedPhone.replace(/[\s\-\(\)\.]/g, '');
  
  // Check for valid phone number patterns
  // Indian mobile: 10 digits starting with 6-9
  // International: + followed by country code and number
  const indianMobileRegex = /^[6-9]\d{9}$/;
  const internationalRegex = /^\+[1-9]\d{6,14}$/;
  
  if (indianMobileRegex.test(cleanPhone)) {
    return { isValid: true, sanitized: cleanPhone };
  }
  
  if (internationalRegex.test(cleanPhone)) {
    return { isValid: true, sanitized: cleanPhone };
  }
  
  // Check for common invalid patterns
  if (/^(.)\1+$/.test(cleanPhone)) {
    return { isValid: false, message: "Phone number cannot have all same digits" };
  }
  
  if (cleanPhone.length < 10) {
    return { isValid: false, message: "Phone number must be at least 10 digits" };
  }
  
  if (cleanPhone.length > 15) {
    return { isValid: false, message: "Phone number cannot exceed 15 digits" };
  }
  
  return { isValid: false, message: "Please enter a valid phone number" };
};

// Date of birth validation (optional field)
const validateDateOfBirth = (value) => {
  // Date of birth is optional
  if (!value || typeof value !== 'string' || !value.trim()) {
    return { isValid: true, sanitized: null };
  }
  
  const dateValue = new Date(value);
  
  // Check if date is valid
  if (isNaN(dateValue.getTime())) {
    return { isValid: false, message: "Please enter a valid date" };
  }
  
  const today = new Date();
  const age = today.getFullYear() - dateValue.getFullYear();
  const monthDiff = today.getMonth() - dateValue.getMonth();
  
  // Adjust age if birthday hasn't occurred this year
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateValue.getDate()) 
    ? age - 1 : age;
  
  // Check age constraints
  if (actualAge < 13) {
    return { isValid: false, message: "You must be at least 13 years old" };
  }
  
  if (actualAge > 120) {
    return { isValid: false, message: "Please enter a valid date of birth" };
  }
  
  // Check if date is not in the future
  if (dateValue > today) {
    return { isValid: false, message: "Date of birth cannot be in the future" };
  }
  
  return { isValid: true, sanitized: value };
};

// Gender validation (optional field)
const validateGender = (value) => {
  // Gender is optional
  if (!value || typeof value !== 'string' || !value.trim()) {
    return { isValid: true, sanitized: null };
  }
  
  const validGenders = ['male', 'female', 'other', 'prefer-not-to-say'];
  const normalizedGender = value.trim().toLowerCase();
  
  if (!validGenders.includes(normalizedGender)) {
    return { isValid: false, message: "Please select a valid gender option" };
  }
  
  return { isValid: true, sanitized: normalizedGender };
};

// Create profile update validator
const profileUpdateValidator = createValidationMiddleware({
  fullName: {
    type: 'text',
    fieldName: 'Full Name',
    customValidator: validateProfileFullName,
    required: true
  },
  phone: {
    type: 'text',
    fieldName: 'Phone Number',
    customValidator: validateProfilePhone,
    required: false
  },
  dateOfBirth: {
    type: 'text',
    fieldName: 'Date of Birth',
    customValidator: validateDateOfBirth,
    required: false
  },
  gender: {
    type: 'text',
    fieldName: 'Gender',
    customValidator: validateGender,
    required: false
  }
});

module.exports = {
  profileUpdateValidator,
  validateProfileFullName,
  validateProfilePhone,
  validateDateOfBirth,
  validateGender
};
