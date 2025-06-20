const Product = require("../models/product");

// Service class to handle product form validation
class ProductValidationService {
    // Validate all required product fields
    static validateRequiredFields(body) {
        const requiredFields = [
            "name",
            "modelNumber", 
            "category",
            "color",
            "description",
            "brand",
            "driverSize",
            "connectivity",
            "regularPrice",
            "salePrice",
            "stock"
        ];

        const errors = {};

        requiredFields.forEach((field) => {
            if (!body[field] || body[field].toString().trim() === "") {
                errors[field] = `${field} is required`;
            }
        });

        return errors;
    }

    // Validate custom driver size format
    static validateDriverSize(body, errors) {
        if (body.driverSize === 'custom') {
            if (!body.customDriverSize || body.customDriverSize.trim() === '') {
                errors.driverSize = 'Please enter a custom driver size';
            } else if (!/^\d+(\.\d+)?\s*(mm|cm|inch|in)$/i.test(body.customDriverSize.trim())) {
                errors.driverSize = 'Please enter a valid size with unit (e.g., 45mm, 1.8in)';
            }
        }
    }

    // Validate product pricing logic
    static validatePricing(body, errors) {
        if (body.regularPrice && (isNaN(body.regularPrice) || body.regularPrice < 0)) {
            errors.regularPrice = "Regular price must be a positive number";
        }

        if (body.salePrice && (isNaN(body.salePrice) || body.salePrice < 0)) {
            errors.salePrice = "Sale price must be a positive number";
        }

        // Ensure sale price is not higher than regular price
        if (body.salePrice && body.regularPrice && !isNaN(body.salePrice) && !isNaN(body.regularPrice)) {
            const regular = parseFloat(body.regularPrice);
            const sale = parseFloat(body.salePrice);
            if (sale > regular) {
                errors.salePrice = "Sale price cannot be greater than regular price";
            }
        }
    }

    // Validate stock quantity
    static validateStock(body, errors) {
        if (body.stock && (isNaN(body.stock) || body.stock < 0)) {
            errors.stock = "Stock must be a positive number";
        }
    }

    // Check if product name already exists (case-insensitive)
    static async validateProductUniqueness(name, productId = null) {
        const query = {
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        };
        
        // Exclude current product when updating
        if (productId) {
            query._id = { $ne: productId };
        }

        const existingProduct = await Product.findOne(query);
        return existingProduct ? 'The headphone already exists' : null;
    }

    // Main validation method that combines all validations
    static async validateProduct(body, productId = null) {
        const errors = this.validateRequiredFields(body);
        
        const uniquenessError = await this.validateProductUniqueness(body.name, productId);
        if (uniquenessError) {
            errors.name = uniquenessError;
        }

        this.validateDriverSize(body, errors);
        this.validatePricing(body, errors);
        this.validateStock(body, errors);

        return errors;
    }
}

module.exports = ProductValidationService;