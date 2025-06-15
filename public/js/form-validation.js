/**
 * Phoenix Headphones - Comprehensive Form Validation System
 * Centralized client-side validation with consistent error handling
 */

class PhoenixFormValidator {
  constructor() {
    this.validationRules = {
      // Basic field validation rules
      required: (value) => value.trim().length > 0,
      email: (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim()),
      phone: (value) => /^[6-9]\d{9}$/.test(value.trim()),
      
      // Name validations
      fullname: (value) => value.trim().length >= 4,
      productName: (value) => value.trim().length >= 3 && value.trim().length <= 100,
      brand: (value) => value.trim().length >= 2 && value.trim().length <= 50,
      
      // Password validations
      password: (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value),
      confirmPassword: (value, originalField) => {
        const originalValue = document.getElementById(originalField)?.value || '';
        return value === originalValue && value.length > 0;
      },
      
      // Numeric validations
      price: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0.01 && num <= 999999.99;
      },
      quantity: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 0 && num <= 10000;
      },
      percentage: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 100;
      },
      
      // Text length validations
      description: (value) => {
        const trimmed = value.trim();
        const wordCount = trimmed.split(/\s+/).filter(word => word.length > 0).length;
        return trimmed.length >= 20 && trimmed.length <= 2000 && wordCount >= 10;
      },
      features: (value) => value.trim().length >= 10 && value.trim().length <= 1000,
      reviewTitle: (value) => value.trim().length >= 5 && value.trim().length <= 100,
      reviewComment: (value) => value.trim().length >= 10 && value.trim().length <= 1000,
      
      // Address validations
      addressName: (value) => value.trim().length >= 2 && value.trim().length <= 50,
      city: (value) => value.trim().length >= 2 && value.trim().length <= 50,
      state: (value) => value.trim().length >= 2 && value.trim().length <= 50,
      landmark: (value) => value.trim().length >= 3 && value.trim().length <= 100,
      pincode: (value) => /^\d{6}$/.test(value.trim()),
      
      // Category validations
      categoryName: (value) => value.trim().length >= 2 && value.trim().length <= 50,
      categoryDescription: (value) => value.trim().length <= 500,

      // Price filter validations for shop
      minPrice: (value) => {
        if (!value) return true; // Optional field
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0;
      },

      maxPrice: (value) => {
        if (!value) return true; // Optional field
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0;
      }
    };

    this.errorMessages = {
      required: 'This field is required',
      email: 'Please enter a valid email address',
      phone: 'Phone number must start with 6, 7, 8, or 9 and be 10 digits long',
      fullname: 'Full name must be at least 4 characters long',
      productName: 'Product name must be between 3-100 characters',
      brand: 'Brand name must be between 2-50 characters',
      password: 'Password must contain at least 8 characters with uppercase, lowercase, number and special character',
      confirmPassword: 'Passwords do not match',
      price: 'Price must be between ₹0.01 and ₹999,999.99',
      quantity: 'Quantity must be between 0 and 10,000',
      percentage: 'Percentage must be between 0 and 100',
      description: 'Description must be at least 10 words and between 20-2000 characters',
      features: 'Features must be between 10-1000 characters',
      reviewTitle: 'Review title must be between 5-100 characters',
      reviewComment: 'Review comment must be between 10-1000 characters',
      addressName: 'Name must be between 2-50 characters',
      city: 'City must be between 2-50 characters',
      state: 'State must be between 2-50 characters',
      landmark: 'Landmark must be between 3-100 characters',
      pincode: 'Pincode must be exactly 6 digits',
      categoryName: 'Category name must be between 2-50 characters',
      categoryDescription: 'Description must not exceed 500 characters',
      minPrice: 'Minimum price cannot be negative',
      maxPrice: 'Maximum price cannot be negative'
    };
  }

  /**
   * Initialize validation for a form
   * @param {string} formId - The ID of the form to validate
   * @param {Array} fieldConfigs - Array of field configuration objects
   * @param {Object} options - Additional options for validation behavior
   */
  initializeForm(formId, fieldConfigs, options = {}) {
    const form = document.getElementById(formId);
    if (!form) {
      console.warn(`Form with ID '${formId}' not found`);
      return;
    }

    const config = {
      preventSubmission: true,
      realTimeValidation: true,
      showSuccessStates: true,
      validateOnBlur: true,
      validateOnInput: false,
      ...options
    };

    // Disable browser validation and remove HTML validation attributes
    this.disableBrowserValidation(form, fieldConfigs);

    // Store form configuration
    form._phoenixValidator = {
      fieldConfigs,
      config,
      isValid: false
    };

    // Setup field validation
    this.setupFieldValidation(form, fieldConfigs, config);

    // Setup form submission handling
    if (config.preventSubmission) {
      this.setupFormSubmission(form, fieldConfigs);
    }

    // Initial validation state
    this.updateFormValidationState(form);
  }

  /**
   * Disable browser validation and remove HTML validation attributes
   */
  disableBrowserValidation(form, fieldConfigs) {
    // Add novalidate attribute to form
    form.setAttribute('novalidate', '');

    // Remove HTML validation attributes from all form fields
    fieldConfigs.forEach(fieldConfig => {
      const field = document.getElementById(fieldConfig.id);
      if (field) {
        // Remove HTML5 validation attributes
        field.removeAttribute('required');
        field.removeAttribute('pattern');
        field.removeAttribute('min');
        field.removeAttribute('max');
        field.removeAttribute('step');
        field.removeAttribute('minlength');
        field.removeAttribute('maxlength');
      }
    });

    // Also remove from any other form fields not in config
    const allFormFields = form.querySelectorAll('input, select, textarea');
    allFormFields.forEach(field => {
      field.removeAttribute('required');
      field.removeAttribute('pattern');
      field.removeAttribute('min');
      field.removeAttribute('max');
      field.removeAttribute('step');
      field.removeAttribute('minlength');
      field.removeAttribute('maxlength');
    });
  }

  /**
   * Setup validation for individual fields
   */
  setupFieldValidation(form, fieldConfigs, config) {
    fieldConfigs.forEach(fieldConfig => {
      const field = document.getElementById(fieldConfig.id);
      if (!field) {
        console.warn(`Field with ID '${fieldConfig.id}' not found`);
        return;
      }

      // Ensure error message element exists
      this.ensureErrorElement(field, fieldConfig);

      // Setup event listeners
      if (config.validateOnBlur) {
        field.addEventListener('blur', () => {
          this.validateField(field, fieldConfig);
          this.updateFormValidationState(form);
        });
      }

      if (config.validateOnInput) {
        field.addEventListener('input', () => {
          this.validateField(field, fieldConfig);
          this.updateFormValidationState(form);
        });
      }

      // Clear validation on focus
      field.addEventListener('focus', () => {
        this.clearFieldValidation(field);
      });

      // Special handling for select fields
      if (field.tagName === 'SELECT') {
        field.addEventListener('change', () => {
          this.validateField(field, fieldConfig);
          this.updateFormValidationState(form);
        });
      }
    });
  }

  /**
   * Ensure error message element exists for a field
   */
  ensureErrorElement(field, fieldConfig) {
    const formGroup = field.closest('.form-group, .form-group-modern, .form-group-signup');
    if (!formGroup) return;

    let errorElement = formGroup.querySelector('.error-message, .error-message-modern, .error-message-signup');
    
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = this.getErrorMessageClass(field);
      errorElement.id = `${fieldConfig.id}-error`;
      errorElement.style.display = 'none';
      
      // Insert after the field or its wrapper
      const insertAfter = field.closest('.input-wrapper-modern, .password-field-modern') || field;
      insertAfter.parentNode.insertBefore(errorElement, insertAfter.nextSibling);
    }

    // Set ARIA attributes for accessibility
    field.setAttribute('aria-describedby', errorElement.id);
    field.setAttribute('aria-invalid', 'false');
  }

  /**
   * Get appropriate error message class based on field context
   */
  getErrorMessageClass(field) {
    if (field.closest('.form-group-signup')) return 'error-message-signup';
    if (field.closest('.form-group-modern')) return 'error-message-modern';
    return 'error-message';
  }

  /**
   * Validate a single field
   */
  validateField(field, fieldConfig) {
    const value = field.value;
    const formGroup = field.closest('.form-group, .form-group-modern, .form-group-signup');
    const errorElement = formGroup?.querySelector('.error-message, .error-message-modern, .error-message-signup');

    let isValid = true;
    let errorMessage = '';

    // Check if field is required
    if (fieldConfig.required && !this.validationRules.required(value)) {
      isValid = false;
      errorMessage = this.errorMessages.required;
    }
    // Check specific validation rules
    else if (value.trim() && fieldConfig.rules) {
      for (const rule of fieldConfig.rules) {
        if (typeof rule === 'string' && this.validationRules[rule]) {
          if (!this.validationRules[rule](value, fieldConfig.compareWith)) {
            isValid = false;
            errorMessage = fieldConfig.customMessage || this.errorMessages[rule];
            break;
          }
        } else if (typeof rule === 'function') {
          const result = rule(value);
          if (!result.valid) {
            isValid = false;
            errorMessage = result.message;
            break;
          }
        }
      }
    }

    // Apply validation state
    this.applyValidationState(field, formGroup, errorElement, isValid, errorMessage);
    
    return isValid;
  }

  /**
   * Apply validation state to field
   */
  applyValidationState(field, formGroup, errorElement, isValid, errorMessage) {
    // Clear existing states
    field.classList.remove('is-valid', 'is-invalid');
    formGroup?.classList.remove('error', 'success');

    if (isValid) {
      // Only show success state if field has content
      if (field.value.trim()) {
        field.classList.add('is-valid');
        formGroup?.classList.add('success');
      }
      if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
      }
    } else {
      // Show error state for both empty required fields and invalid content
      field.classList.add('is-invalid');
      formGroup?.classList.add('error');
      if (errorElement) {
        errorElement.style.display = 'block';
        errorElement.textContent = errorMessage;
      }
    }

    // Update ARIA attributes
    field.setAttribute('aria-invalid', isValid ? 'false' : 'true');
  }

  /**
   * Clear validation state from field
   */
  clearFieldValidation(field) {
    const formGroup = field.closest('.form-group, .form-group-modern, .form-group-signup');
    const errorElement = formGroup?.querySelector('.error-message, .error-message-modern, .error-message-signup');

    field.classList.remove('is-valid', 'is-invalid');
    formGroup?.classList.remove('error', 'success');
    
    if (errorElement) {
      errorElement.style.display = 'none';
    }

    field.setAttribute('aria-invalid', 'false');
  }

  /**
   * Setup form submission handling
   */
  setupFormSubmission(form, fieldConfigs) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const isFormValid = this.validateAllFields(form, fieldConfigs);
      
      if (isFormValid) {
        // Allow form submission by calling original handler or submitting
        this.handleValidFormSubmission(form, e);
      } else {
        // Show validation summary or focus first invalid field
        this.handleInvalidFormSubmission(form, fieldConfigs);
      }
    });
  }

  /**
   * Validate all fields in a form
   */
  validateAllFields(form, fieldConfigs) {
    let allValid = true;

    fieldConfigs.forEach(fieldConfig => {
      const field = document.getElementById(fieldConfig.id);
      if (field) {
        const isValid = this.validateField(field, fieldConfig);
        if (!isValid) {
          allValid = false;
        }
      }
    });

    this.updateFormValidationState(form);
    return allValid;
  }

  /**
   * Update overall form validation state
   */
  updateFormValidationState(form) {
    if (!form._phoenixValidator) return;

    const { fieldConfigs } = form._phoenixValidator;
    let isFormValid = true;

    fieldConfigs.forEach(fieldConfig => {
      const field = document.getElementById(fieldConfig.id);
      if (field && fieldConfig.required && !field.value.trim()) {
        isFormValid = false;
      }
      if (field && field.classList.contains('is-invalid')) {
        isFormValid = false;
      }
    });

    form._phoenixValidator.isValid = isFormValid;

    // Update submit button state if it exists
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitBtn && form._phoenixValidator.config.disableSubmitUntilValid) {
      submitBtn.disabled = !isFormValid;
    }
  }

  /**
   * Handle valid form submission
   */
  handleValidFormSubmission(form, event) {
    // Check if form has a custom submit handler
    if (form._phoenixValidator.config.onValidSubmit) {
      form._phoenixValidator.config.onValidSubmit(form, event);
    } else {
      // Default behavior - submit the form
      form.submit();
    }
  }

  /**
   * Handle invalid form submission with enhanced error display
   */
  handleInvalidFormSubmission(form, fieldConfigs) {
    // Find first invalid field and focus it
    const firstInvalidField = fieldConfigs.find(config => {
      const field = document.getElementById(config.id);
      return field && (field.classList.contains('is-invalid') || (config.required && !field.value.trim()));
    });

    if (firstInvalidField) {
      const field = document.getElementById(firstInvalidField.id);
      field?.focus();
    }

    // Count actual validation errors (including empty required fields and invalid fields)
    const invalidCount = fieldConfigs.filter(config => {
      const field = document.getElementById(config.id);
      if (!field) return false;

      // Count as invalid if field has is-invalid class OR if it's required and empty
      return field.classList.contains('is-invalid') || (config.required && !field.value.trim());
    }).length;

    // Show appropriate error display based on configuration and error count
    if (form._phoenixValidator.config.showValidationSummary) {
      if (invalidCount > 3) {
        // Show detailed summary for many errors
        this.showValidationSummary(form, fieldConfigs);
      }
      // Remove toast notification for basic field validation errors
      // Inline error messages will be shown instead
    }

    // Show critical error for forms that require it
    if (form._phoenixValidator.config.showCriticalErrors && invalidCount > 0) {
      this.showCriticalError('Form Validation Failed', 'Please correct the highlighted fields and try again.');
    }
  }

  /**
   * Show validation summary with enhanced error display
   */
  showValidationSummary(form, fieldConfigs) {
    const invalidFields = fieldConfigs.filter(config => {
      const field = document.getElementById(config.id);
      if (!field) return false;

      // Include fields that are invalid OR required and empty
      return field.classList.contains('is-invalid') || (config.required && !field.value.trim());
    });

    if (invalidFields.length > 0 && window.Swal) {
      const errorList = invalidFields.map(config => {
        const field = document.getElementById(config.id);
        const formGroup = field.closest('.form-group, .form-group-modern, .form-group-signup');
        const errorElement = formGroup?.querySelector('.error-message, .error-message-modern, .error-message-signup');
        const fieldLabel = formGroup?.querySelector('label')?.textContent || config.id;

        // Get error message from element, or use default for empty required fields
        let errorMessage = errorElement?.textContent || 'Invalid value';
        if (config.required && !field.value.trim() && (!errorElement || !errorElement.textContent.trim())) {
          errorMessage = this.errorMessages.required;
        }

        return `• ${fieldLabel}: ${errorMessage}`;
      }).join('<br>');

      Swal.fire({
        icon: 'error',
        title: 'Please fix the following errors:',
        html: errorList,
        confirmButtonColor: '#ef4444',
        background: '#1e1e1e',
        color: '#ffffff',
        customClass: {
          popup: 'phoenix-validation-popup',
          title: 'phoenix-validation-title',
          content: 'phoenix-validation-content'
        }
      });
    }
  }

  /**
   * Show toast notification for validation errors
   */
  showValidationToast(message, type = 'error') {
    if (window.Swal) {
      Swal.fire({
        icon: type,
        title: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: type === 'error' ? '#2d1b1b' : '#1b2d1b',
        color: '#ffffff',
        customClass: {
          popup: 'phoenix-toast-popup'
        }
      });
    }
  }

  /**
   * Show critical validation error with SweetAlert2
   */
  showCriticalError(title, message) {
    if (window.Swal) {
      Swal.fire({
        icon: 'error',
        title: title,
        text: message,
        confirmButtonColor: '#ef4444',
        background: '#1e1e1e',
        color: '#ffffff',
        customClass: {
          popup: 'phoenix-critical-popup'
        }
      });
    }
  }

  /**
   * Show success notification
   */
  showSuccessNotification(title, message, isToast = false) {
    if (window.Swal) {
      const config = {
        icon: 'success',
        title: title,
        text: message,
        confirmButtonColor: '#10b981',
        background: '#1e1e1e',
        color: '#ffffff'
      };

      if (isToast) {
        Object.assign(config, {
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });
      }

      Swal.fire(config);
    }
  }

  /**
   * Validate a specific field by ID
   */
  validateFieldById(fieldId, formId) {
    const form = document.getElementById(formId);
    if (!form || !form._phoenixValidator) return false;

    const fieldConfig = form._phoenixValidator.fieldConfigs.find(config => config.id === fieldId);
    if (!fieldConfig) return false;

    const field = document.getElementById(fieldId);
    if (!field) return false;

    return this.validateField(field, fieldConfig);
  }

  /**
   * Check if form is valid
   */
  isFormValid(formId) {
    const form = document.getElementById(formId);
    return form?._phoenixValidator?.isValid || false;
  }

  /**
   * Reset form validation
   */
  resetFormValidation(formId) {
    const form = document.getElementById(formId);
    if (!form || !form._phoenixValidator) return;

    const { fieldConfigs } = form._phoenixValidator;

    fieldConfigs.forEach(fieldConfig => {
      const field = document.getElementById(fieldConfig.id);
      if (field) {
        this.clearFieldValidation(field);
      }
    });

    this.updateFormValidationState(form);
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(name, rule, errorMessage) {
    this.validationRules[name] = rule;
    this.errorMessages[name] = errorMessage;
  }

  /**
   * Quick setup for common form types
   */
  setupLoginForm(formId, options = {}) {
    const fieldConfigs = [
      { id: 'email', required: true, rules: ['email'] },
      { id: 'password', required: true, rules: ['password'] }
    ];

    this.initializeForm(formId, fieldConfigs, {
      validateOnBlur: true,
      showValidationSummary: true,
      ...options
    });
  }

  setupSignupForm(formId, options = {}) {
    const fieldConfigs = [
      { id: 'fullname', required: true, rules: ['fullname'] },
      { id: 'email', required: true, rules: ['email'] },
      { id: 'phone', required: true, rules: ['phone'] },
      { id: 'password', required: true, rules: ['password'] },
      { id: 'confirmpassword', required: true, rules: ['confirmPassword'], compareWith: 'password' }
    ];

    this.initializeForm(formId, fieldConfigs, {
      validateOnBlur: true,
      validateOnInput: true,
      showValidationSummary: true,
      ...options
    });
  }

  setupProductForm(formId, options = {}) {
    const fieldConfigs = [
      { id: 'productName', required: true, rules: ['productName'] },
      { id: 'brand', required: true, rules: ['brand'] },
      { id: 'category', required: true, rules: ['required'] },
      { id: 'regularPrice', required: true, rules: ['price'] },
      { id: 'quantity', required: true, rules: ['quantity'] },
      { id: 'productOffer', required: false, rules: ['percentage'] },
      { id: 'description', required: true, rules: ['description'] },
      { id: 'features', required: true, rules: ['features'] }
    ];

    this.initializeForm(formId, fieldConfigs, {
      validateOnBlur: true,
      validateOnInput: true,
      showValidationSummary: true,
      disableSubmitUntilValid: true,
      ...options
    });
  }

  setupProfileForm(formId, options = {}) {
    const fieldConfigs = [
      { id: 'fullname', required: true, rules: ['fullname'] },
      { id: 'email', required: true, rules: ['email'] },
      { id: 'phone', required: true, rules: ['phone'] }
    ];

    this.initializeForm(formId, fieldConfigs, {
      validateOnBlur: true,
      validateOnInput: true,
      showValidationSummary: true,
      ...options
    });
  }

  setupReviewForm(formId, options = {}) {
    const fieldConfigs = [
      { id: 'reviewTitle', required: true, rules: ['reviewTitle'] },
      { id: 'reviewComment', required: true, rules: ['reviewComment'] }
    ];

    this.initializeForm(formId, fieldConfigs, {
      validateOnBlur: true,
      showValidationSummary: true,
      ...options
    });
  }

  /**
   * Setup validation for shop filter form with price range validation
   */
  setupShopForm(formId, options = {}) {
    const fieldConfigs = [
      { id: 'minPriceInput', required: false, rules: ['minPrice'] },
      { id: 'maxPriceInput', required: false, rules: ['maxPrice'] }
    ];

    const defaultOptions = {
      preventSubmission: true,
      realTimeValidation: true,
      validateOnBlur: true,
      validateOnInput: true, // Enable real-time validation for price inputs
      showValidationSummary: false,
      disableSubmitUntilValid: false,
      ...options
    };

    this.initializeForm(formId, fieldConfigs, defaultOptions);

    // Add custom range validation
    this.setupPriceRangeValidation(formId);
  }

  /**
   * Setup custom price range validation (max >= min)
   */
  setupPriceRangeValidation(formId) {
    const form = document.getElementById(formId);
    const minPriceInput = document.getElementById('minPriceInput');
    const maxPriceInput = document.getElementById('maxPriceInput');

    if (!form || !minPriceInput || !maxPriceInput) return;

    const validatePriceRange = () => {
      const minPrice = parseFloat(minPriceInput.value) || 0;
      const maxPrice = parseFloat(maxPriceInput.value);

      // Only validate range if both fields have values
      if (minPriceInput.value && maxPriceInput.value && maxPrice < minPrice) {
        // Show range error on max price field
        const maxFormGroup = maxPriceInput.closest('.form-group');
        const maxErrorElement = maxFormGroup?.querySelector('.error-message');

        maxFormGroup?.classList.add('error');
        maxPriceInput.classList.add('is-invalid');
        if (maxErrorElement) {
          maxErrorElement.textContent = 'Maximum price must be greater than or equal to minimum price';
          maxErrorElement.style.display = 'block';
        }

        return false;
      } else {
        // Clear range error if it exists
        const maxFormGroup = maxPriceInput.closest('.form-group');
        const maxErrorElement = maxFormGroup?.querySelector('.error-message');

        // Only clear if the error is about range, not negative values
        if (maxErrorElement && maxErrorElement.textContent.includes('greater than or equal to')) {
          maxFormGroup?.classList.remove('error');
          maxPriceInput.classList.remove('is-invalid');
          maxErrorElement.style.display = 'none';
        }

        return true;
      }
    };

    // Add range validation to both inputs
    minPriceInput.addEventListener('input', validatePriceRange);
    maxPriceInput.addEventListener('input', validatePriceRange);
    minPriceInput.addEventListener('blur', validatePriceRange);
    maxPriceInput.addEventListener('blur', validatePriceRange);

    // Store range validation function for form submission
    if (form._phoenixValidator) {
      form._phoenixValidator.validatePriceRange = validatePriceRange;
    }
  }
}

