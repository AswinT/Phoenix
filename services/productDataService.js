const Category = require("../models/category");

// Service class to handle product data processing and transformation
class ProductDataService {
    // Build complete product object from form data
    static buildProductData(body, categoryId, images) {
        // Handle custom driver size input
        const finalDriverSize = body.driverSize === 'custom'
            ? body.customDriverSize.trim()
            : body.driverSize;

        return {
            name: body.name,
            modelNumber: body.modelNumber,
            category: body.category,
            color: body.color,
            description: body.description,
            categoryId: categoryId,
            brand: body.brand,
            driverSize: finalDriverSize,
            connectivity: body.connectivity,
            noiseCancellation: body.noiseCancellation === "on",
            microphoneIncluded: body.microphoneIncluded === "on",
            stock: parseInt(body.stock) || 0,
            isActive: body.isActive === "on",
            regularPrice: parseFloat(body.regularPrice),
            salePrice: parseFloat(body.salePrice),
            warranty: body.warranty,
            images: images,
            isExisting: true,
        };
    }

    // Find category by name and validate existence
    static async findCategoryByName(categoryName) {
        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            throw new Error("Selected category not found");
        }
        return category;
    }

    // Get all active categories for dropdown lists
    static async getAllCategories() {
        return await Category.find({ isExisting: true }).sort({ name: 1 });
    }

    // Extract and sanitize search/filter parameters
    static extractQueryParams(query) {
        return {
            search: query.search ? query.search.trim() : "",
            category: query.category ? query.category.trim() : "",
            brand: query.brand ? query.brand.trim() : "",
            price: query.price ? query.price.trim() : "",
            sort: query.sort || "added-desc"
        };
    }

    // Extract pagination parameters with defaults
    static extractPaginationParams(query) {
        const page = parseInt(query.page) || 1;
        const limit = 8; // Products per page
        
        return { page, limit };
    }
}

module.exports = ProductDataService;