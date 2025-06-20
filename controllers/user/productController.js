const Category = require("../../models/category");
const Product = require("../../models/product");
const Review = require("../../models/review");

const listProducts = async (req, res, next) => {
    try {
        const user = req.session.user;

        const searchQuery = req.query.search ? req.query.search.trim() : "";
        const hasValidSearch = searchQuery !== "";
        
        const categoryFilter = req.query.category ? (Array.isArray(req.query.category) ? req.query.category : req.query.category.split(",")) : [];
        const brandFilter = req.query.brand ? req.query.brand.trim() : "";
        
        const connectivityFilter = req.query.connectivity ? (Array.isArray(req.query.connectivity) ? req.query.connectivity : req.query.connectivity.split(",")) : [];
        const driverSizeFilter = req.query.driverSize ? (Array.isArray(req.query.driverSize) ? req.query.driverSize : req.query.driverSize.split(",")) : [];
        
        const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
        const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
        const sortOption = req.query.sort || "newest";

        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        const activeCategories = await Category.find({ isListed: true, isExisting: true }).select('name');
        const activeCategoryNames = activeCategories.map(cat => cat.name);
        
        const query = { 
            isActive: true, 
            isExisting: true,
            category: { $in: activeCategoryNames }
        };
        if (hasValidSearch && searchQuery) {
            query.name = { $regex: searchQuery, $options: "i" };
        } else if (req.query.search !== undefined && !hasValidSearch) {
            return res.render("user/shoppingPage", {
                products: [],
                categories: await Category.find({ isListed: true, isExisting: true }).sort({ name: 1 }),
                user,
                brands: await Product.distinct("brand", { isActive: true, isExisting: true, category: { $in: activeCategoryNames } }),
                connectivityOptions: await Product.distinct("connectivity", { isActive: true, isExisting: true, category: { $in: activeCategoryNames } }),
                driverSizes: await Product.distinct("driverSize", { isActive: true, isExisting: true, category: { $in: activeCategoryNames } }),
                searchQuery: "",
                query: {
                    category: [],
                    brand: "",
                    connectivity: [],
                    driverSize: [],
                    sort: "newest",
                    maxPrice: null,
                    minPrice: null
                },
                currentPage: 1,
                totalPages: 0,
                totalProducts: 0,
                error: "Please enter a valid search term"
            });
        }

        if (categoryFilter.length > 0) {
            const validCategories = categoryFilter.filter(cat => activeCategoryNames.includes(cat));
            if (validCategories.length > 0) {
                query.category = { $in: validCategories };
            } else {
                query.category = { $in: [] };
            }
        }
        if (brandFilter) {
            query.brand = brandFilter;
        }

        if (connectivityFilter.length > 0) {
            query.connectivity = { $in: connectivityFilter };
        }

        if (driverSizeFilter.length > 0) {
            query.driverSize = { $in: driverSizeFilter };
        }
        if (maxPrice || minPrice) {
            query.salePrice = {};
            if (minPrice) query.salePrice.$gte = minPrice;
            if (maxPrice) query.salePrice.$lte = maxPrice;
        }

        const sort = {};
        if (sortOption === "newest") {
            sort.createdAt = -1;
        } else if (sortOption === "price-asc") {
            sort.salePrice = 1;
        } else if (sortOption === "price-desc") {
            sort.salePrice = -1;
        } else if (sortOption === 'name-asc') {
            sort.name = 1;
        } else if (sortOption === 'name-desc') {
            sort.name = -1;
        } else if (sortOption === "popularity") {
            sort.updatedAt = -1;
        }

        try {
            
            const products = await Product.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('categoryId');

            const brands = await Product.distinct("brand", { isActive: true, isExisting: true, category: { $in: activeCategoryNames } });
            const connectivityOptions = await Product.distinct("connectivity", { isActive: true, isExisting: true, category: { $in: activeCategoryNames } });
            const driverSizes = await Product.distinct("driverSize", { isActive: true, isExisting: true, category: { $in: activeCategoryNames } });

            const totalProducts = await Product.countDocuments(query);
            const totalPages = Math.ceil(totalProducts / limit);

            const categories = await Category.find({ isListed: true, isExisting: true }).sort({ name: 1 });

            res.render("user/shoppingPage", {
                products,
                categories,
                user,
                brands,
                connectivityOptions,
                driverSizes,
                searchQuery,
                query: {
                    category: categoryFilter,
                    brand: brandFilter,
                    connectivity: connectivityFilter,
                    driverSize: driverSizeFilter,
                    sort: sortOption,
                    maxPrice: maxPrice || null,
                    minPrice: minPrice || null
                },
                currentPage: page,
                totalPages,
                totalProducts,
            });

        } catch (error) {
            console.error('Error fetching products:', error);
            res.render("user/shoppingPage", {
                products: [],
                user,
                brands: [],
                connectivityOptions: [],
                driverSizes: [],
                searchQuery: "",
                query: {
                    category: [],
                    brand: "",
                    connectivity: [],
                    driverSize: [],
                    sort: "newest",
                    maxPrice: null,
                    minPrice: null
                },
                currentPage: 1,
                totalPages: 0,
                totalProducts: 0,
                error: "Failed to load headphones",
            });
        }

    } catch (error) {
        console.error('Error fetching products:', error);
        next(error);
    }
};

const viewProduct = async (req, res, next) => {
    try {
        const user = req.session.user;
        const productId = req.params.id;

        const product = await Product.findById(productId).populate('categoryId');

        if (!product || !product.isActive || !product.isExisting) {
            return res.redirect('/products?error=Product+not+available');
        }

        const category = await Category.findOne({ name: product.category });
        if (!category || !category.isListed || !category.isExisting) {
            return res.redirect('/products?error=Product+not+available');
        }

        const activeCategories = await Category.find({ isListed: true, isExisting: true }).select('name');
        const activeCategoryNames = activeCategories.map(cat => cat.name);
        
        const suggestionCategory = product.category;
        const productSuggestions = await Product.find({
            category: suggestionCategory,
            _id: { $ne: productId },
            isActive: true,
            isExisting: true,
            category: { $in: activeCategoryNames }
        }).limit(4).populate('categoryId');

        const reviewStats = await Review.getProductRatingStats(productId);

        let userHasReviewed = false;
        let userReview = null;
        if (user) {
            userReview = await Review.findOne({
                productId,
                userId: user._id
            });
            userHasReviewed = !!userReview;
        }

        const recentReviews = await Review.find({
            productId,
            isApproved: true
        })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('userId', 'fullname')
        .lean();
        const formattedReviews = recentReviews.map(review => ({
            ...review,
            timeAgo: getTimeAgo(review.createdAt)
        }));

        res.render("user/productPage", {
            product,
            user,
            productSuggestions,
            reviewStats,
            userHasReviewed,
            recentReviews: formattedReviews
        });

    } catch (error) {
        console.error('Error fetching product:', error);
        next(error);
    }
};

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}

module.exports = {
    listProducts,
    viewProduct,
};