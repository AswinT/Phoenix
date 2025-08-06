const { HttpStatus } = require('./statusCode');
const VALIDATION_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^[6-9]\d{9}$/,
  NAME: /^[A-Za-z\s'-]+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9\s]+$/,
  ALPHANUMERIC_SPECIAL: /^[a-zA-Z0-9\s\-:,.'&()]+$/,
  PINCODE: /^\d{6}$/,
  PRICE: /^\d+(\.\d{1,2})?$/,
  MONGODB_ID: /^[0-9a-fA-F]{24}$/
};
const VALIDATION_RULES = {
  NAME: { min: 2, max: 50 },
  EMAIL: { max: 100 },
  PHONE: { length: 10 },
  PASSWORD: { min: 8, max: 128 },
  TITLE: { min: 3, max: 100 },
  DESCRIPTION: { min: 10, max: 2000 },
  PRICE: { min: 0, max: 100000 },
  QUANTITY: { min: 1, max: 10 },
  STOCK: { min: 0, max: 10000 },
  PINCODE: { length: 6 },
  ADDRESS: { min: 10, max: 200 }
};
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/\s+/g, ' ');
};
const validateEmail = (email) => {
  if (!email) return { isValid: false, message: 'Email is required' };
  const sanitized = sanitizeInput(email).toLowerCase();
  if (sanitized.length > VALIDATION_RULES.EMAIL.max) {
    return { isValid: false, message: 'Email is too long' };
  }
  if (!VALIDATION_PATTERNS.EMAIL.test(sanitized)) {
    return { isValid: false, message: 'Invalid email format' };
  }
  return { isValid: true, sanitized };
};
const validatePhone = (phone) => {
  if (!phone) return { isValid: false, message: 'Phone number is required' };
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== VALIDATION_RULES.PHONE.length) {
    return { isValid: false, message: 'Phone number must be 10 digits' };
  }
  if (!VALIDATION_PATTERNS.PHONE.test(cleaned)) {
    return { isValid: false, message: 'Invalid phone number format' };
  }
  if (/^(.)\1+$/.test(cleaned) || /^0{10}$/.test(cleaned)) {
    return { isValid: false, message: 'Invalid phone number' };
  }
  return { isValid: true, sanitized: cleaned };
};
const validateName = (name, fieldName = 'Name') => {
  if (!name) return { isValid: false, message: `${fieldName} is required` };
  const sanitized = sanitizeInput(name);
  if (sanitized.length < VALIDATION_RULES.NAME.min) {
    return { isValid: false, message: `${fieldName} must be at least ${VALIDATION_RULES.NAME.min} characters` };
  }
  if (sanitized.length > VALIDATION_RULES.NAME.max) {
    return { isValid: false, message: `${fieldName} must not exceed ${VALIDATION_RULES.NAME.max} characters` };
  }
  if (!VALIDATION_PATTERNS.NAME.test(sanitized)) {
    return { isValid: false, message: `${fieldName} contains invalid characters` };
  }
  return { isValid: true, sanitized };
};
const validatePassword = (password) => {
  if (!password) return { isValid: false, message: 'Password is required' };
  if (password.length < VALIDATION_RULES.PASSWORD.min) {
    return { isValid: false, message: `Password must be at least ${VALIDATION_RULES.PASSWORD.min} characters` };
  }
  if (password.length > VALIDATION_RULES.PASSWORD.max) {
    return { isValid: false, message: `Password must not exceed ${VALIDATION_RULES.PASSWORD.max} characters` };
  }
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*?&_\-#]/.test(password);
  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    return { 
      isValid: false, 
      message: 'Password must contain uppercase, lowercase, number, and special character' 
    };
  }
  return { isValid: true };
};
const validateObjectId = (id, fieldName = 'ID') => {
  if (!id) return { isValid: false, message: `${fieldName} is required` };
  if (!VALIDATION_PATTERNS.MONGODB_ID.test(id)) {
    return { isValid: false, message: `Invalid ${fieldName} format` };
  }
  return { isValid: true };
};
const validatePrice = (price, fieldName = 'Price') => {
  if (price === undefined || price === null) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) {
    return { isValid: false, message: `${fieldName} must be a valid number` };
  }
  if (numPrice < VALIDATION_RULES.PRICE.min) {
    return { isValid: false, message: `${fieldName} must be at least ₹${VALIDATION_RULES.PRICE.min}` };
  }
  if (numPrice > VALIDATION_RULES.PRICE.max) {
    return { isValid: false, message: `${fieldName} must not exceed ₹${VALIDATION_RULES.PRICE.max}` };
  }
  return { isValid: true, sanitized: numPrice };
};
const validateQuantity = (quantity, fieldName = 'Quantity') => {
  if (quantity === undefined || quantity === null) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  const numQuantity = parseInt(quantity);
  if (isNaN(numQuantity)) {
    return { isValid: false, message: `${fieldName} must be a valid number` };
  }
  if (numQuantity < VALIDATION_RULES.QUANTITY.min) {
    return { isValid: false, message: `${fieldName} must be at least ${VALIDATION_RULES.QUANTITY.min}` };
  }
  if (numQuantity > VALIDATION_RULES.QUANTITY.max) {
    return { isValid: false, message: `${fieldName} must not exceed ${VALIDATION_RULES.QUANTITY.max}` };
  }
  return { isValid: true, sanitized: numQuantity };
};
const validateText = (text, rules, fieldName = 'Field') => {
  if (rules.customValidator && typeof rules.customValidator === 'function') {
    return rules.customValidator(text);
  }
  if (!text && rules.required !== false) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  if (!text) return { isValid: true, sanitized: '' };
  const sanitized = sanitizeInput(text);
  if (rules.min && sanitized.length < rules.min) {
    return { isValid: false, message: `${fieldName} must be at least ${rules.min} characters` };
  }
  if (rules.max && sanitized.length > rules.max) {
    return { isValid: false, message: `${fieldName} must not exceed ${rules.max} characters` };
  }
  if (rules.pattern && !rules.pattern.test(sanitized)) {
    return { isValid: false, message: `${fieldName} contains invalid characters` };
  }
  return { isValid: true, sanitized };
};
const createValidationMiddleware = (validationRules) => {
  return (req, res, next) => {
    const errors = {};
    const sanitizedData = {};
    for (const [field, rules] of Object.entries(validationRules)) {
      const value = req.body[field];
      let result;
      if (rules.customValidator && typeof rules.customValidator === 'function') {
        result = rules.customValidator(value);
      } else {
        switch (rules.type) {
          case 'email':
            result = validateEmail(value);
            break;
          case 'phone':
            result = validatePhone(value);
            break;
          case 'name':
            result = validateName(value, rules.fieldName || field);
            break;
          case 'password':
            result = validatePassword(value);
            break;
          case 'objectId':
            result = validateObjectId(value, rules.fieldName || field);
            break;
          case 'price':
            result = validatePrice(value, rules.fieldName || field);
            break;
          case 'quantity':
            result = validateQuantity(value, rules.fieldName || field);
            break;
          case 'text':
            result = validateText(value, rules, rules.fieldName || field);
            break;
          case 'select':
            result = validateText(value, rules, rules.fieldName || field);
            break;
          case 'date':
            result = validateDate(value, rules, rules.fieldName || field);
            break;
          case 'dateOfBirth':
            result = validateDateOfBirth(value, rules.fieldName || field);
            break;
          default:
            result = { isValid: true, sanitized: value };
        }
      }
      if (!result.isValid) {
        errors[field] = result.message;
      } else if (result.sanitized !== undefined) {
        sanitizedData[field] = result.sanitized;
      }
    }
    if (Object.keys(errors).length > 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    req.validatedData = sanitizedData;
    next();
  };
};
const validateDate = (dateValue, options = {}, fieldName = 'Date') => {
  const {
    required = false,
    allowFuture = true,
    allowPast = true,
    minAge = null,
    maxAge = null,
    minDate = null,
    maxDate = null,
    format = 'YYYY-MM-DD'
  } = options;

  if (!dateValue && !required) {
    return { isValid: true, sanitized: null };
  }

  if (!dateValue && required) {
    return { isValid: false, message: `${fieldName} is required` };
  }

  // Validate date format and parse
  const parsedDate = new Date(dateValue);
  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, message: `${fieldName} must be a valid date` };
  }

  // Check if the date string matches expected format
  if (format === 'YYYY-MM-DD' && !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return { isValid: false, message: `${fieldName} must be in YYYY-MM-DD format` };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsedDate.setHours(0, 0, 0, 0);

  // Check future/past restrictions
  if (!allowFuture && parsedDate > today) {
    return { isValid: false, message: `${fieldName} cannot be in the future` };
  }

  if (!allowPast && parsedDate < today) {
    return { isValid: false, message: `${fieldName} cannot be in the past` };
  }

  // Check age restrictions (for date of birth)
  if (minAge !== null || maxAge !== null) {
    const age = calculateAge(parsedDate);

    if (minAge !== null && age < minAge) {
      return { isValid: false, message: `Age must be at least ${minAge} years` };
    }

    if (maxAge !== null && age > maxAge) {
      return { isValid: false, message: `Age cannot exceed ${maxAge} years` };
    }
  }

  // Check date range
  if (minDate) {
    const minDateObj = new Date(minDate);
    minDateObj.setHours(0, 0, 0, 0);
    if (parsedDate < minDateObj) {
      return { isValid: false, message: `${fieldName} must be after ${formatDate(minDateObj)}` };
    }
  }

  if (maxDate) {
    const maxDateObj = new Date(maxDate);
    maxDateObj.setHours(0, 0, 0, 0);
    if (parsedDate > maxDateObj) {
      return { isValid: false, message: `${fieldName} must be before ${formatDate(maxDateObj)}` };
    }
  }

  return { isValid: true, sanitized: dateValue };
};

