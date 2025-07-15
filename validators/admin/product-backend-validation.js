const { createFieldValidationMiddleware, VALIDATION_PATTERNS } = require('../../helpers/validation-helper');
const { HttpStatus } = require('../../helpers/status-code');


const PRODUCT_VALIDATION_RULES = {
  title: {
    type: 'text',
    fieldName: 'Product Title',
    required: true,
    min: 3,
    max: 100,
    pattern: VALIDATION_PATTERNS.ALPHANUMERIC_SPECIAL
  },
  brand: {
    type: 'text',
    fieldName: 'Brand',
    required: true,
    min: 2,
    max: 50
  },
  description: {
    type: 'text',
    fieldName: 'Description',
    required: true,
    min: 20,
    max: 2000
  },
  category: {
    type: 'objectId',
    fieldName: 'Category',
    required: true
  },
  regularPrice: {
    type: 'number',
    fieldName: 'Regular Price',
    required: true,
    min: 0,
    max: 100000
  },
  salePrice: {
    type: 'number',
    fieldName: 'Sale Price',
    required: true,
    min: 0,
    max: 100000
  },
  stock: {
    type: 'number',
    fieldName: 'Stock Quantity',
    required: true,
    min: 0,
    max: 10000,
    integer: true
  },
  battery_life: {
    type: 'number',
    fieldName: 'Battery Life',
    required: true,
    min: 1,
    max: 10000,
    integer: true
  },
  connectivity: {
    type: 'text',
    fieldName: 'Connectivity',
    required: true,
    min: 2,
    max: 30
  },
  manufacturer: {
    type: 'text',
    fieldName: 'Manufacturer',
    required: true,
    min: 2,
    max: 50
  }
};


const validateProductForm = (req, res, next) => {

  const fieldValidator = createFieldValidationMiddleware(PRODUCT_VALIDATION_RULES);
  
  fieldValidator(req, res, (err) => {
    if (err) return next(err);
    

    const fieldErrors = {};
    

    const regularPrice = parseFloat(req.body.regularPrice);
    const salePrice = parseFloat(req.body.salePrice);
    
    if (!isNaN(regularPrice) && !isNaN(salePrice) && salePrice >= regularPrice) {
      fieldErrors.salePrice = 'Sale price must be less than regular price';
    }
    

    const modelNumber = req.body.model_number;
    if (modelNumber && modelNumber.trim()) {
      const sanitizedModel = modelNumber.trim();
      if (sanitizedModel.length < 2 || sanitizedModel.length > 50) {
        fieldErrors.model_number = 'Model number must be between 2 and 50 characters';
      }
    }
    

    const releaseDate = req.body.release_date;
    if (releaseDate) {
      const date = new Date(releaseDate);
      const now = new Date();
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(now.getFullYear() + 2);
      
      if (isNaN(date.getTime())) {
        fieldErrors.release_date = 'Invalid release date format';
      } else if (date > maxFutureDate) {
        fieldErrors.release_date = 'Release date cannot be more than 2 years in the future';
      }
    }
    

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        fieldErrors: fieldErrors
      });
    }
    

    next();
  });
};


const validateProductImages = (req, res, next) => {
  const fieldErrors = {};
  

  if (!req.files) {
    fieldErrors.mainImage = 'Main image is required';
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      fieldErrors: fieldErrors
    });
  }
  

  const hasMainImage = req.files.mainImage && req.files.mainImage.length > 0;
  if (!hasMainImage) {
    fieldErrors.mainImage = 'Main image is required';
  }
  

  const subImageCount = req.files.subImages ? req.files.subImages.length : 0;
  const totalImages = (hasMainImage ? 1 : 0) + subImageCount;
  
  if (totalImages < 3) {
    fieldErrors.subImage1 = `Minimum 3 images required (1 main + 2 sub images). You have uploaded ${totalImages} image(s).`;
  }
  
  // If there are image validation errors, return them
  if (Object.keys(fieldErrors).length > 0) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      fieldErrors: fieldErrors
    });
  }
  
  next();
};

module.exports = {
  validateProductForm,
  validateProductImages,
  PRODUCT_VALIDATION_RULES
};
