const Product = require("../models/product");

class ProductDisplayService {
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

    static async getLandingPageProducts() {
        try {
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