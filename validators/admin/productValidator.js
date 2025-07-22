const { createValidationMiddleware } = require('../../helpers/validationHelper');
const validatePriceComparison = (req, res, next) => {
  const regularPrice = parseFloat(req.body.regularPrice);
  const salePrice = parseFloat(req.body.salePrice);
  if (!isNaN(regularPrice) && !isNaN(salePrice)) {
    if (salePrice > regularPrice) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Sale price cannot be greater than regular price']
      });
    }
    if (salePrice < regularPrice * 0.1) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Sale price cannot be less than 10% of regular price']
      });
    }
  }
  next();
};
const validateProductData = createValidationMiddleware({
  model: {
    type: 'text',
    fieldName: 'Model',
    min: 3,
    max: 100,
    pattern: /^[a-zA-Z0-9\s\-:,.'&()]+$/,
    required: true
  },
  brand: {
    type: 'text',
    fieldName: 'Brand',
    min: 2,
    max: 50,
    required: true
  },
  description: {
    type: 'text',
    fieldName: 'Description',
    min: 20,
    max: 2000,
    required: true
  },
  connectivity: {
    type: 'select',
    fieldName: 'Connectivity',
    required: true,
    allowedValues: ['Wired', 'Wireless'],
    customValidator: (value) => {
      if (!value || value.trim() === '') {
        return { isValid: false, message: 'Connectivity type is required' };
      }
      const allowedValues = ['Wired', 'Wireless'];
      if (!allowedValues.includes(value)) {
        return { isValid: false, message: 'Connectivity must be either "Wired" or "Wireless"' };
      }
      return { isValid: true, sanitized: value };
    }
  },
  manufacturer: {
    type: 'text',
    fieldName: 'Manufacturer',
    min: 2,
    max: 50,
    required: true
  },
  regularPrice: {
    type: 'price',
    fieldName: 'Regular Price'
  },
  salePrice: {
    type: 'price',
    fieldName: 'Sale Price'
  },
  stock: {
    type: 'text',
    fieldName: 'Stock',
    pattern: /^\d+$/,
    min: 1,
    max: 5,
    required: true,
    customValidator: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 0 || num > 10000) {
        return { isValid: false, message: 'Stock must be between 0 and 10000' };
      }
      return { isValid: true, sanitized: num };
    }
  },
  category: {
    type: 'objectId',
    fieldName: 'Category'
  }
});
module.exports = {
  validateProductData,
  validatePriceComparison
};