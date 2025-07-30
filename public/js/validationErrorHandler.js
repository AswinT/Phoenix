/**
 * Unified Frontend Error Handling System
 * Handles backend validation errors and provides consistent error display
 */

class ValidationErrorHandler {
  constructor() {
    this.errorClass = 'is-invalid';
    this.validClass = 'is-valid';
    this.errorMessageClass = 'invalid-feedback';
  }

  /**
   * Display field-specific errors from backend validation
   * @param {Object} errors - Error object from backend response
   * @param {string} formSelector - CSS selector for the form
   */
  displayFieldErrors(errors, formSelector = 'form') {
    const form = document.querySelector(formSelector);
    if (!form) return;

    // Clear all existing errors first
    this.clearAllErrors(form);

    // Handle different error formats
    if (Array.isArray(errors)) {
      // Handle array of error messages
      this.displayGeneralErrors(errors);
    } else if (typeof errors === 'object') {
      // Handle field-specific errors object
      Object.keys(errors).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`) || 
                     form.querySelector(`#${fieldName}`);
        if (field) {
          this.showFieldError(field, errors[fieldName]);
        }
      });
    }
  }

  /**
   * Show error for a specific field
   * @param {HTMLElement} field - The input field element
   * @param {string} message - Error message to display
   */
  showFieldError(field, message) {
    // Clear any existing valid state
    field.classList.add(this.errorClass);
    field.classList.remove(this.validClass);

    // Find the appropriate container for the error message
    const formGroup = field.closest('.mb-3') ||
                     field.closest('.form-group') ||
                     field.closest('.col-md-6') ||
                     field.closest('.col-md-4') ||
                     field.parentElement;

    if (!formGroup) return;

    // Remove any existing error message for this field
    const existingError = formGroup.querySelector(`.${this.errorMessageClass}`);
    if (existingError) {
      existingError.remove();
    }

    // Create new error message element
    const errorElement = document.createElement('div');
    errorElement.className = this.errorMessageClass;
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    errorElement.style.fontSize = '0.875rem';
    errorElement.style.marginTop = '0.25rem';
    errorElement.style.color = '#dc3545';
    errorElement.style.fontWeight = '500';

    // Safely insert error message
    try {
      formGroup.appendChild(errorElement);
    } catch (error) {
      console.warn('Could not append error message:', error);
    }

    // Special handling for file inputs
    if (field.type === 'file') {
      const fileLabel = field.nextElementSibling;
      if (fileLabel && fileLabel.classList.contains('custom-file-label')) {
        fileLabel.style.borderColor = '#dc3545';
      }
    }
  }

  /**
   * Clear error for a specific field
   * @param {HTMLElement} field - The input field element
   */
  clearFieldError(field) {
    // Remove error classes
    field.classList.remove(this.errorClass);

    // Find the form group container
    const formGroup = field.closest('.mb-3') ||
                     field.closest('.form-group') ||
                     field.closest('.col-md-6') ||
                     field.closest('.col-md-4') ||
                     field.parentElement;

    if (!formGroup) return;

    // Remove error message
    const errorElement = formGroup.querySelector(`.${this.errorMessageClass}`);
    if (errorElement) {
      errorElement.remove();
    }

    // Special handling for file inputs
    if (field.type === 'file') {
      const fileLabel = field.nextElementSibling;
      if (fileLabel && fileLabel.classList.contains('custom-file-label')) {
        fileLabel.style.borderColor = '';
      }
    }
  }

  /**
   * Clear all errors in a form
   * @param {HTMLElement} form - The form element
   */
  clearAllErrors(form) {
    // Remove error classes from all inputs
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.classList.remove(this.errorClass);
      input.classList.remove(this.validClass);

      // Special handling for file inputs
      if (input.type === 'file') {
        const fileLabel = input.nextElementSibling;
        if (fileLabel && fileLabel.classList.contains('custom-file-label')) {
          fileLabel.style.borderColor = '';
        }
      }
    });

    // Remove all error messages completely
    const errorElements = form.querySelectorAll(`.${this.errorMessageClass}`);
    errorElements.forEach(element => {
      element.remove();
    });
  }

  /**
   * Display general errors (not field-specific)
   * @param {Array} errors - Array of error messages
   */
  displayGeneralErrors(errors) {
    if (typeof Swal !== 'undefined') {
      // Use SweetAlert if available
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        html: errors.map(error => `<p>${error}</p>`).join(''),
        confirmButtonText: 'OK'
      });
    } else {
      // Fallback to alert
      alert('Validation Errors:\n' + errors.join('\n'));
    }
  }

  /**
   * Handle AJAX form submission with validation
   * @param {HTMLFormElement} form - The form element
   * @param {string} url - Submit URL
   * @param {Object} options - Additional options
   */
  async handleFormSubmission(form, url, options = {}) {
    const formData = new FormData(form);
    const submitButton = form.querySelector('[type="submit"]') || form.querySelector('.btn-primary');
    
    // Disable submit button and show loading state
    if (submitButton) {
      submitButton.disabled = true;
      const originalText = submitButton.innerHTML;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
      
      // Store original text for restoration
      submitButton.dataset.originalText = originalText;
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'POST',
        body: options.fetchOptions?.body || formData,
        ...options.fetchOptions
      });

      // Check if response is HTML (likely an error page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Server returned HTML instead of JSON. This may indicate a server error or authentication issue.');
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error('Invalid JSON response from server');
      }

      if (response.ok && data.success) {
        // Success handling
        if (options.onSuccess) {
          options.onSuccess(data);
        } else {
          // Default success behavior
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: data.message || 'Operation completed successfully',
              timer: 2000,
              showConfirmButton: false
            });
          }
        }
      } else {
        // Handle authentication errors
        if (response.status === 401 || data.redirect) {
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'warning',
              title: 'Authentication Required',
              text: data.message || 'Please log in to continue',
              confirmButtonText: 'Go to Login'
            }).then(() => {
              window.location.href = data.redirect || '/admin/auth/login';
            });
          } else {
            window.location.href = data.redirect || '/admin/auth/login';
          }
          return;
        }

        // Error handling
        if (data.errors) {
          this.displayFieldErrors(data.errors, `#${form.id}`);
        } else if (data.message) {
          this.displayGeneralErrors([data.message]);
        }

        if (options.onError) {
          options.onError(data);
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        errorMessage = 'Network error: Please check your internet connection and try again.';
      } else if (error.message.includes('HTML instead of JSON')) {
        errorMessage = 'Server error: Please refresh the page and try again. If the problem persists, you may need to log in again.';
      } else if (error.message.includes('Invalid JSON')) {
        errorMessage = 'Server communication error: Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.displayGeneralErrors([errorMessage]);
      
      if (options.onError) {
        options.onError({ message: errorMessage });
      }
    } finally {
      // Restore submit button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = submitButton.dataset.originalText || 'Submit';
      }
    }
  }

  /**
   * Add real-time validation to form fields
   * @param {HTMLFormElement} form - The form element
   * @param {Object} customValidators - Custom validation rules for specific forms
   */
  addRealTimeValidation(form, customValidators = {}) {
    const inputs = form.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      // Clear errors on focus
      input.addEventListener('focus', () => {
        this.clearFieldError(input);
      });

      // Real-time validation on input for immediate feedback
      input.addEventListener('input', () => {
        // Debounce validation for better performance
        clearTimeout(input.validationTimeout);
        input.validationTimeout = setTimeout(() => {
          if (input.value.trim() || input.hasAttribute('required')) {
            this.validateField(input, customValidators);
          }
        }, 300);
      });

      // Validation on blur for comprehensive check
      input.addEventListener('blur', () => {
        clearTimeout(input.validationTimeout);
        if (input.value.trim() || input.hasAttribute('required')) {
          this.validateField(input, customValidators);
        }
      });

      // Special handling for file inputs
      if (input.type === 'file') {
        input.addEventListener('change', () => {
          this.validateField(input, customValidators);
        });
      }
    });
  }

  /**
   * Enhanced field validation with custom rules
   * @param {HTMLElement} field - The input field
   * @param {Object} customValidators - Custom validation rules
   */
  validateField(field, customValidators = {}) {
    const value = field.value.trim();
    const fieldName = field.name || field.id;

    // Check for custom validator first
    if (customValidators[fieldName]) {
      const customResult = customValidators[fieldName](field, value);
      if (customResult !== true) {
        this.showFieldError(field, customResult);
        return false;
      }
    }

    // Required field validation
    if (field.hasAttribute('required') && !value && field.type !== 'file') {
      this.showFieldError(field, `${this.getFieldLabel(field)} is required`);
      return false;
    }

    // File input validation
    if (field.type === 'file' && field.hasAttribute('required')) {
      if (!field.files || field.files.length === 0) {
        this.showFieldError(field, `${this.getFieldLabel(field)} is required`);
        return false;
      }
    }

    // Email validation
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        this.showFieldError(field, 'Please enter a valid email address');
        return false;
      }
    }

    // Phone validation
    if (field.type === 'tel' && value) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(value.replace(/\D/g, ''))) {
        this.showFieldError(field, 'Please enter a valid phone number');
        return false;
      }
    }

    // Number validation
    if (field.type === 'number' && value) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        this.showFieldError(field, 'Please enter a valid number');
        return false;
      }

      // Check min/max attributes
      if (field.hasAttribute('min') && numValue < parseFloat(field.getAttribute('min'))) {
        this.showFieldError(field, `Value must be at least ${field.getAttribute('min')}`);
        return false;
      }

      if (field.hasAttribute('max') && numValue > parseFloat(field.getAttribute('max'))) {
        this.showFieldError(field, `Value must not exceed ${field.getAttribute('max')}`);
        return false;
      }
    }

    // Clear error if validation passes
    this.clearFieldError(field);
    return true;
  }

  /**
   * Get field label for error messages
   * @param {HTMLElement} field - The input field
   * @returns {string} Field label
   */
  getFieldLabel(field) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label) {
      return label.textContent.replace('*', '').trim();
    }
    
    return field.name || field.id || 'Field';
  }
}

// Create global instance
window.ValidationErrorHandler = new ValidationErrorHandler();

// Auto-initialize for forms with data-validation attribute
document.addEventListener('DOMContentLoaded', function() {
  const formsWithValidation = document.querySelectorAll('form[data-validation="true"]');
  formsWithValidation.forEach(form => {
    window.ValidationErrorHandler.addRealTimeValidation(form);
  });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ValidationErrorHandler;
}