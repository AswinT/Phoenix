const { body, validationResult } = require('express-validator');
const { HttpStatus } = require('../../helpers/status-code');

// Wallet is for refunds only
const validateWalletRefund = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID format'),

  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];


const validateWalletBalance = async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Please log in to access wallet'
      });
    }


    next();
  } catch (error) {
    console.error('Wallet validation error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Wallet validation failed'
    });
  }
};


const validateWalletQuery = [
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  body('filter')
    .optional()
    .isIn(['all', 'credit', 'debit', 'add'])
    .withMessage('Invalid filter type'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid query parameters',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateWalletRefund,
  validateWalletBalance,
  validateWalletQuery
};
