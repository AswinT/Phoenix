/**
 * Comprehensive Client-Side Date Validation Utility
 * Provides robust date validation with real-time feedback
 */

class DateValidator {
  constructor() {
    this.errorMessages = {
      required: 'This field is required',
      invalidFormat: 'Please enter a valid date',
      futureDate: 'Date cannot be in the future',
      pastDate: 'Date cannot be in the past',
      tooOld: 'Date is too far in the past',
      tooYoung: 'You must be at least 13 years old',
      invalidRange: 'End date must be after start date',
      weekendNotAllowed: 'Weekends are not allowed',
      holidayNotAllowed: 'Holidays are not allowed'
    };
    
    this.dateFormats = {
      'YYYY-MM-DD': /^\d{4}-\d{2}-\d{2}$/,
      'MM/DD/YYYY': /^\d{2}\/\d{2}\/\d{4}$/,
      'DD/MM/YYYY': /^\d{2}\/\d{2}\/\d{4}$/,
      'DD-MM-YYYY': /^\d{2}-\d{2}-\d{4}$/
    };
  }

  /**
   * Validate a single date input
   * @param {string} dateValue - The date value to validate
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result
   */
  validateDate(dateValue, options = {}) {
    const {
      required = false,
      allowFuture = true,
      allowPast = true,
      minAge = null,
      maxAge = null,
      format = 'YYYY-MM-DD',
      minDate = null,
      maxDate = null,
      excludeWeekends = false,
      excludeHolidays = false,
      customValidator = null
    } = options;

    const result = {
      isValid: true,
      errors: [],
      sanitizedValue: dateValue,
      parsedDate: null
    };

    // Check if required
    if (required && (!dateValue || !dateValue.trim())) {
      result.isValid = false;
      result.errors.push(this.errorMessages.required);
      return result;
    }

    // If not required and empty, return valid
    if (!dateValue || !dateValue.trim()) {
      result.sanitizedValue = null;
      return result;
    }

    // Validate format
    if (!this.isValidFormat(dateValue, format)) {
      result.isValid = false;
      result.errors.push(this.errorMessages.invalidFormat);
      return result;
    }

    // Parse date
    const parsedDate = this.parseDate(dateValue, format);
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      result.isValid = false;
      result.errors.push(this.errorMessages.invalidFormat);
      return result;
    }

    result.parsedDate = parsedDate;

    // Check future/past restrictions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);

    if (!allowFuture && parsedDate > today) {
      result.isValid = false;
      result.errors.push(this.errorMessages.futureDate);
    }

    if (!allowPast && parsedDate < today) {
      result.isValid = false;
      result.errors.push(this.errorMessages.pastDate);
    }

    // Check age restrictions (for date of birth)
    if (minAge !== null || maxAge !== null) {
      const age = this.calculateAge(parsedDate);
      
      if (minAge !== null && age < minAge) {
        result.isValid = false;
        result.errors.push(minAge === 13 ? this.errorMessages.tooYoung : `You must be at least ${minAge} years old`);
      }
      
      if (maxAge !== null && age > maxAge) {
        result.isValid = false;
        result.errors.push(`Age cannot exceed ${maxAge} years`);
      }
    }

    // Check date range
    if (minDate && parsedDate < new Date(minDate)) {
      result.isValid = false;
      result.errors.push(`Date must be after ${this.formatDate(new Date(minDate))}`);
    }

    if (maxDate && parsedDate > new Date(maxDate)) {
      result.isValid = false;
      result.errors.push(`Date must be before ${this.formatDate(new Date(maxDate))}`);
    }

    // Check weekends
    if (excludeWeekends && this.isWeekend(parsedDate)) {
      result.isValid = false;
      result.errors.push(this.errorMessages.weekendNotAllowed);
    }

    // Check holidays (basic implementation)
    if (excludeHolidays && this.isHoliday(parsedDate)) {
      result.isValid = false;
      result.errors.push(this.errorMessages.holidayNotAllowed);
    }

    // Custom validation
    if (customValidator && typeof customValidator === 'function') {
      const customResult = customValidator(parsedDate, dateValue);
      if (!customResult.isValid) {
        result.isValid = false;
        result.errors.push(customResult.message);
      }
    }

