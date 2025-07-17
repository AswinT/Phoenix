/**
 * Frontend Product Validation Script
 * Integrates with the existing validation system to provide SweetAlert2 success messages
 * for admin product edit functionality
 */

// Wait for DOM and dependencies to load
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 Product validation script loaded');
  
  // Wait for ValidationErrorHandler to be available
  function waitForDependencies() {
    if (typeof window.ValidationErrorHandler === 'undefined' || typeof Swal === 'undefined') {
      console.log('⏳ Waiting for dependencies...');
      setTimeout(waitForDependencies, 100);
      return;
    }
    
    console.log('✅ Dependencies loaded, initializing product validation');
    initializeProductValidation();
  }
  
  waitForDependencies();
});

function initializeProductValidation() {
  const errorHandler = window.ValidationErrorHandler;
  
  // Find the product form (both add and edit)
  const addProductForm = document.getElementById('addProductForm');
  const editProductForm = document.getElementById('editProductForm');
  
  if (addProductForm) {
    console.log('🆕 Setting up add product form validation');
    setupProductFormValidation(addProductForm, false, errorHandler);
  }
  
  if (editProductForm) {
    console.log('✏️ Setting up edit product form validation');
    setupProductFormValidation(editProductForm, true, errorHandler);
  }
}

function setupProductFormValidation(form, isEditForm, errorHandler) {
  if (!form) {
    console.error('❌ Product form not found');
    return;
  }
  
  console.log(`🔧 Setting up ${isEditForm ? 'edit' : 'add'} product form validation`);
  
  // Add real-time validation
  errorHandler.addRealTimeValidation(form);
  
  // Override form submission
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log(`📤 ${isEditForm ? 'Edit' : 'Add'} product form submitted`);
    
    // Perform client-side validation if available
    if (typeof validateProductForm === 'function') {
      const validationResult = validateProductForm(form);
      
      if (!validationResult.isValid) {
        console.log('❌ Client-side validation failed');
        displayClientSideErrors(form, validationResult.errors);
        return;
      }
    }
    
    // Clear any existing client-side errors
    errorHandler.clearAllErrors(form);
    
    // Determine the URL and method
    const url = isEditForm
      ? `/admin/products/${form.getAttribute('data-product-id')}`
      : '/admin/products';
    
    console.log(`🌐 Submitting to: ${url}`);
    
    // Handle form submission with proper success message
    await errorHandler.handleFormSubmission(form, url, {
      method: 'POST', // Always POST with method override
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
        console.log('✅ Product operation successful:', data);
        console.log('🎯 Showing SUCCESS toast notification');

        // Show SweetAlert2 SUCCESS toast notification
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Success!',
          text: data.message || `Product ${isEditForm ? 'updated' : 'added'} successfully`,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: '#fff',
          color: '#333',
          iconColor: '#28a745'
        }).then(() => {
          // Reset form for add operations
          if (!isEditForm) {
            form.reset();
            errorHandler.clearAllErrors(form);
            console.log('🔄 Form reset after successful add');
          } else {
            console.log('✏️ Edit form kept with updated data');
          }
          
          // Handle redirect if provided
          if (data.redirect) {
            console.log('🔄 Redirecting to:', data.redirect);
            window.location.href = data.redirect;
          }
        });
      },
      onError: (error) => {
        console.error('❌ Product operation failed:', error);
        console.log('🚨 Showing ERROR toast notification');

        // Show ERROR toast notification
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'error',
          title: 'Error!',
          text: error.message || 'An error occurred while processing the request',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          background: '#fff',
          color: '#333',
          iconColor: '#dc3545'
        });
      }
    });
  });
  
  console.log(`✅ ${isEditForm ? 'Edit' : 'Add'} product form validation setup complete`);
}

// Helper function for client-side validation errors (if needed)
function displayClientSideErrors(form, errors) {
  console.log('🚨 Displaying client-side errors:', errors);
  
  // Show validation errors using SweetAlert2
  Swal.fire({
    icon: 'warning',
    title: 'Validation Error',
    html: errors.map(error => `• ${error}`).join('<br>'),
    confirmButtonText: 'Fix Issues',
    confirmButtonColor: '#6f42c1'
  });
}

// Basic product form validation function (can be enhanced)
function validateProductForm(form) {
  const errors = [];
  
  // Check required fields
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
  
  requiredFields.forEach(field => {
    const input = form.querySelector(`[name="${field.name}"]`);
    if (!input || !input.value.trim()) {
      errors.push(`${field.label} is required`);
    }
  });
  
  // Validate price comparison
  const regularPrice = parseFloat(form.querySelector('[name="regularPrice"]')?.value);
  const salePrice = parseFloat(form.querySelector('[name="salePrice"]')?.value);
  
  if (!isNaN(regularPrice) && !isNaN(salePrice)) {
    if (salePrice > regularPrice) {
      errors.push('Sale price cannot be greater than regular price');
    }
    if (salePrice < regularPrice * 0.1) {
      errors.push('Sale price cannot be less than 10% of regular price');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

console.log('📝 Product validation script initialized');
