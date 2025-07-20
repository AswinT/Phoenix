function initializeValidation() {
  const errorHandler = window.ValidationErrorHandler;

  if (!errorHandler) {
    setTimeout(initializeValidation, 100);
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupValidation(errorHandler));
  } else {
    setupValidation(errorHandler);
  }
}

function setupValidation(errorHandler) {

  function setupAdminFormValidation() {
    const productForms = document.querySelectorAll('#addProductForm, #editProductForm');

    productForms.forEach(form => {
      setupProductFormValidation(form);
    });

    const offerForms = document.querySelectorAll('#addOfferForm, #editOfferForm');
    offerForms.forEach(form => {
      setupOfferFormValidation(form);
    });

    const couponForms = document.querySelectorAll('#addCouponForm, #editCouponForm');
    couponForms.forEach(form => {
      setupCouponFormValidation(form);
    });
  }

  function setupProductFormValidation(form) {
    if (!form) return;

    const isEditForm = form.id === 'editProductForm';

    errorHandler.addRealTimeValidation(form);

    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      const validationResult = validateProductForm(form);

      if (!validationResult.isValid) {
        displayClientSideErrors(form, validationResult.errors);
        return;
      }

      errorHandler.clearAllErrors(form);

      const url = isEditForm
        ? `/admin/products/${form.getAttribute('data-product-id')}`
        : '/admin/products';

      await errorHandler.handleFormSubmission(form, url, {
        method: 'POST',
        fetchOptions: {
          body: (() => {
            const formData = new FormData(form);
            if (isEditForm) {
              formData.append('_method', 'PUT');
            }
            return formData;
          })()
        },
        onSuccess: (data) => {
          if (isEditForm) {
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: 'Product updated successfully',
              timer: 2000,
              showConfirmButton: false
            }).then(() => {
              if (data.redirect) {
                window.location.href = data.redirect;
              }
            });
          } else {
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: 'Product added successfully!',
              timer: 2000,
              showConfirmButton: false
            }).then(() => {
              window.location.href = '/admin/getProducts';
            });
          }
        }
      });
    });

    addProductValidationHints(form);
  }

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

  function addProductValidationHints(form) {
    const modelField = form.querySelector('#model');
    if (modelField) {
      addFieldHint(modelField, '3-100 characters, alphanumeric with basic punctuation');
    }

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

  function addCouponValidationHints(form) {
    const couponCodeFields = form.querySelectorAll('[name="couponCode"], #couponCode, #editCouponCode');
    couponCodeFields.forEach(couponCode => {
      if (couponCode) {
        couponCode.addEventListener('input', function() {
          this.value = this.value.toUpperCase();
        });
        addFieldHint(couponCode, 'Use uppercase letters, numbers, hyphens, and underscores only');
      }
    });

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

  function clearFieldHint(field) {
    const formGroup = field.closest('.mb-3') || field.closest('.form-group') || field.parentElement;
    const hintElement = formGroup.querySelector('.temp-hint');
    
    if (hintElement) {
      hintElement.remove();
    }
  }

  function validateProductForm(form) {
    const errors = {};
    let isValid = true;

    const addError = (fieldName, message) => {
      errors[fieldName] = message;
      isValid = false;
    };

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

    if (!values.model) {
      addError('model', 'Model is required');
    } else if (values.model.length < 3) {
      addError('model', 'Model must be at least 3 characters long');
    } else if (values.model.length > 100) {
      addError('model', 'Model must not exceed 100 characters');
    } else if (!/^[a-zA-Z0-9\s\-:,.'&()]+$/.test(values.model)) {
      addError('model', 'Model contains invalid characters');
    }

    if (!values.brand) {
      addError('brand', 'Brand is required');
    } else if (values.brand.length < 2) {
      addError('brand', 'Brand must be at least 2 characters long');
    } else if (values.brand.length > 50) {
      addError('brand', 'Brand must not exceed 50 characters');
    }

    if (!values.description) {
      addError('description', 'Description is required');
    } else if (values.description.length < 20) {
      addError('description', 'Description must be at least 20 characters long');
    } else if (values.description.length > 2000) {
      addError('description', 'Description must not exceed 2000 characters');
    }

    if (!values.category) {
      addError('category', 'Category is required');
    }

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

    if (!values.connectivity) {
      addError('connectivity', 'Connectivity type is required');
    } else {
      const allowedValues = ['Wired', 'Wireless'];
      if (!allowedValues.includes(values.connectivity)) {
        addError('connectivity', 'Connectivity must be either "Wired" or "Wireless"');
      }
    }

    if (!values.manufacturer) {
      addError('manufacturer', 'Manufacturer is required');
    } else if (values.manufacturer.length < 2) {
      addError('manufacturer', 'Manufacturer must be at least 2 characters long');
    } else if (values.manufacturer.length > 50) {
      addError('manufacturer', 'Manufacturer must not exceed 50 characters');
    }

    if (!values.mainImage || values.mainImage.size === 0) {
      addError('mainImage', 'Main image is required');
    } else {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(values.mainImage.type)) {
        addError('mainImage', 'Main image must be a valid image file (JPEG, PNG, GIF, WebP)');
      }
      else if (values.mainImage.size > 5 * 1024 * 1024) {
        addError('mainImage', 'Main image must be smaller than 5MB');
      }
    }

    return { isValid, errors };
  }

  function displayClientSideErrors(form, errors) {
    errorHandler.clearAllErrors(form);

    Object.keys(errors).forEach(fieldName => {
      const field = form.querySelector(`[name="${fieldName}"]`) ||
                   form.querySelector(`#${fieldName}`);
      if (field) {
        errorHandler.showFieldError(field, errors[fieldName]);
      }
    });

    const firstErrorField = form.querySelector('.is-invalid');
    if (firstErrorField) {
      firstErrorField.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      firstErrorField.focus();
    }

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

  setupAdminFormValidation();
}

initializeValidation();