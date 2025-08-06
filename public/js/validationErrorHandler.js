
class ValidationErrorHandler {
  constructor() {
    this.errorClass = 'is-invalid';
    this.validClass = 'is-valid';
    this.errorMessageClass = 'invalid-feedback';
  }

  displayFieldErrors(errors, formSelector = 'form') {
    const form = document.querySelector(formSelector);
    if (!form) return;

    this.clearAllErrors(form);

    if (Array.isArray(errors)) {
      this.displayGeneralErrors(errors);
    } else if (typeof errors === 'object') {
      Object.keys(errors).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`) || 
                     form.querySelector(`#${fieldName}`);
        if (field) {
          this.showFieldError(field, errors[fieldName]);
        }
      });
    }
  }

  showFieldError(field, message) {
    field.classList.add(this.errorClass);
    field.classList.remove(this.validClass);

    const formGroup = field.closest('.mb-3') ||
                     field.closest('.form-group') ||
                     field.closest('.col-md-6') ||
                     field.closest('.col-md-4') ||
                     field.parentElement;

    if (!formGroup) return;

    const existingError = formGroup.querySelector(`.${this.errorMessageClass}`);
    if (existingError) {
      existingError.remove();
    }

    const errorElement = document.createElement('div');
    errorElement.className = this.errorMessageClass;
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    errorElement.style.fontSize = '0.875rem';
    errorElement.style.marginTop = '0.25rem';
    errorElement.style.color = '#dc3545';
    errorElement.style.fontWeight = '500';

    try {
      formGroup.appendChild(errorElement);
    } catch (error) {
      // Error appending message
    }

    if (field.type === 'file') {
      const fileLabel = field.nextElementSibling;
      if (fileLabel && fileLabel.classList.contains('custom-file-label')) {
        fileLabel.style.borderColor = '#dc3545';
      }
    }
  }

  clearFieldError(field) {
    field.classList.remove(this.errorClass);

    const formGroup = field.closest('.mb-3') ||
                     field.closest('.form-group') ||
                     field.closest('.col-md-6') ||
                     field.closest('.col-md-4') ||
                     field.parentElement;

    if (!formGroup) return;

    const errorElement = formGroup.querySelector(`.${this.errorMessageClass}`);
    if (errorElement) {
      errorElement.remove();
    }

    if (field.type === 'file') {
      const fileLabel = field.nextElementSibling;
      if (fileLabel && fileLabel.classList.contains('custom-file-label')) {
        fileLabel.style.borderColor = '';
      }
    }
  }

  clearAllErrors(form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.classList.remove(this.errorClass);
      input.classList.remove(this.validClass);

      if (input.type === 'file') {
        const fileLabel = input.nextElementSibling;
        if (fileLabel && fileLabel.classList.contains('custom-file-label')) {
          fileLabel.style.borderColor = '';
        }
      }
    });

    const errorElements = form.querySelectorAll(`.${this.errorMessageClass}`);
    errorElements.forEach(element => {
      element.remove();
    });
  }

  displayGeneralErrors(errors) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        html: errors.map(error => `<p>${error}</p>`).join(''),
        confirmButtonText: 'OK'
      });
    } else {
      alert('Validation Errors:\n' + errors.join('\n'));
    }
  }

  async handleFormSubmission(form, url, options = {}) {
    const formData = new FormData(form);
    const submitButton = form.querySelector('[type="submit"]') || form.querySelector('.btn-primary');
    
    if (submitButton) {
      submitButton.disabled = true;
      const originalText = submitButton.innerHTML;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
      
      submitButton.dataset.originalText = originalText;
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'POST',
        body: options.fetchOptions?.body || formData,
        ...options.fetchOptions
      });

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
        if (options.onSuccess) {
          options.onSuccess(data);
        } else {
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
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = submitButton.dataset.originalText || 'Submit';
      }
    }
  }

  addRealTimeValidation(form, customValidators = {}) {
    const inputs = form.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        this.clearFieldError(input);
      });

      input.addEventListener('input', () => {
        clearTimeout(input.validationTimeout);
        input.validationTimeout = setTimeout(() => {
          if (input.value.trim() || input.hasAttribute('required')) {
            this.validateField(input, customValidators);
          }
        }, 300);
      });

      input.addEventListener('blur', () => {
        clearTimeout(input.validationTimeout);
        if (input.value.trim() || input.hasAttribute('required')) {
          this.validateField(input, customValidators);
        }
      });

      if (input.type === 'file') {
        input.addEventListener('change', () => {
          this.validateField(input, customValidators);
        });
      }
    });
  }

  validateField(field, customValidators = {}) {
    const value = field.value.trim();
    const fieldName = field.name || field.id;

    if (customValidators[fieldName]) {
      const customResult = customValidators[fieldName](field, value);
      if (customResult !== true) {
        this.showFieldError(field, customResult);
        return false;
      }
    }

    if (field.hasAttribute('required') && !value && field.type !== 'file') {
      this.showFieldError(field, `${this.getFieldLabel(field)} is required`);
      return false;
    }

    if (field.type === 'file' && field.hasAttribute('required')) {
      if (!field.files || field.files.length === 0) {
        this.showFieldError(field, `${this.getFieldLabel(field)} is required`);
        return false;
      }
    }

    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        this.showFieldError(field, 'Please enter a valid email address');
        return false;
      }
    }

    if (field.type === 'tel' && value) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(value.replace(/\D/g, ''))) {
        this.showFieldError(field, 'Please enter a valid phone number');
        return false;
      }
    }

    if (field.type === 'number' && value) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        this.showFieldError(field, 'Please enter a valid number');
        return false;
      }

      if (field.hasAttribute('min') && numValue < parseFloat(field.getAttribute('min'))) {
        this.showFieldError(field, `Value must be at least ${field.getAttribute('min')}`);
        return false;
      }

      if (field.hasAttribute('max') && numValue > parseFloat(field.getAttribute('max'))) {
        this.showFieldError(field, `Value must not exceed ${field.getAttribute('max')}`);
        return false;
      }
    }

    this.clearFieldError(field);
    return true;
  }

  getFieldLabel(field) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label) {
      return label.textContent.replace('*', '').trim();
    }
    
    return field.name || field.id || 'Field';
  }
}

window.ValidationErrorHandler = new ValidationErrorHandler();

document.addEventListener('DOMContentLoaded', function() {
  const formsWithValidation = document.querySelectorAll('form[data-validation="true"]');
  formsWithValidation.forEach(form => {
    window.ValidationErrorHandler.addRealTimeValidation(form);
  });
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ValidationErrorHandler;
}