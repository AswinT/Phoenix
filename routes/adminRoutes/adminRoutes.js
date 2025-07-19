const express = require('express');
const adminRoute = express.Router();

const adminController = require('../../controllers/adminController/adminLoginController');
const dashboardController = require('../../controllers/adminController/dashboard-controller');
const adminUserController = require('../../controllers/adminController/getUserController');
const categoryController = require('../../controllers/adminController/categoryController');
const productController = require('../../controllers/adminController/productController.js');
const manageProductController = require('../../controllers/adminController/manageProducts');

// Import validation middleware
const {
  validateProductData,
  validatePriceComparison
} = require('../../validators/admin/product-validator');

const {
  validateCategoryData,
  validateCategoryImage
} = require('../../validators/admin/category-validator');
const {
  validateCreateOffer,
  validateUpdateOffer
} = require('../../validators/admin/offer-validator');
const {
  validateCreateCoupon,
  validateUpdateCoupon
} = require('../../validators/admin/coupon-validator');

const manageOrderController = require('../../controllers/adminController/manage-orders.js')
const returnManagementController = require('../../controllers/adminController/return-management.js')

const couponController = require('../../controllers/adminController/coupon-controller');

const offerController = require('../../controllers/adminController/offer-controller');

const salesController = require('../../controllers/adminController/sales-controller.js')

// Import admin middleware
const { isAdminAuthenticated, isAdminNotAuthenticated, preventCache } = require('../../middlewares/adminMiddleware');

const upload = require('../../config/multer');

// Public admin routes (no authentication required)
adminRoute.get('/adminLogin', isAdminNotAuthenticated, preventCache, adminController.getAdminLogin);
adminRoute.post('/adminLogin', isAdminNotAuthenticated, adminController.postAdminLogin);

// Protected admin routes (authentication required)
// Apply middleware to all protected routes

adminRoute.use(isAdminAuthenticated);
adminRoute.use(preventCache);

// Admin Dashboard
adminRoute.get('/adminDashboard', dashboardController.getDashboard);
adminRoute.get('/adminLogout', adminController.logoutAdminDashboard);

// User Management
adminRoute.get('/getUsers', adminUserController.getUsers);
adminRoute.put('/getUsers/:id/block', adminUserController.blockUser);
adminRoute.put('/getUsers/:id/unblock', adminUserController.unblockUser);

// Category Management
adminRoute.get('/categories', categoryController.getCategory);
adminRoute.post('/categories',
  upload.single('image'),
  validateCategoryData,
  validateCategoryImage,
  categoryController.addCategory
);
adminRoute.put('/categories/:id',
  upload.single('image'),
  validateCategoryData,
  validateCategoryImage,
  categoryController.editCategory
);
adminRoute.put('/categories/:id/toggle', categoryController.toggleCategoryStatus);

// Product Management
adminRoute.get('/getProducts', productController.getProducts);
adminRoute.get('/add-product', manageProductController.getAddProduct);
adminRoute.post(
  '/products',
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
adminRoute.put('/products/:id/toggle', productController.toggleProductStatus);

// Category List for Dropdown
adminRoute.get('/categories/list', async (req, res) => {
  try {
    const categories = await require('../../models/categorySchema').find({ isListed: true });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

adminRoute.get('/products/:id/edit', productController.getEditProduct);
adminRoute.post('/products/:id',
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
adminRoute.put('/products/:id',
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
adminRoute.put('/products/:id/soft-delete', productController.softDeleteProduct);

// Order Management
adminRoute.get('/getOrders', manageOrderController.getManageOrders);
adminRoute.get('/orders/:id', manageOrderController.getOrderDetails);
adminRoute.put('/orders/:id/status', manageOrderController.updateOrderStatus);
adminRoute.get('/orders/:id/invoice', manageOrderController.downloadInvoice);
adminRoute.put('/orders/:id/return-request', manageOrderController.approveReturnRequest);

// Return Management
adminRoute.get('/return-management', returnManagementController.getReturnRequests);
adminRoute.get('/return-management/:id', returnManagementController.getReturnRequestDetails);
adminRoute.put('/return-management/:id/process', returnManagementController.processReturnRequest);
adminRoute.post('/return-management/bulk-process', returnManagementController.bulkProcessReturns);

// Coupon Management
adminRoute.get('/coupons', couponController.getCoupons);
adminRoute.get('/coupons/:id', couponController.getCouponDetails);
adminRoute.post('/coupons', validateCreateCoupon, couponController.createCoupon);
adminRoute.put('/coupons/:id', validateUpdateCoupon, couponController.updateCoupon);
adminRoute.put('/coupons/:id/toggle-status', couponController.toggleCouponStatus);


// Offer Management

adminRoute.get('/offers', offerController.getOffers);
adminRoute.post('/offers', validateCreateOffer, offerController.createOffer);
adminRoute.get('/offers/:id', offerController.getOfferDetails); // For fetching details for edit/view
adminRoute.put('/offers/:id', validateUpdateOffer, offerController.updateOffer);
adminRoute.put('/offers/:id/toggle-status', offerController.toggleOfferStatus);

//Sales Management

adminRoute.get('/sales',salesController.getSales)
adminRoute.get('/sales/export/excel', salesController.exportToExcel)
adminRoute.get('/sales/export/pdf', salesController.exportToPDF)

module.exports = adminRoute;