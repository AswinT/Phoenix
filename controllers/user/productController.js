const Category = require("../../models/category");
const Product = require("../../models/product");
const Review = require("../../models/review");

// Display filtered and paginated product list for users
const listProducts = async (req, res, next) => {
    try {
        const user = req.session.user;

        // Extract and process search and filter parameters
        const searchQuery = req.query.search ? req.query.search.trim() : "";
        const hasValidSearch = searchQuery !== "";
        
        const categoryFilter = req.query.category ? (Array.isArray(req.query.category) ? req.query.category : req.query.category.split(",")) : [];
        const brandFilter = req.query.brand ? req.query.brand.trim() : "";
        
        const connectivityFilter = req.query.connectivity ? (Array.isArray(req.query.connectivity) ? req.query.connectivity : req.query.connectivity.split(",")) : [];
        const driverSizeFilter = req.query.driverSize ? (Array.isArray(req.query.driverSize) ? req.query.driverSize : req.query.driverSize.split(",")) : [];
        
        const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
        const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
        const sortOption = req.query.sort || "newest";

        // Pagination setup
        const page = parseInt(req.query.page) || 1;
        const limit = 9; // Products per page
        const skip = (page - 1) * limit;

        // Get only active categories for filtering
        const activeCategories = await Category.find({ isListed: true, isExisting: true }).select('name');
        const activeCategoryNames = activeCategories.map(cat => cat.name);
        
        // Base query - only show active products from active categories
        const query = { 
            isActive: true, 
            isExisting: true,
            category: { $in: activeCategoryNames }
        };
        // Handle search functionality
        if (hasValidSearch && searchQuery) {
            query.name = { $regex: searchQuery, $options: "i" };
        } else if (req.query.search !== undefined && !hasValidSearch) {
            // Return empty results for invalid search
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

        // Apply category filter
        if (categoryFilter.length > 0) {
            const validCategories = categoryFilter.filter(cat => activeCategoryNames.includes(cat));
            if (validCategories.length > 0) {
                query.category = { $in: validCategories };
            } else {
                query.category = { $in: [] }; // No valid categories
            }
        }
        
        // Apply brand filter
        if (brandFilter) {
            query.brand = brandFilter;
        }

        // Apply connectivity filter
        if (connectivityFilter.length > 0) {
            query.connectivity = { $in: connectivityFilter };
        }

        // Apply driver size filter
        if (driverSizeFilter.length > 0) {
            query.driverSize = { $in: driverSizeFilter };
        }
        
        // Apply price range filter
        if (maxPrice || minPrice) {
            query.salePrice = {};
            if (minPrice) query.salePrice.$gte = minPrice;
            if (maxPrice) query.salePrice.$lte = maxPrice;
        }

        // Build sort options
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
            sort.updatedAt = -1; // Most recently updated
        }

        try {
            // Fetch products with applied filters, sorting, and pagination
            const products = await Product.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('categoryId');

            // Get filter options for the sidebar
            const brands = await Product.distinct("brand", { isActive: true, isExisting: true, category: { $in: activeCategoryNames } });
            const connectivityOptions = await Product.distinct("connectivity", { isActive: true, isExisting: true, category: { $in: activeCategoryNames } });
            const driverSizes = await Product.distinct("driverSize", { isActive: true, isExisting: true, category: { $in: activeCategoryNames } });

            // Calculate pagination
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

// Display individual product details with reviews and suggestions
const viewProduct = async (req, res, next) => {
    try {
        const user = req.session.user;
        const productId = req.params.id;

        // Fetch product details
        const product = await Product.findById(productId).populate('categoryId');

        // Check if product is available
        if (!product || !product.isActive || !product.isExisting) {
            return res.redirect('/products?error=Product+not+available');
        }

        // Check if product's category is active
        const category = await Category.findOne({ name: product.category });
        if (!category || !category.isListed || !category.isExisting) {
            return res.redirect('/products?error=Product+not+available');
        }

        // Get active categories for filtering suggestions
        const activeCategories = await Category.find({ isListed: true, isExisting: true }).select('name');
        const activeCategoryNames = activeCategories.map(cat => cat.name);
        
        // Fetch related product suggestions from same category
        const suggestionCategory = product.category;
        const productSuggestions = await Product.find({
            category: suggestionCategory,
            _id: { $ne: productId }, // Exclude current product
            isActive: true,
            isExisting: true,
            category: { $in: activeCategoryNames }
        }).limit(4).populate('categoryId');

        // Get review statistics for the product
        const reviewStats = await Review.getProductRatingStats(productId);

        // Check if current user has already reviewed this product
        let userHasReviewed = false;
        let userReview = null;
        if (user) {
            userReview = await Review.findOne({
                productId,
                userId: user._id
            });
            userHasReviewed = !!userReview;
        }

        // Fetch recent approved reviews
        const recentReviews = await Review.find({
            productId,
            isApproved: true
        })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('userId', 'fullname')
        .lean();
        
        // Format reviews with time ago
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

// Helper function to calculate time difference for reviews
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