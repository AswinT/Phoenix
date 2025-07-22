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

// Admin Authentication Routes
// GET /admin/auth/login - Show admin login form
router.get('/auth/login', isAdminNotAuthenticated, preventCache, adminController.getAdminLogin);

// POST /admin/auth/login - Process admin login
router.post('/auth/login', isAdminNotAuthenticated, adminController.postAdminLogin);

// GET /admin/auth/logout - Process admin logout
router.get('/auth/logout', isAdminAuthenticated, adminController.logoutAdminDashboard);

// Apply authentication middleware to all routes below
router.use(isAdminAuthenticated);
router.use(preventCache);

// Dashboard Routes
// GET /admin/dashboard - Admin dashboard
router.get('/dashboard', dashboardController.getDashboard);

// User Management Routes
// GET /admin/users - Get all users
router.get('/users', adminUserController.getUsers);

// PUT /admin/users/:id/block - Block user
router.put('/users/:id/block', adminUserController.blockUser);

// PUT /admin/users/:id/unblock - Unblock user
router.put('/users/:id/unblock', adminUserController.unblockUser);

// Category Management Routes
// GET /admin/categories - Get all categories
router.get('/categories', categoryController.getCategory);

// POST /admin/categories - Add new category
router.post('/categories',
  upload.single('image'),
  validateCategoryData,
  validateCategoryImage,
  categoryController.addCategory
);

// PUT /admin/categories/:id - Update category
router.put('/categories/:id',
  upload.single('image'),
  validateCategoryData,
  validateCategoryImage,
  categoryController.editCategory
);

// PUT /admin/categories/:id/toggle - Toggle category status
router.put('/categories/:id/toggle', categoryController.toggleCategoryStatus);

// GET /admin/categories/list - Get categories list for dropdowns
router.get('/categories/list', async (req, res) => {
  try {
    const Category = require('../../models/categorySchema');
    const categories = await Category.find({ isListed: true });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Product Management Routes
// GET /admin/products - Get all products
router.get('/products', productController.getProducts);

// GET /admin/products/add - Show add product form
router.get('/products/add', manageProductController.getAddProduct);

// POST /admin/products - Add new product
router.post('/products',
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'subImage1', maxCount: 1 },
    { name: 'subImage2', maxCount: 1 },
    { name: 'subImage3', maxCount: 1 }
  ]),
  validateProductData,
  validatePriceComparison,
  productController.addProduct
);

// GET /admin/products/:id/edit - Show edit product form
router.get('/products/:id/edit', productController.getEditProduct);

// PUT /admin/products/:id - Update product
router.put('/products/:id',
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'subImage1', maxCount: 1 },
    { name: 'subImage2', maxCount: 1 },
    { name: 'subImage3', maxCount: 1 }
  ]),
  validateProductData,
  validatePriceComparison,
  productController.updateProduct
);

// PUT /admin/products/:id/toggle - Toggle product status
router.put('/products/:id/toggle', productController.toggleProductStatus);

// PUT /admin/products/:id/soft-delete - Soft delete product
router.put('/products/:id/soft-delete', productController.softDeleteProduct);

// Order Management Routes
// GET /admin/orders - Get all orders
router.get('/orders', manageOrderController.getManageOrders);

// GET /admin/orders/:id - Get order details
router.get('/orders/:id', manageOrderController.getOrderDetails);

// PUT /admin/orders/:id/status - Update order status
router.put('/orders/:id/status', manageOrderController.updateOrderStatus);

// GET /admin/orders/:id/invoice - Download order invoice
router.get('/orders/:id/invoice', manageOrderController.downloadInvoice);

// PUT /admin/orders/:id/return-request - Approve return request
router.put('/orders/:id/return-request', manageOrderController.approveReturnRequest);

// Return Management Routes
// GET /admin/returns - Get all return requests
router.get('/returns', returnManagementController.getReturnRequests);

// GET /admin/returns/:id - Get return request details
router.get('/returns/:id', returnManagementController.getReturnRequestDetails);

// PUT /admin/returns/:id/process - Process return request
router.put('/returns/:id/process', returnManagementController.processReturnRequest);

// POST /admin/returns/bulk-process - Bulk process return requests
router.post('/returns/bulk-process', returnManagementController.bulkProcessReturns);

// Coupon Management Routes
// GET /admin/coupons - Get all coupons
router.get('/coupons', couponController.getCoupons);

// GET /admin/coupons/:id - Get coupon details
router.get('/coupons/:id', couponController.getCouponDetails);

// POST /admin/coupons - Create new coupon
router.post('/coupons', validateCreateCoupon, couponController.createCoupon);

// PUT /admin/coupons/:id - Update coupon
router.put('/coupons/:id', validateUpdateCoupon, couponController.updateCoupon);

// PUT /admin/coupons/:id/toggle-status - Toggle coupon status
router.put('/coupons/:id/toggle-status', couponController.toggleCouponStatus);

// Offer Management Routes
// GET /admin/offers - Get all offers
router.get('/offers', offerController.getOffers);

// POST /admin/offers - Create new offer
router.post('/offers', validateCreateOffer, offerController.createOffer);

// GET /admin/offers/:id - Get offer details
router.get('/offers/:id', offerController.getOfferDetails);

// PUT /admin/offers/:id - Update offer
router.put('/offers/:id', validateUpdateOffer, offerController.updateOffer);

// PUT /admin/offers/:id/toggle-status - Toggle offer status
router.put('/offers/:id/toggle-status', offerController.toggleOfferStatus);

// Sales & Reports Routes
// GET /admin/sales - Get sales reports
router.get('/sales', salesController.getSales);

// GET /admin/sales/export/excel - Export sales to Excel
router.get('/sales/export/excel', salesController.exportToExcel);

// GET /admin/sales/export/pdf - Export sales to PDF
router.get('/sales/export/pdf', salesController.exportToPDF);

module.exports = router;
