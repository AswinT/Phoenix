const Product = require("../../models/product-schema");
const Category = require("../../models/category-schema");
const Review = require("../../models/review-schema");

// Helper function to build search filters
const buildSearchFilter = (selectedCategory, searchQuery, minPrice, maxPrice) => {
  const searchFilter = {
    isDeleted: false,
    isBlocked: false,
    isListed: true,
  };

  // Add category filter
  if (selectedCategory) {
    searchFilter.category = selectedCategory;
  }

  // Add search filter
  if (searchQuery) {
    searchFilter.$or = [
      { productName: { $regex: searchQuery, $options: "i" } },
      { brand: { $regex: searchQuery, $options: "i" } },
      { description: { $regex: searchQuery, $options: "i" } },
    ];
  }

  // Add price range filter
  if (minPrice !== null || maxPrice !== null) {
    searchFilter.salePrice = {};
    if (minPrice !== null) {
      searchFilter.salePrice.$gte = minPrice;
    }
    if (maxPrice !== null) {
      searchFilter.salePrice.$lte = maxPrice;
    }
  }

  return searchFilter;
};

// Helper function to build sort query
const buildSortQuery = (sortBy) => {
  switch (sortBy) {
    case "price-low":
      return { salePrice: 1 };
    case "price-high":
      return { salePrice: -1 };
    case "name-az":
      return { productName: 1 };
    case "name-za":
      return { productName: -1 };
    default:
      return { createdAt: -1 }; // newest first
  }
};

// Helper function to calculate product ratings
const calculateProductRatings = async (products) => {
  return await Promise.all(
    products.map(async (product) => {
      const reviews = await Review.find({
        product: product._id,
        isHidden: false,
      });

      let averageRating = 0;
      let totalReviews = reviews.length;

      if (totalReviews > 0) {
        const totalRating = reviews.reduce(
          (sum, review) => sum + review.rating,
          0
        );
        averageRating = totalRating / totalReviews;
      }

      return {
        ...product,
        averageRating: averageRating,
        totalReviews: totalReviews,
      };
    })
  );
};

// Helper function to calculate pagination data
const calculatePagination = (page, totalProducts, limit) => {
  const totalPages = Math.ceil(totalProducts / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const nextPage = hasNextPage ? page + 1 : null;
  const prevPage = hasPrevPage ? page - 1 : null;
  const skip = (page - 1) * limit;

  // Generate page numbers for pagination
  const pageNumbers = [];
  const maxPagesToShow = 5;
  let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  // Calculate result range
  const startResult = totalProducts > 0 ? skip + 1 : 0;
  const endResult = Math.min(skip + limit, totalProducts);

  return {
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    pageNumbers,
    startResult,
    endResult,
    skip,
  };
};

// Helper function to calculate review statistics
const calculateReviewStats = (reviews) => {
  const totalReviews = reviews.length;
  let averageRating = 0;
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (totalReviews > 0) {
    const totalRating = reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    averageRating = totalRating / totalReviews;

    // Count ratings
    reviews.forEach((review) => {
      ratingCounts[review.rating]++;
    });

    // Calculate percentages
    Object.keys(ratingBreakdown).forEach((rating) => {
      ratingBreakdown[rating] =
        totalReviews > 0 ? (ratingCounts[rating] / totalReviews) * 100 : 0;
    });
  }

  return {
    averageRating,
    totalReviews,
    ratingCounts,
    ratingBreakdown,
  };
};

// Shop Page Controller
const loadShop = async (req, res) => {
  try {
    // Extract and parse parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 9; // 3 columns × 3 rows = 9 products per page
    const selectedCategory = req.query.category || "";
    const searchQuery = req.query.search || "";
    const sortBy = req.query.sort || "newest";
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;

    // Get categories for filter dropdown
    const categories = await Category.find({ isListed: true }).sort({
      name: 1,
    });

    // Build search and sort queries
    const searchFilter = buildSearchFilter(selectedCategory, searchQuery, minPrice, maxPrice);
    const sortQuery = buildSortQuery(sortBy);

    // Fetch products
    const allProducts = await Product.find(searchFilter)
      .populate({
        path: "category",
        match: { isListed: true },
        select: "name",
      })
      .sort(sortQuery)
      .lean();

    // Filter out products with unlisted categories
    const filteredProducts = allProducts.filter(
      (product) => product.category !== null
    );

    // Calculate pagination
    const totalProducts = filteredProducts.length;
    const pagination = calculatePagination(page, totalProducts, limit);
    
    // Apply pagination to filtered products
    const products = filteredProducts.slice(pagination.skip, pagination.skip + limit);

    // Calculate ratings for products
    const productsWithRatings = await calculateProductRatings(products);

    // Handle redirect message
    const redirectMessage = req.session.redirectMessage;
    if (redirectMessage) {
      delete req.session.redirectMessage;
    }

    res.render("shop", {
      products: productsWithRatings,
      categories,
      redirectMessage,
      // Pagination data
      currentPage: page,
      totalPages: pagination.totalPages,
      totalProducts,
      hasNextPage: pagination.hasNextPage,
      hasPrevPage: pagination.hasPrevPage,
      nextPage: pagination.nextPage,
      prevPage: pagination.prevPage,
      pageNumbers: pagination.pageNumbers,
      startResult: pagination.startResult,
      endResult: pagination.endResult,
      limit,
      // Filter data
      selectedCategory,
      search: searchQuery,
      sortBy,
      minPrice: req.query.minPrice || "",
      maxPrice: req.query.maxPrice || "",
    });
  } catch (error) {
    console.error("Error loading shop page:", error);
    res.status(500).render("error", {
      message: "Failed to load shop page",
    });
  }
};

// Product Details Controller
const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;

    // Get product details with populated category
    const product = await Product.findById(productId)
      .populate("category")
      .lean();

    // Get reviews for this product
    const reviews = await Review.find({
      product: productId,
      isHidden: false,
    })
      .populate("user", "fullname")
      .sort({ createdAt: -1 })
      .lean();

    // Get related products from the same category
    let relatedProductsRaw = [];
    if (product.category && product.category.isListed) {
      relatedProductsRaw = await Product.find({
        category: product.category._id,
        _id: { $ne: productId },
        isDeleted: false,
        isBlocked: false,
        isListed: true,
      })
        .populate({
          path: "category",
          match: { isListed: true },
          select: "name",
        })
        .sort({ createdAt: -1 })
        .limit(4)
        .lean();

      // Filter out products with unlisted categories
      relatedProductsRaw = relatedProductsRaw.filter(
        (product) => product.category !== null
      );
    }

    // Calculate ratings for related products
    const relatedProducts = await calculateProductRatings(relatedProductsRaw);

    // Calculate review statistics
    const reviewStats = calculateReviewStats(reviews);

    res.render("product-details", {
      product,
      reviews,
      relatedProducts,
      averageRating: reviewStats.averageRating,
      totalReviews: reviewStats.totalReviews,
      ratingCounts: reviewStats.ratingCounts,
      ratingBreakdown: reviewStats.ratingBreakdown,
    });
  } catch (error) {
    console.error("Error loading product details:", error);
    res.status(500).render("error", {
      message: "Internal server error",
    });
  }
};

