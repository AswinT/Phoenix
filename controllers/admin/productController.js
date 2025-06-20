const Product = require("../../models/product")
const Category = require("../../models/category")
const cloudinary = require("../../config/cloudinary")
const fs = require("fs")

// Import service modules for product management
const ProductValidationService = require("../../services/productValidationService")
const ImageUploadService = require("../../services/imageUploadService")
const ProductQueryService = require("../../services/productQueryService")
const ProductDataService = require("../../services/productDataService")

// Display paginated product list with search and filter functionality
const productListing = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        // Extract query parameters and pagination settings
        const queryParams = ProductDataService.extractQueryParams(req.query);
        const { page, limit } = ProductDataService.extractPaginationParams(req.query);

        // Get filter options for dropdowns
        const { categories, brands } = await ProductQueryService.getFilterOptions();

        // Fetch products with applied filters and pagination
        const result = await ProductQueryService.getProductsWithPagination(queryParams, page, limit);
        
        if (result.shouldRedirect) {
            return res.redirect(result.redirectUrl);
        }

        res.render("admin/productListing", {
            products: result.products,
            categories,
            brands,
            searchQuery: queryParams.search,
            query: {
                category: queryParams.category,
                brand: queryParams.brand,
                price: queryParams.price,
                sort: queryParams.sort,
            },
            currentPage: page,
            totalPages: result.totalPages,
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        next(error);
    }
}

// Display add product form
const newProduct = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        const categories = await ProductDataService.getAllCategories();
        res.render("admin/addProduct", { categories, errors: null, formData: null });
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error);
    }
}

// Create new product with validation and image upload
const addProduct = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        // Validate product data
        const errors = await ProductValidationService.validateProduct(req.body);
        const formData = { ...req.body };

        if (Object.keys(errors).length > 0) {
            const categories = await ProductDataService.getAllCategories();
            return res.render("admin/addProduct", { categories, errors, formData });
        }

        // Upload product images (minimum 3 required)
        const { images, errors: imageErrors } = await ImageUploadService.uploadProductImages(req.files);
        
        if (Object.keys(imageErrors).length > 0) {
            const categories = await ProductDataService.getAllCategories();
            return res.render("admin/addProduct", { 
                categories, 
                errors: { ...errors, ...imageErrors }, 
                formData 
            });
        }

        try {
            // Find category and build product data
            const category = await ProductDataService.findCategoryByName(req.body.category);
            const productData = ProductDataService.buildProductData(req.body, category._id, images);

            // Save product to database
            const product = new Product(productData);
            await product.save();
            
            res.redirect("/admin/products");
            
        } catch (err) {
            console.error("Error saving product:", err);
            const categories = await ProductDataService.getAllCategories();
            res.render("admin/addProduct", {
                formData,
                categories,
                errors: { database: `Failed to save product: ${err.message}` },
            });
        }

    } catch (error) {
        console.error('Error adding product:', error);
        next(error);
    }
}

const editProduct = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin/login");

        const productId = req.params.id;
        const product = await Product.findById(productId);
        const categories = await ProductDataService.getAllCategories();

        return res.render("admin/productDetails", { product, categories, errors: null, formData: null });
    } catch (error) {
        console.error('Error fetching product:', error);
        next(error);
    }
}

const updateProduct = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        const productId = req.params.id;

        const errors = await ProductValidationService.validateProduct(req.body, productId);

        if (Object.keys(errors).length > 0) {
            const product = await Product.findById(productId);
            const categories = await ProductDataService.getAllCategories();
            return res.render("admin/productDetails", {
                product,
                categories,
                errors,
                formData: req.body,
            });
        }

        const existingProduct = await Product.findById(productId).select("images");
        const existingImages = existingProduct?.images || [];
        const images = await ImageUploadService.updateProductImages(req.files, existingImages);

        try {
            const category = await ProductDataService.findCategoryByName(req.body.category);
            const productData = ProductDataService.buildProductData(req.body, category._id, images);

            const updatedProduct = await Product.findByIdAndUpdate(productId, productData, {
                new: true,
                runValidators: true,
            });

            if (!updatedProduct) {
                throw new Error("Product not found");
            }

            res.redirect("/admin/products");
            
        } catch (err) {
            console.error("Error updating product:", err);
            const product = await Product.findById(productId);
            const categories = await ProductDataService.getAllCategories();
            res.render("admin/productDetails", {
                product,
                categories,
                errors: { database: err.message || "Failed to update product" },
                formData: req.body,
            });
        }

    } catch (error) {
        console.error("Error updating product:", error);
        next(error);
    }
};

