const express = require('express');
const router = express.Router();
const multer = require('multer');

// Import controllers
const adminController = require('../../controllers/adminController/adminLoginController');
const dashboardController = require('../../controllers/adminController/dashboardController');
const adminUserController = require('../../controllers/adminController/getUserController');
const categoryController = require('../../controllers/adminController/categoryController');
const productController = require('../../controllers/adminController/productController');
const manageProductController = require('../../controllers/adminController/manageProducts');
const manageOrderController = require('../../controllers/adminController/manageOrders');
const returnManagementController = require('../../controllers/adminController/returnManagement');
const couponController = require('../../controllers/adminController/couponController');
const offerController = require('../../controllers/adminController/offerController');
const salesController = require('../../controllers/adminController/salesController');

// Import validators
const {
  validateProductData,
  validatePriceComparison
} = require('../../validators/admin/productValidator');
const {
  validateCategoryData,
  validateCategoryImage
} = require('../../validators/admin/categoryValidator');
const {
  validateCreateOffer,
  validateUpdateOffer
} = require('../../validators/admin/offerValidator');
const {
  validateCreateCoupon,
  validateUpdateCoupon
} = require('../../validators/admin/couponValidator');

// Import middleware
const { isAdminAuthenticated, isAdminNotAuthenticated, preventCache } = require('../../middlewares/adminMiddleware');
const upload = require('../../config/multer');

// Helper function to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error('Multer error:', err);

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large',
          errors: ['File size must be less than 5MB']
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files',
          errors: ['Maximum 4 files allowed']
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field',
          errors: ['Unexpected file field: ' + err.field]
        });
      }
    }

    if (err.message === 'Images only (jpeg, jpg, png)!') {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type',
        errors: ['Only JPEG, JPG, and PNG images are allowed']
      });
    }

    return res.status(500).json({
      success: false,
      message: 'File upload error',
      errors: [err.message || 'Unknown file upload error']
    });
  }

  next();
};

// Authentication Routes
router.get('/auth/login', isAdminNotAuthenticated, preventCache, adminController.getAdminLogin);
router.post('/auth/login', isAdminNotAuthenticated, adminController.postAdminLogin);
router.get('/auth/logout', isAdminAuthenticated, adminController.logoutAdminDashboard);

// Apply authentication middleware to all routes below
router.use(isAdminAuthenticated);
router.use(preventCache);

// Dashboard Routes
router.get('/dashboard', dashboardController.getDashboard);
router.get('/dashboard/analytics', dashboardController.getAnalyticsData);
router.get('/dashboard/top-performance', dashboardController.getTopPerformance);

// User Management Routes
router.get('/users', adminUserController.getUsers);
router.put('/users/:id/block', adminUserController.blockUser);
router.put('/users/:id/unblock', adminUserController.unblockUser);

// Category Management Routes
router.get('/categories', categoryController.getCategory);
router.post('/categories',
  (req, res, next) => {
    upload.single('image')(req, res, (err) => handleMulterError(err, req, res, next));
  },
  validateCategoryData,
  validateCategoryImage,
  categoryController.addCategory
);
router.put('/categories/:id',
  (req, res, next) => {
    upload.single('image')(req, res, (err) => handleMulterError(err, req, res, next));
  },
  validateCategoryData,
  validateCategoryImage,
  categoryController.editCategory
);
router.put('/categories/:id/toggle', categoryController.toggleCategoryStatus);

// Categories list for dropdowns
router.get('/categories/list', async (req, res) => {
  try {
    const Category = require('../../models/categorySchema');
    const categories = await Category.find({ isListed: true });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Server Error' });
  }
});

// Product Management Routes
router.get('/products', productController.getProducts);
router.get('/products/add', manageProductController.getAddProduct);

// Duplicate check route for products
router.get('/products/check-duplicate', async (req, res) => {
  try {
    const { model, excludeId } = req.query;
    const Product = require('../../models/productSchema');

    if (!model) {
      return res.json({ exists: false });
    }

    const query = {
      model: { $regex: new RegExp(`^${model.trim()}$`, 'i') },
      isDeleted: false
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingProduct = await Product.findOne(query);
    res.json({ exists: !!existingProduct });
  } catch (error) {
    console.error('Error checking duplicate product:', error);
    res.status(500).json({ exists: false });
  }
});

router.post('/products',
  (req, res, next) => {
    upload.fields([
      { name: 'mainImage', maxCount: 1 },
      { name: 'subImage1', maxCount: 1 },
      { name: 'subImage2', maxCount: 1 },
      { name: 'subImage3', maxCount: 1 },
    ])(req, res, (err) => handleMulterError(err, req, res, next));
  },
  validateProductData,
  validatePriceComparison,
  productController.addProduct
);
router.get('/products/:id/edit', productController.getEditProduct);

// Product update routes (POST with method override and PUT)
router.post('/products/:id',
  (req, res, next) => {
    upload.fields([
      { name: 'mainImage', maxCount: 1 },
      { name: 'subImage1', maxCount: 1 },
      { name: 'subImage2', maxCount: 1 },
      { name: 'subImage3', maxCount: 1 },
    ])(req, res, (err) => handleMulterError(err, req, res, next));
  },
  validateProductData,
  validatePriceComparison,
  productController.updateProduct
);

router.put('/products/:id',
  (req, res, next) => {
    upload.fields([
      { name: 'mainImage', maxCount: 1 },
      { name: 'subImage1', maxCount: 1 },
      { name: 'subImage2', maxCount: 1 },
      { name: 'subImage3', maxCount: 1 },
    ])(req, res, (err) => handleMulterError(err, req, res, next));
  },
  validateProductData,
  validatePriceComparison,
  productController.updateProduct
);

router.put('/products/:id/toggle', productController.toggleProductStatus);
router.put('/products/:id/soft-delete', productController.softDeleteProduct);

// Order Management Routes
router.get('/orders', manageOrderController.getManageOrders);
router.get('/orders/:id', manageOrderController.getOrderDetails);
router.put('/orders/:id/status', manageOrderController.updateOrderStatus);
router.get('/orders/:id/invoice', manageOrderController.downloadInvoice);
router.put('/orders/:id/return-request', manageOrderController.approveReturnRequest);

// Return Management Routes
router.get('/returns', returnManagementController.getReturnRequests);
router.get('/returns/:id', returnManagementController.getReturnRequestDetails);
router.put('/returns/:id/process', returnManagementController.processReturnRequest);
router.post('/returns/bulk-process', returnManagementController.bulkProcessReturns);

// Coupon Management Routes
router.get('/coupons', couponController.getCoupons);
router.get('/coupons/:id', couponController.getCouponDetails);
router.post('/coupons', validateCreateCoupon, couponController.createCoupon);
router.put('/coupons/:id', validateUpdateCoupon, couponController.updateCoupon);
router.put('/coupons/:id/toggle-status', couponController.toggleCouponStatus);

// Offer Management Routes
router.get('/offers', offerController.getOffers);
router.post('/offers', validateCreateOffer, offerController.createOffer);
router.get('/offers/:id', offerController.getOfferDetails);
router.put('/offers/:id', validateUpdateOffer, offerController.updateOffer);
router.put('/offers/:id/toggle-status', offerController.toggleOfferStatus);

// Sales & Reports Routes
router.get('/sales', salesController.getSales);
router.get('/sales/export/excel', salesController.exportToExcel);
router.get('/sales/export/pdf', salesController.exportToPDF);

module.exports = router;