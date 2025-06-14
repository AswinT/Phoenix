const express = require("express");
const adminRoute = express.Router();

const adminController = require("../controllers/admin/admin-auth-controller");
const getUsersController = require("../controllers/admin/get-usersController");
const getCategoryController = require("../controllers/admin/get-categoryController");
const productController = require("../controllers/admin/product-controller");
const { productUpload, handleMulterError } = require("../config/multer-config");

const { isAdminAuthenticated, noCache } = require('../middleware/auth-middleware');

// Admin Authentication Routes
adminRoute.get("/admin/login", adminController.getAdminLogin);
adminRoute.post("/admin/login", adminController.postAdminLogin);
adminRoute.get("/admin/logout", isAdminAuthenticated, noCache, adminController.logoutAdminDashboard);

// Admin Dashboard
adminRoute.get("/admin/dashboard", isAdminAuthenticated, noCache, adminController.getAdminDashboard);

// User Management Routes
adminRoute.get("/admin/users", isAdminAuthenticated, noCache, getUsersController.getUsers);
adminRoute.get("/admin/users/api", isAdminAuthenticated, noCache, getUsersController.getUsersApi);
adminRoute.get("/admin/users/:id", isAdminAuthenticated, noCache, getUsersController.getUserById);
adminRoute.put("/admin/users/:id/block", isAdminAuthenticated, noCache, getUsersController.blockUser);
adminRoute.put("/admin/users/:id/unblock", isAdminAuthenticated, noCache, getUsersController.unblockUser);

// Category Management Routes
adminRoute.get('/admin/categories', isAdminAuthenticated, noCache, getCategoryController.renderCategoryManagementPage);
adminRoute.get('/admin/categories/api', isAdminAuthenticated, noCache, getCategoryController.getAllCategoriesAPI);
adminRoute.post('/admin/categories/api', isAdminAuthenticated, noCache, getCategoryController.addCategoryAPI);
adminRoute.put('/admin/categories/:id', isAdminAuthenticated, noCache, getCategoryController.updateCategoryAPI);
adminRoute.patch('/admin/categories/:id/status', isAdminAuthenticated, noCache, getCategoryController.toggleCategoryStatusAPI);
adminRoute.delete('/admin/categories/:id', isAdminAuthenticated, noCache, getCategoryController.deleteCategoryAPI);

// Product Management Routes
adminRoute.get('/admin/products', isAdminAuthenticated, noCache, productController.getProducts);
adminRoute.get('/admin/products/add', isAdminAuthenticated, noCache, productController.getAddProduct);
adminRoute.get('/admin/products/:id/edit', isAdminAuthenticated, noCache, productController.getEditProduct);

// Product API Routes
adminRoute.post('/admin/api/products', isAdminAuthenticated, noCache, productUpload.array('productImages', 10), handleMulterError, productController.addProduct);
adminRoute.get('/admin/api/products/:id', isAdminAuthenticated, noCache, productController.getProductById);
adminRoute.put('/admin/api/products/:id', isAdminAuthenticated, noCache, productUpload.array('productImages', 10), handleMulterError, productController.updateProduct);
adminRoute.delete('/admin/api/products/:id', isAdminAuthenticated, noCache, productController.deleteProduct);
adminRoute.patch('/admin/api/products/:id/status', isAdminAuthenticated, noCache, productController.toggleProductStatus);

// API for user dashboard
adminRoute.get('/admin/api/products-for-user', isAdminAuthenticated, noCache, productController.getProductsForUser);




module.exports = adminRoute;