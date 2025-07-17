const { createValidationMiddleware } = require('../../helpers/validation-helper');

/**
 * Category validation configuration
 */
const categoryValidationConfig = {
  name: {
    type: 'text',
    fieldName: 'Category Name',
    pattern: /^[a-zA-Z0-9\s\-&'().,]+$/,
    min: 2,
    max: 50,
    required: true,
    customValidator: (value) => {
      // Check for valid category name patterns
      if (value.trim().length < 2) {
        return { isValid: false, message: 'Category name must be at least 2 characters long' };
      }
      if (value.trim().length > 50) {
        return { isValid: false, message: 'Category name must not exceed 50 characters' };
      }
      if (!/^[a-zA-Z0-9\s\-&'().,]+$/.test(value)) {
        return { isValid: false, message: 'Category name contains invalid characters' };
      }
      // Check for common headphone category patterns
      const validCategoryPatterns = [
        /over.?ear/i,
        /on.?ear/i,
        /in.?ear/i,
        /earbuds?/i,
        /wireless/i,
        /wired/i,
        /gaming/i,
        /studio/i,
        /sports?/i,
        /noise.?cancel/i,
        /bluetooth/i,
        /professional/i,
        /audiophile/i,
        /budget/i,
        /premium/i,
        /kids?/i,
        /travel/i,
        /bass/i,
        /hi.?fi/i,
        /active/i,
        /passive/i
      ];
      
      return { isValid: true, sanitized: value.trim() };
    }
  },
  
  description: {
    type: 'text',
    fieldName: 'Description',
    min: 10,
    max: 500,
    required: true,
    customValidator: (value) => {
      if (value.trim().length < 10) {
        return { isValid: false, message: 'Description must be at least 10 characters long' };
      }
      if (value.trim().length > 500) {
        return { isValid: false, message: 'Description must not exceed 500 characters' };
      }
      return { isValid: true, sanitized: value.trim() };
    }
  }
};

/**
 * Validate category data middleware
 */
const validateCategoryData = createValidationMiddleware(categoryValidationConfig);

/**
 * Validate category image
 */
const validateCategoryImage = (req, res, next) => {
  // For add category, image is required
  if (req.method === 'POST' && !req.file) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Category image is required']
    });
  }
  
  // For edit category, image is optional
  if (req.file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Please upload a valid image file (JPEG, PNG, or WebP)']
      });
    }
    
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Image file size must be less than 5MB']
      });
    }
  }
  
  next();
};

/**
 * Client-side validation helper for categories
 */
const getCategoryValidationRules = () => {
  return {
    name: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9\s\-&'().,]+$/,
      messages: {
        required: 'Category name is required',
        minLength: 'Category name must be at least 2 characters long',
        maxLength: 'Category name must not exceed 50 characters',
        pattern: 'Category name contains invalid characters'
      }
    },
    description: {
      required: true,
      minLength: 10,
      maxLength: 500,
      messages: {
        required: 'Description is required',
        minLength: 'Description must be at least 10 characters long',
        maxLength: 'Description must not exceed 500 characters'
      }
    },
    image: {
      required: true, // Only for add category
      acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      maxSize: 5 * 1024 * 1024, // 5MB
      messages: {
        required: 'Category image is required',
        invalidType: 'Please upload a valid image file (JPEG, PNG, or WebP)',
        tooLarge: 'Image file size must be less than 5MB'
      }
    }
  };
};

module.exports = {
  validateCategoryData,
  validateCategoryImage,
  getCategoryValidationRules
};
