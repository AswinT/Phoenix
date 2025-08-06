/**
 * Date Validation Helper
 * Easy integration of date validation into forms
 */

class DateValidationHelper {
  constructor() {
    this.validator = window.DateValidator;
    this.validatedInputs = new Map();
  }

  /**
   * Initialize date validation for common form patterns
   */
  init() {
    // Auto-initialize common date inputs
    this.initDateOfBirthValidation();
    this.initDateRangeValidation();
    this.initSalesReportDates();
    this.initOfferDates();
    this.initCouponDates();
  }

  /**
   * Initialize date of birth validation
   */
  initDateOfBirthValidation() {
    const dobInput = document.querySelector('#dateOfBirth, input[name="dateOfBirth"]');
    if (dobInput) {
      this.validator.addRealTimeValidation(dobInput, {
        required: false,
        allowFuture: false,
        minAge: 13,
        maxAge: 120,
        validateOnInput: true
      });
      
      // Set max date to today
      dobInput.setAttribute('max', this.validator.getToday());
    }
  }

  /**
   * Initialize date range validation (start/end dates)
   */
  initDateRangeValidation() {
    const startDateInputs = document.querySelectorAll('#startDate, #editStartDate, input[name="startDate"]');
    const endDateInputs = document.querySelectorAll('#endDate, #editEndDate, #expiryDate, #editExpiryDate, input[name="endDate"], input[name="expiryDate"]');

    startDateInputs.forEach(startInput => {
      const endInput = this.findCorrespondingEndDate(startInput);
      if (endInput) {
        this.setupDateRangePair(startInput, endInput);
      }
    });
  }

  /**
   * Initialize sales report date validation
   */
  initSalesReportDates() {
    const fromDateInput = document.querySelector('#fromDate');
    const toDateInput = document.querySelector('#toDate');
    
    if (fromDateInput && toDateInput) {
      // Set max date to today for sales reports
      const today = this.validator.getToday();
      fromDateInput.setAttribute('max', today);
      toDateInput.setAttribute('max', today);
      
      this.setupDateRangePair(fromDateInput, toDateInput, {
        allowFuture: false,
        maxRangeDays: 365 // Maximum 1 year range
      });
    }
  }

  /**
   * Initialize offer date validation
   */
  initOfferDates() {
    const addStartDate = document.querySelector('#addStartDate');
    const addEndDate = document.querySelector('#addEndDate');
    const editStartDate = document.querySelector('#editStartDate');
    const editEndDate = document.querySelector('#editEndDate');

    if (addStartDate && addEndDate) {
      this.setupDateRangePair(addStartDate, addEndDate, {
        allowPast: false, // New offers can't start in the past
        minRangeDays: 1
      });
    }

    if (editStartDate && editEndDate) {
      this.setupDateRangePair(editStartDate, editEndDate, {
        allowPast: true, // Editing existing offers
        minRangeDays: 1
      });
    }
  }

  /**
   * Initialize coupon date validation
   */
  initCouponDates() {
    const startDate = document.querySelector('#startDate');
    const expiryDate = document.querySelector('#expiryDate');
    const editStartDate = document.querySelector('#editStartDate');
    const editExpiryDate = document.querySelector('#editExpiryDate');

    if (startDate && expiryDate) {
      this.setupDateRangePair(startDate, expiryDate, {
        allowPast: false,
        minRangeDays: 1
      });
    }

    if (editStartDate && editExpiryDate) {
      this.setupDateRangePair(editStartDate, editExpiryDate, {
        allowPast: true,
        minRangeDays: 1
      });
    }
  }

  /**
   * Setup validation for a date range pair
   * @param {HTMLElement} startInput - Start date input
   * @param {HTMLElement} endInput - End date input
   * @param {Object} options - Validation options
   */
  setupDateRangePair(startInput, endInput, options = {}) {
    const defaultOptions = {
      required: true,
      allowFuture: true,
      allowPast: true,
      validateOnInput: false
    };

    const mergedOptions = { ...defaultOptions, ...options };

    // Add individual validation
    this.validator.addRealTimeValidation(startInput, mergedOptions, (result) => {
      if (result.isValid && endInput.value) {
        this.validateDateRange(startInput, endInput, mergedOptions);
      }
    });

    this.validator.addRealTimeValidation(endInput, mergedOptions, (result) => {
      if (result.isValid && startInput.value) {
        this.validateDateRange(startInput, endInput, mergedOptions);
      }
    });

    // Store the pair for later reference
    this.validatedInputs.set(startInput, { endInput, options: mergedOptions });
    this.validatedInputs.set(endInput, { startInput, options: mergedOptions });
  }

  /**
   * Validate date range and show errors
   * @param {HTMLElement} startInput - Start date input
   * @param {HTMLElement} endInput - End date input
   * @param {Object} options - Validation options
   */
  validateDateRange(startInput, endInput, options = {}) {
    const result = this.validator.validateDateRange(startInput.value, endInput.value, options);
    
    // Clear previous range errors
    this.clearRangeErrors(startInput, endInput);
    
    if (!result.isValid) {
      // Show range-specific errors on the end date input
      const endErrorContainer = this.getErrorContainer(endInput);
      if (endErrorContainer && !result.endDateValid) {
        endErrorContainer.style.display = 'block';
        endErrorContainer.textContent = result.errors.find(err => 
          err.includes('End date') || err.includes('range') || err.includes('after')
        ) || result.errors[0];
        endInput.classList.add('is-invalid');
        endInput.classList.remove('is-valid');
      }
    }
  }

