const { HttpStatus } = require('../helpers/statusCode');
const { 
  validateDate, 
  validateDateRange, 
  validateOfferDates, 
  validateCouponDates, 
  validateSalesReportDates,
  validateDateOfBirth 
} = require('../helpers/validationHelper');

/**
 * Middleware for validating offer dates
 */
const validateOfferDatesMiddleware = (req, res, next) => {
  const { startDate, endDate } = req.body;
  const isEdit = req.method === 'PUT';

  if (!startDate) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: { startDate: 'Start date is required' }
    });
  }

  if (!endDate) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: { endDate: 'End date is required' }
    });
  }

  const validation = validateOfferDates(startDate, endDate, isEdit);
  
  if (!validation.isValid) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Date validation failed',
      errors: { dateRange: validation.message }
    });
  }

  next();
};

/**
 * Middleware for validating coupon dates
 */
const validateCouponDatesMiddleware = (req, res, next) => {
  const { startDate, expiryDate } = req.body;
  const isEdit = req.method === 'PUT';

  if (!startDate) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: { startDate: 'Start date is required' }
    });
  }

  if (!expiryDate) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: { expiryDate: 'Expiry date is required' }
    });
  }

  const validation = validateCouponDates(startDate, expiryDate, isEdit);
  
  if (!validation.isValid) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Date validation failed',
      errors: { dateRange: validation.message }
    });
  }

  next();
};

/**
 * Middleware for validating sales report dates
 */
const validateSalesReportDatesMiddleware = (req, res, next) => {
  const { fromDate, toDate } = req.query;

  // Only validate if both dates are provided (for custom date range)
  if (fromDate && toDate) {
    const validation = validateSalesReportDates(fromDate, toDate);
    
    if (!validation.isValid) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Date validation failed',
        errors: { dateRange: validation.message }
      });
    }
  }

  next();
};

/**
 * Middleware for validating date of birth
 */
const validateDateOfBirthMiddleware = (req, res, next) => {
  const { dateOfBirth } = req.body;

  if (dateOfBirth) {
    const validation = validateDateOfBirth(dateOfBirth);
    
    if (!validation.isValid) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Date validation failed',
        errors: { dateOfBirth: validation.message }
      });
    }
  }

  next();
};

/**
 * Generic date validation middleware
 * @param {Object} config - Configuration object
 * @param {Array} config.fields - Array of field configurations
 * @param {Array} config.dateRanges - Array of date range configurations
 */
const createDateValidationMiddleware = (config = {}) => {
  const { fields = [], dateRanges = [] } = config;

  return (req, res, next) => {
    const errors = {};
    const data = { ...req.body, ...req.query };

    // Validate individual date fields
    for (const fieldConfig of fields) {
      const { 
        name, 
        required = false, 
        allowFuture = true, 
        allowPast = true,
        minAge = null,
        maxAge = null,
        minDate = null,
        maxDate = null,
        fieldName = name 
      } = fieldConfig;

      const value = data[name];
      
      if (required && !value) {
        errors[name] = `${fieldName} is required`;
        continue;
      }

      if (value) {
        const validation = validateDate(value, {
          required,
          allowFuture,
          allowPast,
          minAge,
          maxAge,
          minDate,
          maxDate
        }, fieldName);

        if (!validation.isValid) {
          errors[name] = validation.message;
        }
      }
    }

    // Validate date ranges
    for (const rangeConfig of dateRanges) {
      const {
        startField,
        endField,
        allowSameDate = false,
        maxRangeDays = null,
        minRangeDays = null,
        startFieldName = startField,
        endFieldName = endField,
        required = true
      } = rangeConfig;

      const startValue = data[startField];
      const endValue = data[endField];

      if (required && (!startValue || !endValue)) {
        if (!startValue) errors[startField] = `${startFieldName} is required`;
        if (!endValue) errors[endField] = `${endFieldName} is required`;
        continue;
      }

      if (startValue && endValue) {
        const validation = validateDateRange(startValue, endValue, {
          allowSameDate,
          maxRangeDays,
          minRangeDays,
          startFieldName,
          endFieldName
        });

        if (!validation.isValid) {
          errors[endField] = validation.message;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Date validation failed',
        errors
      });
    }

    next();
  };
};

/**
 * Middleware for validating dashboard date filters
 */
const validateDashboardDatesMiddleware = createDateValidationMiddleware({
  fields: [
    {
      name: 'startDate',
      required: false,
      allowFuture: false,
      fieldName: 'Start date'
    },
    {
      name: 'endDate',
      required: false,
      allowFuture: false,
      fieldName: 'End date'
    }
  ],
  dateRanges: [
    {
      startField: 'startDate',
      endField: 'endDate',
      allowSameDate: true,
      maxRangeDays: 365,
      required: false
    }
  ]
});

/**
 * Middleware for validating user profile dates
 */
const validateProfileDatesMiddleware = createDateValidationMiddleware({
  fields: [
    {
      name: 'dateOfBirth',
      required: false,
      allowFuture: false,
      minAge: 13,
      maxAge: 120,
      fieldName: 'Date of birth'
    }
  ]
});

/**
 * Middleware for validating event dates
 */
const validateEventDatesMiddleware = createDateValidationMiddleware({
  fields: [
    {
      name: 'eventDate',
      required: true,
      allowPast: false,
      fieldName: 'Event date'
    }
  ]
});

module.exports = {
  validateOfferDatesMiddleware,
  validateCouponDatesMiddleware,
  validateSalesReportDatesMiddleware,
  validateDateOfBirthMiddleware,
  validateDashboardDatesMiddleware,
  validateProfileDatesMiddleware,
  validateEventDatesMiddleware,
  createDateValidationMiddleware
};
