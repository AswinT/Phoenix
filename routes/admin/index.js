const express = require('express');
const router = express.Router();

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
  upload.single('image'),
  validateCategoryData,
  validateCategoryImage,
  categoryController.addCategory
);
router.put('/categories/:id',
  upload.single('image'),
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
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// Product Management Routes
router.get('/products', productController.getProducts);
router.get('/products/add', manageProductController.getAddProduct);
router.post('/products',
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'subImage1', maxCount: 1 },
    { name: 'subImage2', maxCount: 1 },
    { name: 'subImage3', maxCount: 1 },
  ]),
  validateProductData,
  validatePriceComparison,
  productController.addProduct
);
router.get('/products/:id/edit', productController.getEditProduct);
router.put('/products/:id',
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'subImage1', maxCount: 1 },
    { name: 'subImage2', maxCount: 1 },
    { name: 'subImage3', maxCount: 1 },
  ]),
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
