const express = require("express")
const router = express.Router();

// Import admin controllers
const adminController = require("../controllers/admin/adminController")
const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const productController = require("../controllers/admin/productController")
const upload = require("../middlewares/multer")

// Admin authentication routes
router.get("/login", adminController.getadminLogin)
router.post("/login", adminController.login)
router.post("/adminlogout", adminController.adminLogout)

// Dashboard routes
router.get("/", adminController.adminDashboard)
router.get("/dashboard", adminController.adminDashboard)

// Customer management routes
router.get("/customers", customerController.customerList)
router.patch("/customer-block-unblock/:id", customerController.customerControll)

// Category management routes
router.get("/category", categoryController.categoryListing)
router.post("/category-list-unlist/:id", categoryController.categoryListUnlist)
router.get("/category/add", categoryController.addCategory)
router.post("/add-category", categoryController.newCategory)
router.get("/category/edit/:id", categoryController.editCategory)
router.post("/update-category/:id", categoryController.updateCategory)
router.post("/category/delete/:id", categoryController.softdeleteCategory)

// Product management routes
router.get("/products", productController.productListing)
router.get("/product/add", productController.newProduct)
router.get("/product/edit/:id", productController.editProduct)

// Product creation with image upload (supports up to 5 images)
router.post("/product/add",
    upload.fields([
        { name: 'images[0].file', maxCount: 1 },
        { name: 'images[1].file', maxCount: 1 },
        { name: 'images[2].file', maxCount: 1 },
        { name: 'images[3].file', maxCount: 1 },
        { name: 'images[4].file', maxCount: 1 }
    ]),
    productController.addProduct
)

// Product update with image upload
router.put("/products/:id",
    upload.fields([
        { name: 'images[0].file', maxCount: 1 },
        { name: 'images[1].file', maxCount: 1 },
        { name: 'images[2].file', maxCount: 1 },
        { name: 'images[3].file', maxCount: 1 },
        { name: 'images[4].file', maxCount: 1 }
    ]),
    productController.updateProduct
)

// Product image management
router.delete("/products/:id/images/:imageIndex", productController.deleteProductImage)
router.patch("/products/:id/images/:imageIndex/set-main", productController.setMainProductImage)

// Product status management
router.post("/product-toggle/:id", productController.toggleProduct)
router.post("/product/delete/:id", productController.softDelete)

module.exports = router
