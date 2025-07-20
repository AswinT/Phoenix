const { createValidationMiddleware } = require('../../helpers/validation-helper');
const validateDiscountValue = (req, res, next) => {
  const { discountValue, discountType } = req.body;
  const value = parseFloat(discountValue);
  if (isNaN(value) || value <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Please enter a valid discount value']
    });
  }
  if (discountType === 'percentage') {
    if (value < 1 || value > 100) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Percentage discount must be between 1% and 100%']
      });
    }
  } else if (discountType === 'fixed') {
    if (value < 1 || value > 100000) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Fixed discount must be between ₹1 and ₹100,000']
      });
    }
  }
  next();
};
const validateOfferDates = (req, res, next) => {
  const { startDate, endDate } = req.body;
  const isEdit = req.method === 'PUT';
  if (!startDate) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Start date is required']
    });
  }
  if (!endDate) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['End date is required']
    });
  }
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!isEdit && startDateObj < today) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Start date cannot be in the past']
    });
  }
  if (startDateObj >= endDateObj) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['End date must be after start date']
    });
  }
  next();
};
const validateApplicableItems = (req, res, next) => {
  const { appliesTo, applicableProducts, applicableCategories } = req.body;
  if (appliesTo === 'specific_products') {
    if (!applicableProducts || (Array.isArray(applicableProducts) && applicableProducts.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Please select at least one product']
      });
    }
  } else if (appliesTo === 'specific_categories') {
    if (!applicableCategories || (Array.isArray(applicableCategories) && applicableCategories.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Please select at least one category']
      });
    }
  }
  next();
};
const validateOfferData = createValidationMiddleware({
  title: {
    type: 'text',
    fieldName: 'Title',
    min: 3,
    max: 100,
    pattern: /^[a-zA-Z0-9\s\-:,.'&()]+$/,
    required: true
  },
  description: {
    type: 'text',
    fieldName: 'Description',
    max: 500,
    required: false
  },
  discountType: {
    type: 'text',
    fieldName: 'Discount Type',
    pattern: /^(percentage|fixed)$/,
    required: true
  },
  discountValue: {
    type: 'text',
    fieldName: 'Discount Value',
    pattern: /^\d+(\.\d{1,2})?$/,
    required: true
  },
  appliesTo: {
    type: 'text',
    fieldName: 'Applies To',
    pattern: /^(all_products|specific_products|specific_categories)$/,
    required: true
  },
  startDate: {
    type: 'text',
    fieldName: 'Start Date',
    required: true
  },
  endDate: {
    type: 'text',
    fieldName: 'End Date',
    required: true
  }
});
const validateCompleteOffer = [
  validateOfferData,
  validateDiscountValue,
  validateOfferDates,
  validateApplicableItems
];
const validateCreateOffer = validateCompleteOffer;
const validateUpdateOffer = validateCompleteOffer;
module.exports = {
  validateOfferData,
  validateDiscountValue,
  validateOfferDates,
  validateApplicableItems,
  validateCompleteOffer,
  validateCreateOffer,
  validateUpdateOffer
};