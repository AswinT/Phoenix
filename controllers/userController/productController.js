const Product = require('../../models/productSchema');
const { HttpStatus } = require('../../helpers/statusCode');

const validateQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.validatedData;

    const product = await Product.findById(productId);
    if (!product || !product.isListed || product.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Product not found or unavailable'
      });
    }

    const MAX_QUANTITY_PER_PRODUCT = 5;
    const maxAllowedQuantity = Math.min(MAX_QUANTITY_PER_PRODUCT, product.stock);

    if (quantity > maxAllowedQuantity) {
      let message;
      if (product.stock === 0) {
        message = 'Product is out of stock';
      } else if (product.stock < MAX_QUANTITY_PER_PRODUCT) {
        message = `Only ${product.stock} items available in stock`;
      } else {
        message = `Maximum ${MAX_QUANTITY_PER_PRODUCT} items allowed per product`;
      }

      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: message,
        data: {
          currentStock: product.stock,
          maxQuantity: maxAllowedQuantity,
          requestedQuantity: quantity
        }
      });
    }

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Quantity is valid',
      data: {
        currentStock: product.stock,
        maxQuantity: maxAllowedQuantity,
        validatedQuantity: quantity
      }
    });

  } catch (error) {
    console.error('Error validating quantity:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  validateQuantity
};