// Toggle product active/inactive status
const toggleProduct = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        const productId = req.params.id
        const product = await Product.findById(productId)

        if (!product) {
            return res.json({ success: false, message: "Product not found" })
        }

        // Toggle active status
        product.isActive = !product.isActive
        await product.save()

        res.json({ success: true, message: "Product status changed" })
    } catch (error) {
        console.error('Error toggling product status:', error);
        next(error);
    }
}

// Soft delete product (mark as non-existing)
const softDelete = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        const productId = req.params.id
        const product = await Product.findById(productId)

        if (!product) {
            return res.json({ success: false, message: "Product not found" })
        }

        // Mark as non-existing instead of hard delete
        product.isExisting = !product.isExisting
        await product.save()

        return res.json({ success: true, message: "Product deleted successfully" })
    } catch (error) {
        console.error('Error deleting product:', error);
        next(error);
    }
}

// Delete individual product image with validation
const deleteProductImage = async (req, res, next) => {
    try {
        if (!req.session.admin) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const productId = req.params.id;
        const imageIndex = parseInt(req.params.imageIndex);

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Validate image index
        if (!product.images || imageIndex < 0 || imageIndex >= product.images.length) {
            return res.status(400).json({ success: false, message: "Invalid image index" });
        }

        // Ensure minimum 3 images requirement
        if (product.images.length <= 3) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete image. Products must have at least 3 images."
            });
        }

        const imageToDelete = product.images[imageIndex];
        const wasMainImage = imageToDelete.isMain;

        // Remove image from array
        product.images.splice(imageIndex, 1);

        // Set new main image if deleted image was main
        if (wasMainImage && product.images.length > 0) {
            product.images[0].isMain = true;
            for (let i = 1; i < product.images.length; i++) {
                product.images[i].isMain = false;
            }
        }

        await product.save();

        // Clean up image from Cloudinary if applicable
        try {
            if (imageToDelete.url && imageToDelete.url.includes('cloudinary')) {
                const cloudinary = require('cloudinary').v2;
                const urlParts = imageToDelete.url.split('/');
                const publicIdWithExtension = urlParts[urlParts.length - 1];
                const publicId = publicIdWithExtension.split('.')[0];
                await cloudinary.uploader.destroy(`headphones/${publicId}`);
            }
        } catch (cloudinaryError) {
            console.error('Error deleting image from Cloudinary:', cloudinaryError);
        }

        res.json({
            success: true,
            message: "Image deleted successfully",
            newMainImage: wasMainImage && product.images.length > 0 ? product.images[0] : null
        });

    } catch (error) {
        console.error('Error deleting product image:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while deleting the image"
        });
    }
};

// Set specific image as main product image
const setMainProductImage = async (req, res, next) => {
    try {
        if (!req.session.admin) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const productId = req.params.id;
        const imageIndex = parseInt(req.params.imageIndex);

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Validate image index
        if (!product.images || imageIndex < 0 || imageIndex >= product.images.length) {
            return res.status(400).json({ success: false, message: "Invalid image index" });
        }

        // Update main image status for all images
        product.images.forEach((img, index) => {
            img.isMain = index === imageIndex;
        });

        await product.save();

        res.json({
            success: true,
            message: "Main image updated successfully",
            mainImage: product.images[imageIndex]
        });

    } catch (error) {
        console.error('Error setting main product image:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while updating the main image"
        });
    }
};

module.exports = {
    productListing,
    newProduct,
    addProduct,
    editProduct,
    updateProduct,
    toggleProduct,
    softDelete,
    deleteProductImage,
    setMainProductImage
}
