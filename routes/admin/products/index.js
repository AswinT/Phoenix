/**
 * Admin Product Management Routes
 * Handles product, category, and inventory management
 * 
 * @description Routes for managing products, categories, offers, and coupons
 * @routes /admin/products/*
 */

const express = require('express');
const productsRouter = express.Router();

// Import controllers with descriptive names
const productController = require('../../../controllers/adminController/productController');
const categoryController = require('../../../controllers/adminController/categoryController');
const manageProductController = require('../../../controllers/adminController/manageProducts');
const offerController = require('../../../controllers/adminController/offerController');
const couponController = require('../../../controllers/adminController/couponController');

// Import middleware
const { isAdminAuthenticated } = require('../../../middlewares/adminMiddleware');

// Import validators
const {
  validateProductData,
  validatePriceComparison
} = require('../../../validators/admin/productValidator');
const {
  validateCategoryData
} = require('../../../validators/admin/categoryValidator');
const {
  validateCreateOffer,
  validateUpdateOffer,
  validateOfferDates,
  validateOfferApplicability,
  validateDiscountValue
} = require('../../../validators/admin/offerValidator');
const {
  validateCreateCoupon,
  validateUpdateCoupon
} = require('../../../validators/admin/couponValidator');

/**
 * @route GET /admin/products
 * @description Display products management page
 * @access Private (Admin only)
 */
productsRouter.get('/',
  isAdminAuthenticated,
  productController.getProducts
);

/**
 * @route GET /admin/products/add
 * @description Display add product page
 * @access Private (Admin only)
 */
productsRouter.get('/add',
  isAdminAuthenticated,
  manageProductController.getAddProduct
);

/**
 * @route POST /admin/products/add
 * @description Process add new product
 * @access Private (Admin only)
 */
productsRouter.post('/add',
  isAdminAuthenticated,
  validateProductData,
  validatePriceComparison,
  productController.addProduct
);

/**
 * @route GET /admin/products/:productId/edit
 * @description Display edit product page
 * @access Private (Admin only)
 */
productsRouter.get('/:productId/edit',
  isAdminAuthenticated,
  productController.getEditProduct
);

/**
 * @route PUT /admin/products/:productId
 * @description Update existing product
 * @access Private (Admin only)
 */
productsRouter.put('/:productId',
  isAdminAuthenticated,
  validateProductData,
  validatePriceComparison,
  productController.updateProduct
);

/**
 * @route DELETE /admin/products/:productId
 * @description Delete product (soft delete)
 * @access Private (Admin only)
 */
productsRouter.delete('/:productId',
  isAdminAuthenticated,
  productController.softDeleteProduct
);

/**
 * @route POST /admin/products/:productId/toggle-status
 * @description Toggle product active/inactive status
 * @access Private (Admin only)
 */
productsRouter.post('/:productId/toggle-status', 
  isAdminAuthenticated, 
  productController.toggleProductStatus
);

/**
 * @route GET /admin/products/categories
 * @description Display categories management page
 * @access Private (Admin only)
 */
productsRouter.get('/categories',
  isAdminAuthenticated,
  categoryController.getCategory
);

/**
 * @route POST /admin/products/categories/add
 * @description Add new category
 * @access Private (Admin only)
 */
productsRouter.post('/categories/add',
  isAdminAuthenticated,
  validateCategoryData,
  categoryController.addCategory
);

/**
 * @route PUT /admin/products/categories/:categoryId
 * @description Update existing category
 * @access Private (Admin only)
 */
productsRouter.put('/categories/:categoryId',
  isAdminAuthenticated,
  validateCategoryData,
  categoryController.editCategory
);

/**
 * @route POST /admin/products/categories/:categoryId/toggle-status
 * @description Toggle category listed/unlisted status
 * @access Private (Admin only)
 */
productsRouter.post('/categories/:categoryId/toggle-status', 
  isAdminAuthenticated, 
  categoryController.toggleCategoryStatus
);

/**
 * @route GET /admin/products/offers
 * @description Display offers management page
 * @access Private (Admin only)
 */
productsRouter.get('/offers',
  isAdminAuthenticated,
  offerController.getOffers
);

/**
 * @route POST /admin/products/offers/add
 * @description Add new offer
 * @access Private (Admin only)
 */
productsRouter.post('/offers/add',
  isAdminAuthenticated,
  validateCreateOffer,
  offerController.createOffer
);

/**
 * @route PUT /admin/products/offers/:offerId
 * @description Update existing offer
 * @access Private (Admin only)
 */
productsRouter.put('/offers/:offerId',
  isAdminAuthenticated,
  validateUpdateOffer,
  offerController.updateOffer
);

/**
 * @route DELETE /admin/products/offers/:offerId
 * @description Delete offer
 * @access Private (Admin only)
 */
productsRouter.delete('/offers/:offerId',
  isAdminAuthenticated,
  offerController.deleteOffer
);

/**
 * @route GET /admin/products/coupons
 * @description Display coupons management page
 * @access Private (Admin only)
 */
productsRouter.get('/coupons',
  isAdminAuthenticated,
  couponController.getCoupons
);

/**
 * @route POST /admin/products/coupons/add
 * @description Add new coupon
 * @access Private (Admin only)
 */
productsRouter.post('/coupons/add',
  isAdminAuthenticated,
  validateCreateCoupon,
  couponController.createCoupon
);

/**
 * @route PUT /admin/products/coupons/:couponId
 * @description Update existing coupon
 * @access Private (Admin only)
 */
productsRouter.put('/coupons/:couponId',
  isAdminAuthenticated,
  validateUpdateCoupon,
  couponController.updateCoupon
);

/**
 * @route DELETE /admin/products/coupons/:couponId
 * @description Delete coupon
 * @access Private (Admin only)
 */
productsRouter.delete('/coupons/:couponId',
  isAdminAuthenticated,
  couponController.deleteCoupon
);

module.exports = productsRouter;
