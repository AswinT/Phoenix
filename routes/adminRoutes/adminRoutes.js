const express = require('express');
const adminRoute = express.Router();

const adminController = require('../../controllers/adminController/adminLoginController');
const dashboardController = require('../../controllers/adminController/dashboard-controller');
const adminUserController = require('../../controllers/adminController/getUserController');
const categoryController = require('../../controllers/adminController/categoryController');
const productController = require('../../controllers/adminController/productController.js');
const manageProductController = require('../../controllers/adminController/manageProducts');
const { validateProductForm, validateProductImages } = require('../../validators/admin/product-backend-validation');

const manageOrderController = require('../../controllers/adminController/manage-orders.js')
const returnManagementController = require('../../controllers/adminController/return-management.js')




const { isAdminAuthenticated, isAdminNotAuthenticated, preventCache } = require('../../middlewares/adminMiddleware');

const upload = require('../../config/multer');

// Public Routes
adminRoute.get('/adminLogin', isAdminNotAuthenticated, preventCache, adminController.getAdminLogin);
adminRoute.post('/adminLogin', isAdminNotAuthenticated, adminController.postAdminLogin);

// Protected Routes

adminRoute.use(isAdminAuthenticated);
adminRoute.use(preventCache);

// Dashboard
adminRoute.get('/adminDashboard', dashboardController.getDashboard);


adminRoute.get('/api/dashboard/stats', dashboardController.getDashboardStats);
adminRoute.get('/api/dashboard/chart-data', dashboardController.getChartData);
adminRoute.get('/api/dashboard/recent-orders', dashboardController.getRecentOrdersAPI);
adminRoute.get('/api/dashboard/notifications', dashboardController.getNotificationsAPI);
adminRoute.get('/api/dashboard/low-stock', dashboardController.getLowStockAPI);
adminRoute.get('/api/dashboard/top-products', dashboardController.getTopProductsAPI);


adminRoute.post('/api/dashboard/process-order/:orderId', dashboardController.processOrderAPI);
adminRoute.post('/api/dashboard/update-stock/:productId', dashboardController.updateStockAPI);
adminRoute.post('/api/dashboard/mark-notification-read/:notificationId', dashboardController.markNotificationReadAPI);

adminRoute.get('/adminLogout', adminController.logoutAdminDashboard);

// Users
adminRoute.get('/getUsers', adminUserController.getUsers);
adminRoute.put('/getUsers/:id/block', adminUserController.blockUser);
adminRoute.put('/getUsers/:id/unblock', adminUserController.unblockUser);

// Categories
adminRoute.get('/categories', categoryController.getCategory);
adminRoute.post('/categories', upload.single('image'), categoryController.addCategory);
adminRoute.put('/categories/:id', upload.single('image'), categoryController.editCategory);
adminRoute.put('/categories/:id/toggle', categoryController.toggleCategoryStatus);

// Products
adminRoute.get('/getProducts', productController.getProducts);
adminRoute.get('/add-product', manageProductController.getAddProduct);
adminRoute.post(
  '/products',
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'subImages', maxCount: 3 },
  ]),
  validateProductForm,
  validateProductImages,
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
adminRoute.post('/products/:id', upload.fields([{ name: 'mainImage' }, { name: 'subImages', maxCount: 3 }]), productController.updateProduct);
adminRoute.put('/products/:id', upload.fields([{ name: 'mainImage' }, { name: 'subImages', maxCount: 3 }]), productController.updateProduct);
adminRoute.put('/products/:id/soft-delete', productController.softDeleteProduct);

// Orders
adminRoute.get('/getOrders', manageOrderController.getManageOrders);
adminRoute.get('/orders/:id', manageOrderController.getOrderDetails);
adminRoute.put('/orders/:id/status', manageOrderController.updateOrderStatus);

adminRoute.put('/orders/:id/return-request', manageOrderController.approveReturnRequest);

// Returns
adminRoute.get('/return-management', returnManagementController.getReturnRequests);
adminRoute.get('/return-management/:id', returnManagementController.getReturnRequestDetails);
adminRoute.put('/return-management/:id/process', returnManagementController.processReturnRequest);
adminRoute.post('/return-management/bulk-process', returnManagementController.bulkProcessReturns);



module.exports = adminRoute;