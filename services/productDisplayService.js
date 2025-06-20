const Product = require("../models/product");

// Service class to handle product display logic for frontend
class ProductDisplayService {
    // Get latest active products for homepage display
    static async getLatestProducts(limit = 4) {
        try {
            return await Product.find({ 
                isActive: true, 
                isExisting: true 
            })
            .sort({ updatedAt: -1 })
            .limit(limit)
            .populate('categoryId');
        } catch (error) {
            console.error('Error fetching latest products:', error);
            throw new Error('Failed to fetch latest products');
        }
    }

    // Get products filtered by category
    static async getProductsByCategory(category, limit = 4) {
        try {
            return await Product.find({
                isActive: true,
                isExisting: true,
                category: category
            })
            .sort({ updatedAt: -1 })
            .limit(limit)
            .populate("categoryId");
        } catch (error) {
            console.error(`Error fetching ${category} products:`, error);
            throw new Error(`Failed to fetch ${category} products`);
        }
    }

    // Get all products needed for landing page display
    static async getLandingPageProducts() {
        try {
            // Fetch both latest products and gaming products simultaneously
            const [products, gamingProducts] = await Promise.all([
                this.getLatestProducts(4),
                this.getProductsByCategory("Gaming", 4)
            ]);

            return {
                products,
                gamingProducts
            };
        } catch (error) {
            console.error('Error fetching landing page products:', error);
            throw new Error('Failed to fetch landing page products');
        }
    }
}

module.exports = ProductDisplayService;