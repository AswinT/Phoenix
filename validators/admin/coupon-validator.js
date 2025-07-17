const { createValidationMiddleware } = require('../../helpers/validation-helper');

/**
 * Backend validation for Admin Coupon Management
 * Converts frontend validation logic to backend using createValidationMiddleware
 */

// Custom validation function for discount based on type and max discount
const validateCouponDiscount = (req, res, next) => {
  console.log('🔍 VALIDATING COUPON DISCOUNT:', req.body);

  const { discountValue, discountType, maxDiscountValue } = req.body;
  const value = parseFloat(discountValue);

  if (isNaN(value) || value <= 0) {
    console.log('❌ DISCOUNT VALIDATION FAILED: Invalid discount value');
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Please enter a valid discount value']
    });
  }

  if (discountType === 'percentage') {
    if (value < 1 || value > 90) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Percentage must be between 1% and 90%']
      });
    }

    // Validate max discount for percentage type
    if (maxDiscountValue) {
      const maxValue = parseFloat(maxDiscountValue);
      if (!maxValue && value > 50) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: ['Maximum discount amount is required for discounts over 50%']
        });
      }
      if (maxValue) {
        if (isNaN(maxValue) || maxValue < 1) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: ['Maximum discount must be greater than 0']
          });
        }
        if (maxValue > 10000) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: ['Maximum discount cannot exceed ₹10,000']
          });
        }
      }
    }
  } else if (discountType === 'fixed') {
    if (value < 1 || value > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Fixed amount must be between ₹1 and ₹10,000']
      });
    }
  }

  next();
};

// Custom validation function for minimum order amount
const validateMinOrderAmount = (req, res, next) => {
  const { minOrderAmount, discountValue, discountType } = req.body;
  const minOrderValue = parseFloat(minOrderAmount);
  const discountVal = parseFloat(discountValue);

  if (isNaN(minOrderValue) || minOrderValue < 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Minimum order amount must be ₹0 or greater']
    });
  }

  if (minOrderValue > 1000000) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Minimum order amount cannot exceed ₹1,000,000']
    });
  }

  // Fixed discount validation
  if (discountType === 'fixed' && discountVal >= minOrderValue) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Minimum order amount must be greater than the discount amount']
    });
  }

  next();
};

// Custom validation function for coupon dates
const validateCouponDates = (req, res, next) => {
  const { startDate, expiryDate } = req.body;
  const isEdit = req.method === 'PUT';

  if (!startDate) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Start date is required']
    });
  }

  if (!expiryDate) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['End date is required']
    });
  }

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(expiryDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (!isEdit && startDateObj < now) {
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

  // Maximum duration check - 1 year
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  if (endDateObj - startDateObj > oneYear) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Coupon duration cannot exceed 1 year']
    });
  }

  next();
};

// Custom validation function for usage limits
const validateUsageLimits = (req, res, next) => {
  const { usageLimitGlobal, usageLimitPerUser } = req.body;

  if (usageLimitGlobal) {
    const globalLimit = parseInt(usageLimitGlobal);
    if (isNaN(globalLimit) || globalLimit < 1) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Global usage limit must be at least 1']
      });
    }
    if (globalLimit > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Global usage limit cannot exceed 10,000']
      });
    }
  }

  const perUserLimit = parseInt(usageLimitPerUser);
  if (isNaN(perUserLimit) || perUserLimit < 1) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Per user limit must be at least 1']
    });
  }
  if (perUserLimit > 10000) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Per user limit cannot exceed 10,000']
    });
  }

  // Check if global limit is less than per user limit
  if (usageLimitGlobal) {
    const globalLimit = parseInt(usageLimitGlobal);
    if (globalLimit < perUserLimit) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Global limit cannot be less than per user limit']
      });
    }
  }

  next();
};

/**
 * Validate add/update coupon request
 */
const validateCouponData = createValidationMiddleware({
  couponCode: {
    type: 'text',
    fieldName: 'Coupon Code',
    min: 3,
    max: 20,
    pattern: /^[A-Z0-9\-_]+$/,
    required: true
  },
  couponDescription: {
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
  minOrderAmount: {
    type: 'text',
    fieldName: 'Minimum Order Amount',
    pattern: /^\d+(\.\d{1,2})?$/,
    required: false
  },
  startDate: {
    type: 'text',
    fieldName: 'Start Date',
    required: true
  },
  expiryDate: {
    type: 'text',
    fieldName: 'Expiry Date',
    required: true
  },
  usageLimitPerUser: {
    type: 'text',
    fieldName: 'Per User Limit',
    pattern: /^\d+$/,
    required: false
  }
});

/**
 * Complete coupon validation middleware chain
 * Use this for both create and update operations
 */
const validateCompleteCoupon = [
  validateCouponData,
  validateCouponDiscount,
  validateMinOrderAmount,
  validateCouponDates,
  validateUsageLimits
];

/**
 * Validation for coupon creation
 */
const validateCreateCoupon = validateCompleteCoupon;

/**
 * Validation for coupon update
 */
const validateUpdateCoupon = validateCompleteCoupon;

module.exports = {
  validateCouponData,
  validateCouponDiscount,
  validateMinOrderAmount,
  validateCouponDates,
  validateUsageLimits,
  validateCompleteCoupon,
  validateCreateCoupon,
  validateUpdateCoupon
};
