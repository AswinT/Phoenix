const { createValidationMiddleware } = require('../../helpers/validationHelper');

const validateProfileFullName = (value) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return { isValid: false, message: "Full name is required" };
  }

  const trimmedName = value.trim();

  // Maximum length validation
  if (trimmedName.length > 50) {
    return { isValid: false, message: "Full name cannot exceed 50 characters" };
  }

  // Enhanced character validation - include periods for titles
  if (!/^[A-Za-z\s'.-]+$/.test(trimmedName)) {
    return { isValid: false, message: "Name can only contain letters, spaces, hyphens, apostrophes, and periods" };
  }

  // Check for consecutive spaces
  if (/\s{2,}/.test(trimmedName)) {
    return { isValid: false, message: "Full name cannot have consecutive spaces" };
  }

  // Check for leading/trailing special characters
  if (/^[\s'.-]+|[\s'.-]+$/.test(trimmedName)) {
    return { isValid: false, message: "Full name cannot start or end with special characters" };
  }

  const nameWords = trimmedName.split(/\s+/).filter(word => word.length > 0);
  if (nameWords.length < 2) {
    return { isValid: false, message: "Please provide both first and last name" };
  }

  // Enhanced word validation with specific rules for first and last name
  // First name must be at least 2 characters, last name can be 1 character (for initials)
  const firstName = nameWords[0];
  const lastName = nameWords[nameWords.length - 1];

  if (firstName.length < 2) {
    return { isValid: false, message: "First name must be at least 2 characters long" };
  }

  if (lastName.length < 1) {
    return { isValid: false, message: "Last name must be at least 1 character long" };
  }

  // Check all words for maximum length
  const hasValidLength = nameWords.every(word => word.length <= 20);
  if (!hasValidLength) {
    return { isValid: false, message: "Each name part cannot exceed 20 characters" };
  }

  // Middle names/initials (if any) can be 1-20 characters
  for (let i = 1; i < nameWords.length - 1; i++) {
    if (nameWords[i].length < 1 || nameWords[i].length > 20) {
      return { isValid: false, message: "Middle names must be between 1-20 characters" };
    }
  }

  // Check for repeated characters in a single word
  for (const word of nameWords) {
    if (/(.)\1{2,}/.test(word)) {
      return { isValid: false, message: "Names cannot contain more than 2 consecutive identical characters" };
    }
  }

  return { isValid: true, sanitized: trimmedName };
};

const validateProfilePhone = (value) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return { isValid: true, sanitized: null };
  }

  const trimmedPhone = value.trim();

  // Remove common formatting characters
  const cleanPhone = trimmedPhone.replace(/[\s\-\(\)\.]/g, '');

  // Check for invalid characters
  if (!/^[\+\d]+$/.test(cleanPhone)) {
    return { isValid: false, message: "Phone number can only contain digits, spaces, hyphens, parentheses, periods, and plus sign" };
  }

  // Enhanced validation patterns with country code support
  const indianMobileRegex = /^[6-9]\d{9}$/; // Indian mobile numbers
  const indianMobileWithCountryCode = /^(\+91|91)[6-9]\d{9}$/; // Indian with country code
  const usCanadaRegex = /^(\+1|1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/; // US/Canada
  const ukRegex = /^(\+44|44)?[1-9]\d{8,9}$/; // UK
  const generalInternationalRegex = /^\+[1-9]\d{6,14}$/; // General international format

  // Check for all same digits
  if (/^(.)\1+$/.test(cleanPhone.replace(/^\+/, ''))) {
    return { isValid: false, message: "Phone number cannot have all same digits" };
  }

  // Check for sequential digits
  const digits = cleanPhone.replace(/^\+\d{1,3}/, ''); // Remove country code for this check
  if (/0123456789|1234567890|9876543210|0987654321/.test(digits)) {
    return { isValid: false, message: "Phone number cannot be sequential digits" };
  }

  // Validate based on patterns
  if (indianMobileRegex.test(cleanPhone)) {
    return { isValid: true, sanitized: cleanPhone };
  }

  if (indianMobileWithCountryCode.test(cleanPhone)) {
    // Normalize to standard format
    const normalized = cleanPhone.replace(/^(\+91|91)/, '');
    return { isValid: true, sanitized: normalized };
  }

  if (usCanadaRegex.test(cleanPhone)) {
    return { isValid: true, sanitized: cleanPhone };
  }

  if (ukRegex.test(cleanPhone)) {
    return { isValid: true, sanitized: cleanPhone };
  }

  if (generalInternationalRegex.test(cleanPhone)) {
    return { isValid: true, sanitized: cleanPhone };
  }

  // Provide specific error messages based on length and format
  if (cleanPhone.length < 10) {
    return { isValid: false, message: "Phone number must be at least 10 digits long" };
  }

  if (cleanPhone.length > 15) {
    return { isValid: false, message: "Phone number cannot exceed 15 digits" };
  }

  if (cleanPhone.startsWith('+')) {
    return { isValid: false, message: "Please enter a valid international phone number with proper country code" };
  }

  return { isValid: false, message: "Please enter a valid phone number (Indian: 10 digits starting with 6-9, International: include country code)" };
};

const validateDateOfBirth = (value) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return { isValid: true, sanitized: null };
  }
  
  const dateValue = new Date(value);
  
  if (isNaN(dateValue.getTime())) {
    return { isValid: false, message: "Please enter a valid date" };
  }
  
  const today = new Date();
  const age = today.getFullYear() - dateValue.getFullYear();
  const monthDiff = today.getMonth() - dateValue.getMonth();
  
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateValue.getDate()) 
    ? age - 1 : age;
  
  if (actualAge < 13) {
    return { isValid: false, message: "You must be at least 13 years old" };
  }
  
  if (actualAge > 120) {
    return { isValid: false, message: "Please enter a valid date of birth" };
  }
  
  if (dateValue > today) {
    return { isValid: false, message: "Date of birth cannot be in the future" };
  }
  
  return { isValid: true, sanitized: value };
};

const validateGender = (value) => {
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
