document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('editProductForm');
  const submitButton = document.getElementById('updateProductButton');
  
  if (form && submitButton) {
    const newSubmitButton = submitButton.cloneNode(true);
    submitButton.parentNode.replaceChild(newSubmitButton, submitButton);
    
    newSubmitButton.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (!validateEditForm(form)) {
        return;
      }
      
      newSubmitButton.disabled = true;
      newSubmitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Updating...';
      
      try {
        const formData = new FormData(form);
        const productId = form.getAttribute('data-product-id');
        
        formData.append('_method', 'PUT');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 30000); // 30 second timeout
        
        const response = await fetch(`/admin/products/${productId}`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const contentType = response.headers.get('content-type');
        
        let data;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const textData = await response.text();
          
          if (textData.includes('<html') || textData.includes('<!DOCTYPE')) {
            throw new Error('Server returned HTML page instead of JSON. This might be an authentication error or server error.');
          } else {
            throw new Error('Server returned non-JSON response: ' + textData.substring(0, 200));
          }
        }
        
        if (response.ok && data.success) {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Success!',
            text: data.message || 'Product updated successfully',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
          }).then(() => {
            window.location.href = '/admin/products';
          });
        } else {
          if (data.errors && typeof data.errors === 'object') {
            Object.keys(data.errors).forEach(fieldName => {
              const field = form.querySelector(`[name="${fieldName}"]`);
              if (field) {
                showFieldError(field, data.errors[fieldName]);
              }
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Update Failed',
              text: data.message || 'An error occurred while updating the product'
            });
          }
        }
      } catch (error) {
        let errorMessage = 'An unexpected error occurred.';
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. The server might be overloaded. Please try again.';
        } else if (error.message.includes('HTML page')) {
          errorMessage = 'Authentication error. Please refresh the page and log in again.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = error.message || 'Failed to connect to server.';
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage
        });
      } finally {
        newSubmitButton.disabled = false;
        newSubmitButton.innerHTML = 'Update Product';
      }
    });
  }
});

function validateEditForm(form) {
  clearAllFormErrors(form);
  
  let isValid = true;
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
  
  requiredFields.forEach(fieldInfo => {
    const field = form.querySelector(`[name="${fieldInfo.name}"]`);
    if (field && !field.value.trim()) {
      showFieldError(field, `${fieldInfo.label} is required`);
      isValid = false;
    }
  });
  
  const regularPrice = parseFloat(form.querySelector('[name="regularPrice"]').value);
  const salePrice = parseFloat(form.querySelector('[name="salePrice"]').value);
  
  if (!isNaN(regularPrice) && !isNaN(salePrice)) {
    if (salePrice >= regularPrice) {
      showFieldError(form.querySelector('[name="salePrice"]'), 'Sale price must be less than regular price');
      isValid = false;
    }
  }
  
  return isValid;
}

function showFieldError(field, message) {
  field.classList.add('is-invalid');
  
  const container = field.closest('.mb-3') || field.parentElement;
  if (container) {
    const existingError = container.querySelector('.invalid-feedback');
    if (existingError) {
      existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.style.display = 'block';
    errorDiv.textContent = message;
    container.appendChild(errorDiv);
  }
}

function clearAllFormErrors(form) {
  const fields = form.querySelectorAll('.is-invalid');
  fields.forEach(field => field.classList.remove('is-invalid'));
  
  const errors = form.querySelectorAll('.invalid-feedback');
  errors.forEach(error => error.remove());
}