// Product Status API Controller
const checkProductStatus = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId).populate(
      "category",
      "isListed"
    );

    if (!product) {
      return res.json({
        success: false,
        available: false,
        message: "Product not found",
      });
    }

    // Check if product is available to users
    const isCategoryAvailable = product.category
      ? product.category.isListed
      : false;
    const isAvailable =
      !product.isBlocked &&
      !product.isDeleted &&
      product.isListed &&
      isCategoryAvailable;

    res.json({
      success: true,
      available: isAvailable,
      status: {
        isBlocked: product.isBlocked,
        isDeleted: product.isDeleted,
        isListed: product.isListed,
        categoryListed: isCategoryAvailable,
      },
    });
  } catch (error) {
    console.error("Error checking product status:", error);
    res.status(500).json({
      success: false,
      available: false,
      message: "Internal server error",
    });
  }
};

// Search Products API Controller
const searchProducts = async (req, res) => {
  try {
    const searchQuery = req.query.q || "";
    const limit = parseInt(req.query.limit) || 8; // Limit results for dropdown

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.json({
        success: true,
        products: [],
        message: "Please enter at least 2 characters to search"
      });
    }

    // Build search filter for navbar search
    const searchFilter = {
      isDeleted: false,
      isBlocked: false,
      isListed: true,
      $or: [
        { productName: { $regex: searchQuery.trim(), $options: "i" } },
        { brand: { $regex: searchQuery.trim(), $options: "i" } },
        { description: { $regex: searchQuery.trim(), $options: "i" } },
      ],
    };

    // Fetch products with category information
    const products = await Product.find(searchFilter)
      .populate({
        path: "category",
        match: { isListed: true },
        select: "name",
      })
      .select("productName brand salePrice regularPrice mainImage category")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Filter out products with unlisted categories
    const filteredProducts = products.filter(
      (product) => product.category !== null
    );

    // Format products for frontend
    const formattedProducts = filteredProducts.map(product => ({
      _id: product._id,
      productName: product.productName,
      brand: product.brand,
      salePrice: product.salePrice,
      regularPrice: product.regularPrice,
      mainImage: product.mainImage,
      category: product.category.name,
      hasDiscount: product.salePrice < product.regularPrice
    }));

    res.json({
      success: true,
      products: formattedProducts,
      totalFound: filteredProducts.length,
      searchQuery: searchQuery.trim()
    });

  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search products",
      products: []
    });
  }
};

module.exports = {
  loadShop,
  loadProductDetails,
  checkProductStatus,
  searchProducts,
};
