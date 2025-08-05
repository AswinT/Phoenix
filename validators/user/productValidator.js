const { HttpStatus } = require('../../helpers/statusCode');

const validateQuantityCheck = (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!objectIdPattern.test(productId)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid Product ID format'
      });
    }

    if (quantity === undefined || quantity === null) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Quantity is required'
      });
    }

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum < 1 || quantityNum > 5) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Quantity must be between 1 and 5'
      });
    }

    req.validatedData = {
      productId: productId.trim(),
      quantity: quantityNum
    };

    next();
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};

module.exports = {
  validateQuantityCheck
};