// Create global instance
window.PhoenixValidator = new PhoenixFormValidator();

// Auto-initialize forms with data attributes
document.addEventListener('DOMContentLoaded', () => {
  // Add CSS styles for Phoenix validation popups
  const style = document.createElement('style');
  style.textContent = `
    .phoenix-validation-popup {
      background: var(--dark-bg-primary, #1e1e1e) !important;
      border: 1px solid var(--dark-border, #374151) !important;
    }

    .phoenix-validation-title {
      color: var(--error, #ef4444) !important;
      font-weight: 600 !important;
    }

    .phoenix-validation-content {
      color: var(--dark-text-primary, #ffffff) !important;
      text-align: left !important;
    }

    .phoenix-toast-popup {
      background: var(--dark-bg-secondary, #2d2d2d) !important;
      border: 1px solid var(--dark-border, #374151) !important;
    }

    .phoenix-critical-popup {
      background: var(--dark-bg-primary, #1e1e1e) !important;
      border: 2px solid var(--error, #ef4444) !important;
    }

    .swal2-popup.phoenix-validation-popup .swal2-html-container {
      color: var(--dark-text-primary, #ffffff) !important;
    }

    .swal2-popup.phoenix-toast-popup .swal2-title {
      color: var(--dark-text-primary, #ffffff) !important;
      font-size: 14px !important;
    }
  `;
  document.head.appendChild(style);

  // Auto-setup forms with data-phoenix-form attribute
  document.querySelectorAll('[data-phoenix-form]').forEach(form => {
    const formType = form.getAttribute('data-phoenix-form');
    const formId = form.id;

    if (!formId) return;

    switch (formType) {
      case 'login':
        window.PhoenixValidator.setupLoginForm(formId);
        break;
      case 'signup':
        window.PhoenixValidator.setupSignupForm(formId);
        break;
      case 'product':
        window.PhoenixValidator.setupProductForm(formId);
        break;
      case 'profile':
        window.PhoenixValidator.setupProfileForm(formId);
        break;
      case 'review':
        window.PhoenixValidator.setupReviewForm(formId);
        break;
    }
  });
});
