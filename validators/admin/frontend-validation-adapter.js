/**
 * Frontend Validation Adapter
 * Provides UX-focused frontend validation that works alongside backend validation
 * This replaces the blocking frontend validation with helpful hints and real-time feedback
 */

// Function to initialize validation when everything is ready
function initializeValidation() {
  // Check if ValidationErrorHandler is available
  const errorHandler = window.ValidationErrorHandler;

  if (!errorHandler) {
    setTimeout(initializeValidation, 100);
    return;
  }

  // Check if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupValidation(errorHandler));
  } else {
    setupValidation(errorHandler);
  }
}

function setupValidation(errorHandler) {

  /**
   * Enhanced form submission handler for admin forms
   */
  function setupAdminFormValidation() {
    // Product forms
    const productForms = document.querySelectorAll('#addProductForm, #editProductForm');

    productForms.forEach(form => {
      setupProductFormValidation(form);
    });

    // Offer forms
    const offerForms = document.querySelectorAll('#addOfferForm, #editOfferForm');
    offerForms.forEach(form => {
      setupOfferFormValidation(form);
    });

    // Coupon forms
    const couponForms = document.querySelectorAll('#addCouponForm, #editCouponForm');
    couponForms.forEach(form => {
      setupCouponFormValidation(form);
    });
  }

  /**
   * Setup product form validation
   */
  function setupProductFormValidation(form) {
    if (!form) return;

    const isEditForm = form.id === 'editProductForm';

    // Add real-time validation
    errorHandler.addRealTimeValidation(form);

    // Override form submission
    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      // Perform comprehensive client-side validation before submission
      const validationResult = validateProductForm(form);

      if (!validationResult.isValid) {
        // Display validation errors and prevent submission
        displayClientSideErrors(form, validationResult.errors);
        return;
      }

      // Clear any existing client-side errors before server submission
      errorHandler.clearAllErrors(form);

      const url = isEditForm
        ? `/admin/products/${form.getAttribute('data-product-id')}`
        : '/admin/products';

      await errorHandler.handleFormSubmission(form, url, {
        method: 'POST', // Always POST with method override
        fetchOptions: {
          // Add method override for PUT requests
          body: (() => {
            const formData = new FormData(form);
            if (isEditForm) {
              formData.append('_method', 'PUT');
            }
            return formData;
          })()
        },
        onSuccess: (data) => {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: `Product ${isEditForm ? 'updated' : 'added'} successfully`,
            timer: 2000,
            showConfirmButton: false
          }).then(() => {
            if (!isEditForm) {
              form.reset();
              // Clear any validation states after reset
              errorHandler.clearAllErrors(form);
            }
            // Optionally redirect or refresh
            if (data.redirect) {
              window.location.href = data.redirect;
            }
          });
        }
      });
    });

    // Add specific validation hints for product fields
    addProductValidationHints(form);

    // Also add click event listener to submit button as backup
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.addEventListener('click', function(e) {
        // Prevent default form submission
        e.preventDefault();

        // Trigger form submit event (which should be handled by our submit listener)
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      });
    }
  }

  /**
   * Setup offer form validation
   */
  function setupOfferFormValidation(form) {
    if (!form) return;

    const isEditForm = form.id === 'editOfferForm';
    
    errorHandler.addRealTimeValidation(form);

    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      const url = isEditForm 
        ? `/admin/offers/${form.getAttribute('data-offer-id')}`
        : '/admin/offers';

      await errorHandler.handleFormSubmission(form, url, {
        method: isEditForm ? 'PUT' : 'POST',
        onSuccess: (data) => {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: `Offer ${isEditForm ? 'updated' : 'created'} successfully`,
            timer: 2000,
            showConfirmButton: false
          }).then(() => {
            if (!isEditForm) {
              form.reset();
            }
            if (data.redirect) {
              window.location.href = data.redirect;
            }
          });
        }
      });
    });

    addOfferValidationHints(form);
  }

  /**
   * Setup coupon form validation
   */
  function setupCouponFormValidation(form) {
    if (!form) return;

    const isEditForm = form.id === 'editCouponForm';
    
    errorHandler.addRealTimeValidation(form);

    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      const url = isEditForm 
        ? `/admin/coupons/${form.getAttribute('data-coupon-id')}`
        : '/admin/coupons';

      await errorHandler.handleFormSubmission(form, url, {
        method: isEditForm ? 'PUT' : 'POST',
        onSuccess: (data) => {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: `Coupon ${isEditForm ? 'updated' : 'created'} successfully`,
            timer: 2000,
            showConfirmButton: false
          }).then(() => {
            if (!isEditForm) {
              form.reset();
            }
            if (data.redirect) {
              window.location.href = data.redirect;
            }
          });
        }
      });
    });

    addCouponValidationHints(form);
  }

  /**
   * Add validation hints for product fields
   */
  function addProductValidationHints(form) {
    // Model field hints
    const modelField = form.querySelector('#model');
    if (modelField) {
      addFieldHint(modelField, '3-100 characters, alphanumeric with basic punctuation');
    }

    // Price comparison hints
    const regularPrice = form.querySelector('#regularPrice');
    const salePrice = form.querySelector('#salePrice');
    
    if (regularPrice && salePrice) {
      salePrice.addEventListener('input', function() {
        const regPrice = parseFloat(regularPrice.value);
        const salePriceVal = parseFloat(this.value);
        
        if (!isNaN(regPrice) && !isNaN(salePriceVal)) {
          if (salePriceVal > regPrice) {
            showFieldHint(this, 'Sale price should be less than regular price', 'warning');
          } else if (salePriceVal < regPrice * 0.1) {
            showFieldHint(this, 'Sale price seems too low (less than 10% of regular price)', 'warning');
          } else {
            clearFieldHint(this);
          }
        }
      });
    }
  }

  /**
   * Add validation hints for offer fields
   */
  function addOfferValidationHints(form) {
    const discountValue = form.querySelector('[name="discountValue"]');
    const discountType = form.querySelector('[name="discountType"]');
    
    if (discountValue && discountType) {
      function updateDiscountHint() {
        const type = discountType.value;
        const value = parseFloat(discountValue.value);
        
        if (type === 'percentage' && value > 50) {
          showFieldHint(discountValue, 'High percentage discounts may require approval', 'info');
        } else if (type === 'fixed' && value > 5000) {
          showFieldHint(discountValue, 'Large fixed discounts may require approval', 'info');
        } else {
          clearFieldHint(discountValue);
        }
      }
      
      discountValue.addEventListener('input', updateDiscountHint);
      discountType.addEventListener('change', updateDiscountHint);
    }
  }

  /**
   * Add validation hints for coupon fields
   */
  function addCouponValidationHints(form) {
    const couponCode = form.querySelector('[name="couponCode"]');
    if (couponCode) {
      couponCode.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
      });
      addFieldHint(couponCode, 'Use uppercase letters, numbers, hyphens, and underscores only');
    }

    // Usage limit hints
    const globalLimit = form.querySelector('[name="usageLimitGlobal"]');
    const perUserLimit = form.querySelector('[name="usageLimitPerUser"]');
    
    if (globalLimit && perUserLimit) {
      function validateUsageLimits() {
        const global = parseInt(globalLimit.value);
        const perUser = parseInt(perUserLimit.value);
        
        if (!isNaN(global) && !isNaN(perUser) && global < perUser) {
          showFieldHint(globalLimit, 'Global limit should be greater than or equal to per user limit', 'warning');
        } else {
          clearFieldHint(globalLimit);
        }
      }
      
      globalLimit.addEventListener('input', validateUsageLimits);
      perUserLimit.addEventListener('input', validateUsageLimits);
    }
  }

  /**
   * Add a hint below a field
   */
  function addFieldHint(field, hintText) {
    const formGroup = field.closest('.mb-3') || field.closest('.form-group') || field.parentElement;
    let hintElement = formGroup.querySelector('.field-hint');
    
    if (!hintElement) {
      hintElement = document.createElement('small');
      hintElement.className = 'field-hint text-muted mt-1';
      hintElement.style.display = 'block';
      formGroup.appendChild(hintElement);
    }
    
    hintElement.textContent = hintText;
  }

  /**
   * Show a temporary hint with different styles
   */
  function showFieldHint(field, message, type = 'info') {
    const formGroup = field.closest('.mb-3') || field.closest('.form-group') || field.parentElement;
    let hintElement = formGroup.querySelector('.temp-hint');
    
    if (!hintElement) {
      hintElement = document.createElement('small');
      hintElement.className = 'temp-hint mt-1';
      hintElement.style.display = 'block';
      formGroup.appendChild(hintElement);
    }
    
    hintElement.textContent = message;
    hintElement.className = `temp-hint mt-1 text-${type === 'warning' ? 'warning' : 'info'}`;
  }

  /**
   * Clear temporary hint
   */
  function clearFieldHint(field) {
    const formGroup = field.closest('.mb-3') || field.closest('.form-group') || field.parentElement;
    const hintElement = formGroup.querySelector('.temp-hint');
    
    if (hintElement) {
      hintElement.remove();
    }
  }

  /**
   * Comprehensive client-side validation for product form
   * @param {HTMLFormElement} form - The product form to validate
   * @returns {Object} - { isValid: boolean, errors: Object }
   */
  function validateProductForm(form) {
    const errors = {};
    let isValid = true;

    // Helper function to add error
    const addError = (fieldName, message) => {
      errors[fieldName] = message;
      isValid = false;
    };

    // Get form values
    const formData = new FormData(form);
    const values = {
      model: formData.get('model')?.trim() || '',
      brand: formData.get('brand')?.trim() || '',
      description: formData.get('description')?.trim() || '',
      category: formData.get('category') || '',
      regularPrice: formData.get('regularPrice')?.trim() || '',
      salePrice: formData.get('salePrice')?.trim() || '',
      stock: formData.get('stock')?.trim() || '',
      connectivity: formData.get('connectivity')?.trim() || '',
      manufacturer: formData.get('manufacturer')?.trim() || '',
      mainImage: formData.get('mainImage')
    };

    // 1. Model validation
    if (!values.model) {
      addError('model', 'Model is required');
    } else if (values.model.length < 3) {
      addError('model', 'Model must be at least 3 characters long');
    } else if (values.model.length > 100) {
      addError('model', 'Model must not exceed 100 characters');
    } else if (!/^[a-zA-Z0-9\s\-:,.'&()]+$/.test(values.model)) {
      addError('model', 'Model contains invalid characters');
    }

    // 2. Brand validation
    if (!values.brand) {
      addError('brand', 'Brand is required');
    } else if (values.brand.length < 2) {
      addError('brand', 'Brand must be at least 2 characters long');
    } else if (values.brand.length > 50) {
      addError('brand', 'Brand must not exceed 50 characters');
    }

    // 3. Description validation
    if (!values.description) {
      addError('description', 'Description is required');
    } else if (values.description.length < 20) {
      addError('description', 'Description must be at least 20 characters long');
    } else if (values.description.length > 2000) {
      addError('description', 'Description must not exceed 2000 characters');
    }

    // 4. Category validation
    if (!values.category) {
      addError('category', 'Category is required');
    }

    // 5. Regular Price validation
    if (!values.regularPrice) {
      addError('regularPrice', 'Regular Price is required');
    } else {
      const regPrice = parseFloat(values.regularPrice);
      if (isNaN(regPrice) || regPrice <= 0) {
        addError('regularPrice', 'Regular Price must be a valid positive number');
      } else if (regPrice > 1000000) {
        addError('regularPrice', 'Regular Price must not exceed 1,000,000');
      }
    }

    // 6. Sale Price validation
    if (!values.salePrice) {
      addError('salePrice', 'Sale Price is required');
    } else {
      const salePrice = parseFloat(values.salePrice);
      const regPrice = parseFloat(values.regularPrice);
      if (isNaN(salePrice) || salePrice <= 0) {
        addError('salePrice', 'Sale Price must be a valid positive number');
      } else if (salePrice > 1000000) {
        addError('salePrice', 'Sale Price must not exceed 1,000,000');
      } else if (!isNaN(regPrice) && salePrice >= regPrice) {
        addError('salePrice', 'Sale Price must be less than Regular Price');
      }
    }

    // 7. Stock validation
    if (!values.stock) {
      addError('stock', 'Stock is required');
    } else {
      const stock = parseInt(values.stock);
      if (isNaN(stock) || stock < 0) {
        addError('stock', 'Stock must be a valid non-negative number');
      } else if (stock > 10000) {
        addError('stock', 'Stock must not exceed 10,000');
      }
    }

    // 8. Connectivity validation
    if (!values.connectivity) {
      addError('connectivity', 'Connectivity type is required');
    } else {
      const allowedValues = ['Wired', 'Wireless'];
      if (!allowedValues.includes(values.connectivity)) {
        addError('connectivity', 'Connectivity must be either "Wired" or "Wireless"');
      }
    }

    // 9. Manufacturer validation
    if (!values.manufacturer) {
      addError('manufacturer', 'Manufacturer is required');
    } else if (values.manufacturer.length < 2) {
      addError('manufacturer', 'Manufacturer must be at least 2 characters long');
    } else if (values.manufacturer.length > 50) {
      addError('manufacturer', 'Manufacturer must not exceed 50 characters');
    }

    // 10. Main Image validation
    if (!values.mainImage || values.mainImage.size === 0) {
      addError('mainImage', 'Main image is required');
    } else {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(values.mainImage.type)) {
        addError('mainImage', 'Main image must be a valid image file (JPEG, PNG, GIF, WebP)');
      }
      // Validate file size (5MB limit)
      else if (values.mainImage.size > 5 * 1024 * 1024) {
        addError('mainImage', 'Main image must be smaller than 5MB');
      }
    }



    return { isValid, errors };
  }

  /**
   * Display client-side validation errors
   * @param {HTMLFormElement} form - The form element
   * @param {Object} errors - Object with field names as keys and error messages as values
   */
  function displayClientSideErrors(form, errors) {
    // Clear all existing errors first
    errorHandler.clearAllErrors(form);

    // Display each error
    Object.keys(errors).forEach(fieldName => {
      const field = form.querySelector(`[name="${fieldName}"]`) ||
                   form.querySelector(`#${fieldName}`);
      if (field) {
        errorHandler.showFieldError(field, errors[fieldName]);
      }
    });

    // Scroll to first error field
    const firstErrorField = form.querySelector('.is-invalid');
    if (firstErrorField) {
      firstErrorField.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      firstErrorField.focus();
    }

    // Show summary notification
    const errorCount = Object.keys(errors).length;
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: `Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} before submitting the form.`,
        confirmButtonText: 'OK'
      });
    }
  }

  // Initialize validation
  setupAdminFormValidation();
}

// Start the initialization process
initializeValidation();