const validateDateRange = (startDate, endDate, options = {}) => {
  const {
    allowSameDate = false,
    maxRangeDays = null,
    minRangeDays = null,
    startFieldName = 'Start date',
    endFieldName = 'End date'
  } = options;

  // Validate individual dates first
  const startValidation = validateDate(startDate, { ...options, required: true }, startFieldName);
  const endValidation = validateDate(endDate, { ...options, required: true }, endFieldName);

  if (!startValidation.isValid) {
    return { isValid: false, message: startValidation.message };
  }

  if (!endValidation.isValid) {
    return { isValid: false, message: endValidation.message };
  }

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  startDateObj.setHours(0, 0, 0, 0);
  endDateObj.setHours(0, 0, 0, 0);

  // Check date order
  if (allowSameDate ? startDateObj > endDateObj : startDateObj >= endDateObj) {
    return { isValid: false, message: `${endFieldName} must be after ${startFieldName}` };
  }

  // Check range constraints
  if (maxRangeDays || minRangeDays) {
    const rangeDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));

    if (maxRangeDays && rangeDays > maxRangeDays) {
      return { isValid: false, message: `Date range cannot exceed ${maxRangeDays} days` };
    }

    if (minRangeDays && rangeDays < minRangeDays) {
      return { isValid: false, message: `Date range must be at least ${minRangeDays} days` };
    }
  }

  return { isValid: true, sanitized: { startDate, endDate } };
};