  /**
   * Find corresponding end date input for a start date input
   * @param {HTMLElement} startInput - Start date input
   * @returns {HTMLElement|null} - Corresponding end date input
   */
  findCorrespondingEndDate(startInput) {
    const startId = startInput.id;
    const startName = startInput.name;
    
    // Common patterns for end date inputs
    const endPatterns = [
      startId.replace('start', 'end'),
      startId.replace('Start', 'End'),
      startId.replace('start', 'expiry'),
      startId.replace('Start', 'Expiry'),
      startName ? startName.replace('start', 'end') : null,
      startName ? startName.replace('Start', 'End') : null
    ].filter(Boolean);

    for (const pattern of endPatterns) {
      const endInput = document.querySelector(`#${pattern}, input[name="${pattern}"]`);
      if (endInput) {
        return endInput;
      }
    }

    // Look for end date in the same form
    const form = startInput.closest('form');
    if (form) {
      const endInputs = form.querySelectorAll('input[type="date"]');
      for (const input of endInputs) {
        if (input !== startInput && 
            (input.id.includes('end') || input.id.includes('End') || 
             input.id.includes('expiry') || input.id.includes('Expiry'))) {
          return input;
        }
      }
    }

    return null;
  }

  /**
   * Get error container for an input
   * @param {HTMLElement} input - Input element
   * @returns {HTMLElement|null} - Error container
   */
  getErrorContainer(input) {
    return input.parentElement.querySelector('.error-message') ||
           input.parentElement.querySelector('.invalid-feedback') ||
           input.parentElement.querySelector('.text-danger');
  }

  /**
   * Clear range-specific errors
   * @param {HTMLElement} startInput - Start date input
   * @param {HTMLElement} endInput - End date input
   */
  clearRangeErrors(startInput, endInput) {
    const endErrorContainer = this.getErrorContainer(endInput);
    if (endErrorContainer) {
      const currentError = endErrorContainer.textContent;
      if (currentError.includes('range') || currentError.includes('after') || currentError.includes('before')) {
        endErrorContainer.style.display = 'none';
        endErrorContainer.textContent = '';
        endInput.classList.remove('is-invalid');
      }
    }
  }

  /**
   * Validate all date inputs in a form
   * @param {HTMLElement} form - Form element
   * @returns {boolean} - Whether all dates are valid
   */
  validateForm(form) {
    const dateInputs = form.querySelectorAll('input[type="date"]');
    let isValid = true;

    dateInputs.forEach(input => {
      const options = this.getOptionsForInput(input);
      const result = this.validator.validateDate(input.value, options);
      
      if (!result.isValid) {
        isValid = false;
        const errorContainer = this.getErrorContainer(input) || this.validator.createErrorContainer(input);
        this.validator.showValidationResult(input, errorContainer, result);
      }
    });

    // Validate date ranges
    this.validatedInputs.forEach((config, input) => {
      if (config.endInput) {
        const rangeResult = this.validator.validateDateRange(
          input.value, 
          config.endInput.value, 
          config.options
        );
        if (!rangeResult.isValid) {
          isValid = false;
        }
      }
    });

    return isValid;
  }

  /**
   * Get validation options for a specific input
   * @param {HTMLElement} input - Input element
   * @returns {Object} - Validation options
   */
  getOptionsForInput(input) {
    const inputId = input.id.toLowerCase();
    const inputName = (input.name || '').toLowerCase();
    
    // Date of birth
    if (inputId.includes('birth') || inputName.includes('birth')) {
      return {
        required: false,
        allowFuture: false,
        minAge: 13,
        maxAge: 120
      };
    }
    
    // Sales report dates
    if (inputId.includes('from') || inputId.includes('to') || 
        input.closest('.sales-filters')) {
      return {
        required: true,
        allowFuture: false
      };
    }
    
    // Offer/coupon dates
    if (inputId.includes('start') || inputId.includes('end') || 
        inputId.includes('expiry')) {
      return {
        required: true,
        allowFuture: true,
        allowPast: inputId.includes('edit') // Allow past dates for editing
      };
    }
    
    // Default options
    return {
      required: true,
      allowFuture: true,
      allowPast: true
    };
  }

  /**
   * Add custom validation to a date input
   * @param {string} selector - CSS selector for the input
   * @param {Object} options - Validation options
   * @param {Function} callback - Optional callback
   */
  addCustomValidation(selector, options = {}, callback = null) {
    const input = document.querySelector(selector);
    if (input) {
      this.validator.addRealTimeValidation(input, options, callback);
    }
  }

  /**
   * Remove validation from an input
   * @param {HTMLElement} input - Input element
   */
  removeValidation(input) {
    this.validatedInputs.delete(input);
    input.classList.remove('is-valid', 'is-invalid');
    
    const errorContainer = this.getErrorContainer(input);
    if (errorContainer) {
      errorContainer.style.display = 'none';
      errorContainer.textContent = '';
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.DateValidationHelper = new DateValidationHelper();
  window.DateValidationHelper.init();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DateValidationHelper;
}
