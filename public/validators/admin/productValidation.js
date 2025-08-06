
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('addProductForm');
  const submitButton = document.getElementById('addProductButton');

  if (form && submitButton && form.id === 'addProductForm') {
    setupFormSubmission(form, submitButton);

  }
});

function setupFormSubmission(form, submitButton) {
  const newSubmitButton = submitButton.cloneNode(true);
  submitButton.parentNode.replaceChild(newSubmitButton, submitButton);

  newSubmitButton.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    if (window.ProductRealTimeValidator) {
      const validationResult = window.ProductRealTimeValidator.validateForm(form);
      if (validationResult.isValid) {
        submitForm();
      } else {
        const firstError = form.querySelector('.is-invalid');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstError.focus();
        }
      }
    } else {
      if (validateForm()) {
        submitForm();
      }
    }

    return false;
  });
}

function validateForm() {
  const form = document.getElementById('addProductForm') || document.getElementById('editProductForm');
  
  clearAllErrors();
  
  const requiredFields = [
    { name: 'model', label: 'Model' },
    { name: 'brand', label: 'Brand' },
    { name: 'description', label: 'Description' },
    { name: 'category', label: 'Category' },
    { name: 'regularPrice', label: 'Regular Price' },
    { name: 'salePrice', label: 'Sale Price' },
    { name: 'stock', label: 'Stock' },
    { name: 'connectivity', label: 'Connectivity' },
    { name: 'manufacturer', label: 'Manufacturer' }
  ];
  
  if (form.id === 'addProductForm') {
    requiredFields.push({ name: 'mainImage', label: 'Main Image' });
  }
  
  let isValid = true;
  
  requiredFields.forEach(fieldInfo => {
    const field = form.querySelector(`[name="${fieldInfo.name}"]`);
    if (field) {
      let isEmpty = false;
      
      if (field.type === 'file') {
        isEmpty = !field.files || field.files.length === 0;
      } else {
        isEmpty = !field.value.trim();
      }
      
      if (isEmpty) {
        showFieldError(field, `${fieldInfo.label} is required`);
        isValid = false;
      }
    }
  });
  
  return isValid;
}

function showFieldError(field, message) {
  field.style.borderColor = '#dc3545';
  field.classList.add('is-invalid');
  
  let container = field.closest('.mb-3');
  if (!container) {
    container = field.closest('.file-upload-wrapper');
  }
  if (!container) {
    container = field.closest('.col-md-6');
  }
  if (!container) {
    container = field.parentElement;
  }
  
  if (container) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error-message';
    errorDiv.style.cssText = `
      display: block !important;
      color: #dc3545 !important;
      font-size: 0.875rem !important;
      margin-top: 0.25rem !important;
      font-weight: 500 !important;
    `;
    errorDiv.textContent = message;
    
    container.appendChild(errorDiv);
  }
}

function clearFieldError(field) {
  field.style.borderColor = '';
  field.classList.remove('is-invalid');
  
  let container = field.closest('.mb-3');
  if (!container) {
    container = field.closest('.file-upload-wrapper');
  }
  if (!container) {
    container = field.closest('.col-md-6');
  }
  if (!container) {
    container = field.parentElement;
  }
  
  if (container) {
    const errorMessage = container.querySelector('.validation-error-message');
    if (errorMessage) {
      errorMessage.remove();
    }
  }
}

function clearAllErrors() {
  const errorMessages = document.querySelectorAll('.validation-error-message');
  errorMessages.forEach(msg => msg.remove());
  
  const allFields = document.querySelectorAll('input, select, textarea');
  allFields.forEach(field => {
    field.style.borderColor = '';
    field.classList.remove('is-invalid');
  });
}

async function submitForm() {
  const form = document.getElementById('addProductForm') || document.getElementById('editProductForm');
  const submitButton = form.querySelector('[type="submit"]');
  
  if (submitButton) {
    submitButton.disabled = true;
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';
    submitButton.dataset.originalText = originalText;
  }
  
  try {
    const formData = new FormData(form);
    const isEdit = form.id === 'editProductForm';
    const productId = form.getAttribute('data-product-id');
    const url = isEdit ? `/admin/products/${productId}` : '/admin/products';
    
    if (isEdit) {
      formData.append('_method', 'PUT');
    }
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Success!',
          text: data.message || `Product ${isEdit ? 'updated' : 'added'} successfully`,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        }).then(() => {
          if (!isEdit) {
            form.reset();
            clearAllErrors();
          } else {
            window.location.href = '/admin/products';
          }
          
          if (data.redirect) {
            window.location.href = data.redirect;
          }
        });
      }
    } else {
      if (data.errors && typeof data.errors === 'object') {
        Object.keys(data.errors).forEach(fieldName => {
          const field = form.querySelector(`[name="${fieldName}"]`);
          if (field) {
            showFieldError(field, data.errors[fieldName]);
          }
        });
      } else if (data.message) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: data.message
          });
        }
      }
    }
  } catch (error) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while processing the request'
      });
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = submitButton.dataset.originalText || 'Submit';
    }
  }
}