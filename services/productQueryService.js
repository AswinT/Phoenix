const Product = require("../models/product");

// Service class to handle product database queries and filtering
class ProductQueryService {
    // Build MongoDB query object from search parameters
    static buildSearchQuery(queryParams) {
        const { search, category, brand, price } = queryParams;
        const query = { isExisting: true }; // Only show active products

        // Text search in product names
        if (search && search.trim()) {
            query.name = { $regex: search.trim(), $options: "i" };
        }

        // Filter by category
        if (category && category.trim()) {
            query.category = category.trim();
        }

        // Filter by brand
        if (brand && brand.trim()) {
            query.brand = brand.trim();
        }

        // Filter by price range
        if (price && price.trim()) {
            this.addPriceFilter(query, price.trim());
        }

        return query;
    }

    // Add price range filters to query
    static addPriceFilter(query, priceFilter) {
        switch (priceFilter) {
            case "0-1000":
                query.salePrice = { $gte: 0, $lte: 1000 };
                break;
            case "1000-5000":
                query.salePrice = { $gte: 1000, $lte: 5000 };
                break;
            case "5000+":
                query.salePrice = { $gte: 5000 };
                break;
        }
    }

    // Build sorting options for product queries
    static buildSortOptions(sortOption) {
        const sort = {};
        
        switch (sortOption) {
            case "price-asc":
                sort.salePrice = 1;
                break;
            case "price-desc":
                sort.salePrice = -1;
                break;
            case "added-desc":
            default:
                sort.createdAt = -1; // Newest first by default
                break;
        }

        return sort;
    }

    // Get unique categories and brands for filter dropdowns
    static async getFilterOptions() {
        const [categories, brands] = await Promise.all([
            Product.aggregate([
                { $group: { _id: "$category" } },
                { $project: { name: "$_id", _id: 0 } },
                { $sort: { name: 1 } },
            ]),
            Product.distinct("brand", { isExisting: true })
        ]);

        return { categories, brands };
    }

    // Calculate pagination values
    static calculatePagination(page, totalProducts, limit) {
        const totalPages = Math.ceil(totalProducts / limit);
        const skip = (page - 1) * limit;
        
        return { totalPages, skip };
    }

    // Build URL with query parameters for redirects
    static buildRedirectUrl(queryParams, page = 1) {
        const { search = '', category = '', brand = '', price = '', sort = 'added-desc' } = queryParams;
        
        return `/admin/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&brand=${encodeURIComponent(brand)}&price=${encodeURIComponent(price)}&sort=${encodeURIComponent(sort)}&page=${page}`;
    }

    // Main method to get products with pagination and filtering
    static async getProductsWithPagination(queryParams, page, limit) {
        const query = this.buildSearchQuery(queryParams);
        const sort = this.buildSortOptions(queryParams.sort);
        
        const totalProducts = await Product.countDocuments(query);
        const { totalPages, skip } = this.calculatePagination(page, totalProducts, limit);
        
        // Redirect to page 1 if invalid page number
        if (page < 1 || (totalPages > 0 && page > totalPages)) {
            return { 
                shouldRedirect: true, 
                redirectUrl: this.buildRedirectUrl(queryParams, 1) 
            };
        }

        const products = await Product.find(query).sort(sort).skip(skip).limit(limit);
        
        return {
            products,
            totalProducts,
            totalPages,
            shouldRedirect: false
        };
    }
}

module.exports = ProductQueryService;