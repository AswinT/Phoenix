const Product = require("../models/product");

class ProductQueryService {
    static buildSearchQuery(queryParams) {
        const { search, category, brand, price } = queryParams;
        const query = { isExisting: true };

        if (search && search.trim()) {
            query.name = { $regex: search.trim(), $options: "i" };
        }

        if (category && category.trim()) {
            query.category = category.trim();
        }

        if (brand && brand.trim()) {
            query.brand = brand.trim();
        }

        if (price && price.trim()) {
            this.addPriceFilter(query, price.trim());
        }

        return query;
    }

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
                sort.createdAt = -1;
                break;
        }

        return sort;
    }

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

    static calculatePagination(page, totalProducts, limit) {
        const totalPages = Math.ceil(totalProducts / limit);
        const skip = (page - 1) * limit;
        
        return { totalPages, skip };
    }

    static buildRedirectUrl(queryParams, page = 1) {
        const { search = '', category = '', brand = '', price = '', sort = 'added-desc' } = queryParams;
        
        return `/admin/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&brand=${encodeURIComponent(brand)}&price=${encodeURIComponent(price)}&sort=${encodeURIComponent(sort)}&page=${page}`;
    }

    static async getProductsWithPagination(queryParams, page, limit) {
        const query = this.buildSearchQuery(queryParams);
        const sort = this.buildSortOptions(queryParams.sort);
        
        const totalProducts = await Product.countDocuments(query);
        const { totalPages, skip } = this.calculatePagination(page, totalProducts, limit);
        
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