const calculateAge = (birthDate) => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

const validateDateOfBirth = (dateValue, fieldName = 'Date of birth') => {
  return validateDate(dateValue, {
    required: false,
    allowFuture: false,
    minAge: 13,
    maxAge: 120
  }, fieldName);
};

const validateOfferDates = (startDate, endDate, isEdit = false) => {
  return validateDateRange(startDate, endDate, {
    allowPast: isEdit, // Allow past dates for editing existing offers
    allowSameDate: false,
    minRangeDays: 1,
    maxRangeDays: 365, // Maximum 1 year
    startFieldName: 'Start date',
    endFieldName: 'End date'
  });
};

const validateCouponDates = (startDate, expiryDate, isEdit = false) => {
  return validateDateRange(startDate, expiryDate, {
    allowPast: isEdit, // Allow past dates for editing existing coupons
    allowSameDate: false,
    minRangeDays: 1,
    maxRangeDays: 730, // Maximum 2 years
    startFieldName: 'Start date',
    endFieldName: 'Expiry date'
  });
};

const validateSalesReportDates = (fromDate, toDate) => {
  return validateDateRange(fromDate, toDate, {
    allowFuture: false, // Sales reports can't include future dates
    allowSameDate: true,
    maxRangeDays: 365, // Maximum 1 year range
    startFieldName: 'From date',
    endFieldName: 'To date'
  });
};

module.exports = {
  VALIDATION_PATTERNS,
  VALIDATION_RULES,
  sanitizeInput,
  validateEmail,
  validatePhone,
  validateName,
  validatePassword,
  validateObjectId,
  validatePrice,
  validateQuantity,
  validateText,
  validateDate,
  validateDateRange,
  validateDateOfBirth,
  validateOfferDates,
  validateCouponDates,
  validateSalesReportDates,
  calculateAge,
  formatDate,
  createValidationMiddleware
};