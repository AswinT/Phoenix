
class ProductRealTimeValidator {
  constructor() {
    this.errorHandler = window.ValidationErrorHandler;
    this.validationRules = this.createValidationRules();
    this.debounceTimers = new Map();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      const productForm = document.getElementById('addProductForm') || document.getElementById('editProductForm');
      if (productForm) {
        this.setupProductValidation(productForm);
      }
    });
  }

  setupProductValidation(form) {
    this.errorHandler.addRealTimeValidation(form, this.validationRules);
    
    this.setupCrossFieldValidation(form);
    
    this.addCharacterCounters(form);
  }

  createValidationRules() {
    return {
      model: (field, value) => {
        if (!value) return 'Model is required';
        if (value.length < 3) return 'Model must be at least 3 characters long';
        if (value.length > 100) return 'Model must not exceed 100 characters';
        if (!/^[a-zA-Z0-9\s\-:,.'&()]+$/.test(value)) {
          return 'Model contains invalid characters. Only letters, numbers, spaces, and basic punctuation allowed';
        }
        return true;
      },

      brand: (field, value) => {
        if (!value) return 'Brand is required';
        if (value.length < 2) return 'Brand must be at least 2 characters long';
        if (value.length > 50) return 'Brand must not exceed 50 characters';
        return true;
      },

      description: (field, value) => {
        if (!value) return 'Description is required';
        if (value.length < 20) return 'Description must be at least 20 characters long';
        if (value.length > 2000) return 'Description must not exceed 2000 characters';
        return true;
      },

      category: (field, value) => {
        if (!value) return 'Category selection is required';
        return true;
      },

      regularPrice: (field, value) => {
        if (!value) return 'Regular Price is required';
        const price = parseFloat(value);
        if (isNaN(price)) return 'Regular Price must be a valid number';
        if (price <= 0) return 'Regular Price must be greater than 0';
        if (price > 1000000) return 'Regular Price must not exceed ₹1,000,000';
        return true;
      },

      salePrice: (field, value) => {
        if (!value) return 'Sale Price is required';
        const salePrice = parseFloat(value);
        if (isNaN(salePrice)) return 'Sale Price must be a valid number';
        if (salePrice <= 0) return 'Sale Price must be greater than 0';
        if (salePrice > 1000000) return 'Sale Price must not exceed ₹1,000,000';
        
        const regularPriceField = field.form.querySelector('[name="regularPrice"]');
        if (regularPriceField && regularPriceField.value) {
          const regularPrice = parseFloat(regularPriceField.value);
          if (!isNaN(regularPrice) && salePrice >= regularPrice) {
            return 'Sale Price must be less than Regular Price';
          }
        }
        return true;
      },

      stock: (field, value) => {
        if (!value) return 'Stock quantity is required';
        const stock = parseInt(value);
        if (isNaN(stock)) return 'Stock must be a valid number';
        if (stock < 0) return 'Stock cannot be negative';
        if (stock > 10000) return 'Stock must not exceed 10,000';
        return true;
      },

      connectivity: (field, value) => {
        if (!value) return 'Connectivity type is required';
        const allowedValues = ['Wired', 'Wireless'];
        if (!allowedValues.includes(value)) {
          return 'Connectivity must be either "Wired" or "Wireless"';
        }
        return true;
      },

      manufacturer: (field, value) => {
        if (!value) return 'Manufacturer is required';
        if (value.length < 2) return 'Manufacturer must be at least 2 characters long';
        if (value.length > 50) return 'Manufacturer must not exceed 50 characters';
        return true;
      },

      mainImage: (field, value) => {
        if (!field.files || field.files.length === 0) {
          return 'Main image is required';
        }
        
        const file = field.files[0];
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
        if (!allowedTypes.includes(file.type)) {
          return 'Main image must be a valid image file (JPEG, PNG, GIF, WebP)';
        }
        
        if (file.size > 5 * 1024 * 1024) {
          return 'Main image must be smaller than 5MB';
        }
        
        return true;
      }
    };
  }

  setupCrossFieldValidation(form) {
    const regularPriceField = form.querySelector('[name="regularPrice"]');
    const salePriceField = form.querySelector('[name="salePrice"]');

    if (regularPriceField && salePriceField) {
      regularPriceField.addEventListener('input', () => {
        this.debounceValidation('regularPrice', () => {
          if (salePriceField.value) {
            this.errorHandler.validateField(salePriceField, this.validationRules);
          }
        });
      });

      salePriceField.addEventListener('input', () => {
        this.debounceValidation('salePrice', () => {
          this.errorHandler.validateField(salePriceField, this.validationRules);
        });
      });
    }
  }

  addCharacterCounters(form) {
    const fieldsWithCounters = [
      { name: 'model', max: 100 },
      { name: 'brand', max: 50 },
      { name: 'description', max: 2000 },
      { name: 'manufacturer', max: 50 }
    ];

    fieldsWithCounters.forEach(fieldInfo => {
      const field = form.querySelector(`[name="${fieldInfo.name}"]`);
      if (field) {
        this.addCharacterCounter(field, fieldInfo.max);
      }
    });
  }

  addCharacterCounter(field, maxLength) {
    const formGroup = field.closest('.mb-3') || field.parentElement;
    if (!formGroup) return;

    const counter = document.createElement('small');
    counter.className = 'character-counter text-muted';
    counter.style.fontSize = '0.75rem';
    counter.style.marginTop = '0.25rem';
    counter.style.display = 'block';

    const updateCounter = () => {
      const currentLength = field.value.length;
      counter.textContent = `${currentLength}/${maxLength} characters`;
      
      if (currentLength > maxLength * 0.9) {
        counter.style.color = '#dc3545'; // Red when near limit
      } else if (currentLength > maxLength * 0.7) {
        counter.style.color = '#f59e0b'; // Orange when getting close
      } else {
        counter.style.color = '#6b7280'; // Gray for normal
      }
    };

    formGroup.appendChild(counter);

    updateCounter();

    field.addEventListener('input', updateCounter);
  }

  debounceValidation(key, callback, delay = 300) {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    
    const timer = setTimeout(callback, delay);
    this.debounceTimers.set(key, timer);
  }

  validateForm(form) {
    const errors = {};
    let isValid = true;

    Object.keys(this.validationRules).forEach(fieldName => {
      const field = form.querySelector(`[name="${fieldName}"]`);
      if (field) {
        const value = field.type === 'file' ? field.files : field.value.trim();
        const result = this.validationRules[fieldName](field, value);
        
        if (result !== true) {
          errors[fieldName] = result;
          isValid = false;
          this.errorHandler.showFieldError(field, result);
        } else {
          this.errorHandler.clearFieldError(field);
        }
      }
    });

    return { isValid, errors };
  }
}

const productValidator = new ProductRealTimeValidator();
productValidator.init();

window.ProductRealTimeValidator = productValidator;