    return result;
  }

  /**
   * Validate date range (start and end dates)
   * @param {string} startDate - Start date value
   * @param {string} endDate - End date value
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result
   */
  validateDateRange(startDate, endDate, options = {}) {
    const {
      allowSameDate = false,
      maxRangeDays = null,
      minRangeDays = null,
      format = 'YYYY-MM-DD'
    } = options;

    const result = {
      isValid: true,
      errors: [],
      startDateValid: true,
      endDateValid: true
    };

    // Validate individual dates first
    const startValidation = this.validateDate(startDate, { ...options, required: true });
    const endValidation = this.validateDate(endDate, { ...options, required: true });

    if (!startValidation.isValid) {
      result.isValid = false;
      result.startDateValid = false;
      result.errors.push(...startValidation.errors.map(err => `Start date: ${err}`));
    }

    if (!endValidation.isValid) {
      result.isValid = false;
      result.endDateValid = false;
      result.errors.push(...endValidation.errors.map(err => `End date: ${err}`));
    }

    // If individual validations failed, return early
    if (!startValidation.isValid || !endValidation.isValid) {
      return result;
    }

    const startDateObj = startValidation.parsedDate;
    const endDateObj = endValidation.parsedDate;

    // Check date order
    if (allowSameDate ? startDateObj > endDateObj : startDateObj >= endDateObj) {
      result.isValid = false;
      result.endDateValid = false;
      result.errors.push(this.errorMessages.invalidRange);
    }

    // Check range constraints
    if (result.isValid && (maxRangeDays || minRangeDays)) {
      const rangeDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
      
      if (maxRangeDays && rangeDays > maxRangeDays) {
        result.isValid = false;
        result.errors.push(`Date range cannot exceed ${maxRangeDays} days`);
      }
      
      if (minRangeDays && rangeDays < minRangeDays) {
        result.isValid = false;
        result.errors.push(`Date range must be at least ${minRangeDays} days`);
      }
    }

    return result;
  }

  /**
   * Check if date format is valid
   * @param {string} dateValue - Date value to check
   * @param {string} format - Expected format
   * @returns {boolean} - Whether format is valid
   */
  isValidFormat(dateValue, format) {
    const regex = this.dateFormats[format];
    return regex ? regex.test(dateValue) : true;
  }

  /**
   * Parse date string according to format
   * @param {string} dateValue - Date value to parse
   * @param {string} format - Date format
   * @returns {Date|null} - Parsed date or null
   */
  parseDate(dateValue, format) {
    try {
      if (format === 'YYYY-MM-DD') {
        return new Date(dateValue);
      }
      
      // Handle other formats
      let parts, year, month, day;
      
      switch (format) {
        case 'MM/DD/YYYY':
          parts = dateValue.split('/');
          month = parseInt(parts[0]) - 1;
          day = parseInt(parts[1]);
          year = parseInt(parts[2]);
          break;
        case 'DD/MM/YYYY':
          parts = dateValue.split('/');
          day = parseInt(parts[0]);
          month = parseInt(parts[1]) - 1;
          year = parseInt(parts[2]);
          break;
        case 'DD-MM-YYYY':
          parts = dateValue.split('-');
          day = parseInt(parts[0]);
          month = parseInt(parts[1]) - 1;
          year = parseInt(parts[2]);
          break;
        default:
          return new Date(dateValue);
      }
      
      return new Date(year, month, day);
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate age from date of birth
   * @param {Date} birthDate - Date of birth
   * @returns {number} - Age in years
   */
  calculateAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Check if date is weekend
   * @param {Date} date - Date to check
   * @returns {boolean} - Whether date is weekend
   */
  isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  /**
   * Check if date is holiday (basic implementation)
   * @param {Date} date - Date to check
   * @returns {boolean} - Whether date is holiday
   */
  isHoliday(date) {
    // Basic holiday check - can be extended
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Common holidays (extend as needed)
    const holidays = [
      { month: 1, day: 1 },   // New Year's Day
      { month: 12, day: 25 }, // Christmas
      { month: 7, day: 4 },   // Independence Day (US)
    ];
    
    return holidays.some(holiday => holiday.month === month && holiday.day === day);
  }

  /**
   * Format date for display
   * @param {Date} date - Date to format
   * @param {string} format - Format string
   * @returns {string} - Formatted date
   */
  formatDate(date, format = 'YYYY-MM-DD') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    switch (format) {
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`;
      default:
        return date.toLocaleDateString();
    }
  }

  /**
   * Get today's date in specified format
   * @param {string} format - Date format
   * @returns {string} - Today's date
   */
  getToday(format = 'YYYY-MM-DD') {
    return this.formatDate(new Date(), format);
  }

  /**
   * Add real-time validation to date input
   * @param {HTMLElement} input - Date input element
   * @param {Object} options - Validation options
   * @param {Function} callback - Callback function for validation result
   */
  addRealTimeValidation(input, options = {}, callback = null) {
    const errorContainer = options.errorContainer || 
      input.parentElement.querySelector('.error-message') ||
      this.createErrorContainer(input);

    const validateAndShow = () => {
      const result = this.validateDate(input.value, options);
      this.showValidationResult(input, errorContainer, result);
      
      if (callback) {
        callback(result);
      }
    };

    // Add event listeners
    input.addEventListener('blur', validateAndShow);
    input.addEventListener('change', validateAndShow);
    
    // Optional: validate on input for immediate feedback
    if (options.validateOnInput) {
      let timeout;
      input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(validateAndShow, 300);
      });
    }
  }

  /**
   * Create error container for validation messages
   * @param {HTMLElement} input - Input element
   * @returns {HTMLElement} - Error container
   */
  createErrorContainer(input) {
    const container = document.createElement('div');
    container.className = 'error-message text-danger small mt-1';
    container.style.display = 'none';
    input.parentElement.appendChild(container);
    return container;
  }

  /**
   * Show validation result
   * @param {HTMLElement} input - Input element
   * @param {HTMLElement} errorContainer - Error container
   * @param {Object} result - Validation result
   */
  showValidationResult(input, errorContainer, result) {
    if (result.isValid) {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
      errorContainer.style.display = 'none';
      errorContainer.textContent = '';
    } else {
      input.classList.remove('is-valid');
      input.classList.add('is-invalid');
      errorContainer.style.display = 'block';
      errorContainer.textContent = result.errors[0]; // Show first error
    }
  }
}

// Create global instance
window.DateValidator = new DateValidator();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DateValidator;
}
