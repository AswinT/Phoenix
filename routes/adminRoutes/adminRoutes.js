const express = require('express');
const adminRoute = express.Router();
const adminController = require('../../controllers/adminController/adminLoginController');
const dashboardController = require('../../controllers/adminController/dashboardController');
const adminUserController = require('../../controllers/adminController/getUserController');
const categoryController = require('../../controllers/adminController/categoryController');
const productController = require('../../controllers/adminController/productController.js');
const manageProductController = require('../../controllers/adminController/manageProducts');
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
const manageOrderController = require('../../controllers/adminController/manageOrders.js')
const returnManagementController = require('../../controllers/adminController/returnManagement.js')
const couponController = require('../../controllers/adminController/couponController');
const offerController = require('../../controllers/adminController/offerController');
const salesController = require('../../controllers/adminController/salesController.js')
const { isAdminAuthenticated, isAdminNotAuthenticated, preventCache } = require('../../middlewares/adminMiddleware');
const upload = require('../../config/multer');
adminRoute.get('/adminLogin', isAdminNotAuthenticated, preventCache, adminController.getAdminLogin);
adminRoute.post('/adminLogin', isAdminNotAuthenticated, adminController.postAdminLogin);
adminRoute.use(isAdminAuthenticated);
adminRoute.use(preventCache);
adminRoute.get('/adminDashboard', dashboardController.getDashboard);
adminRoute.get('/adminLogout', adminController.logoutAdminDashboard);
adminRoute.get('/getUsers', adminUserController.getUsers);
adminRoute.put('/getUsers/:id/block', adminUserController.blockUser);
adminRoute.put('/getUsers/:id/unblock', adminUserController.unblockUser);
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
adminRoute.get('/getOrders', manageOrderController.getManageOrders);
adminRoute.get('/orders/:id', manageOrderController.getOrderDetails);
adminRoute.put('/orders/:id/status', manageOrderController.updateOrderStatus);
adminRoute.get('/orders/:id/invoice', manageOrderController.downloadInvoice);
adminRoute.put('/orders/:id/return-request', manageOrderController.approveReturnRequest);
adminRoute.get('/return-management', returnManagementController.getReturnRequests);
adminRoute.get('/return-management/:id', returnManagementController.getReturnRequestDetails);
adminRoute.put('/return-management/:id/process', returnManagementController.processReturnRequest);
adminRoute.post('/return-management/bulk-process', returnManagementController.bulkProcessReturns);
adminRoute.get('/coupons', couponController.getCoupons);
adminRoute.get('/coupons/:id', couponController.getCouponDetails);
adminRoute.post('/coupons', validateCreateCoupon, couponController.createCoupon);
adminRoute.put('/coupons/:id', validateUpdateCoupon, couponController.updateCoupon);
adminRoute.put('/coupons/:id/toggle-status', couponController.toggleCouponStatus);
adminRoute.get('/offers', offerController.getOffers);
adminRoute.post('/offers', validateCreateOffer, offerController.createOffer);
adminRoute.get('/offers/:id', offerController.getOfferDetails);
adminRoute.put('/offers/:id', validateUpdateOffer, offerController.updateOffer);
adminRoute.put('/offers/:id/toggle-status', offerController.toggleOfferStatus);
adminRoute.get('/sales', salesController.getSales);
adminRoute.get('/sales/export/excel', salesController.exportToExcel);
adminRoute.get('/sales/export/pdf', salesController.exportToPDF);
module.exports = adminRoute;