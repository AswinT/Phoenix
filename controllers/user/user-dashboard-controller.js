const Product = require("../../models/product-schema");
const Category = require("../../models/category-schema");
const Review = require("../../models/review-schema");

// Helper function to get products with ratings
const getProductsWithRatings = async () => {
  try {
    // Get all listed categories
    const listedCategories = await Category.find({
      isListed: true,
      isDeleted: false,
    }).select("_id");

    const listedCategoryIds = listedCategories.map((cat) => cat._id);

    // Get available, non-blocked, listed products with listed categories
    const products = await Product.find({
      isDeleted: false,
      isBlocked: false,
      isListed: true,
      category: { $in: listedCategoryIds },
    })
      .populate({
        path: "category",
        select: "name isListed",
      })
      .sort({ createdAt: -1 })
      .lean();

    // Calculate average ratings for each product
    const productsWithRatings = await Promise.all(
      products.map(async (product) => {
        try {
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
        } catch (reviewError) {
          console.error(
            "Error calculating ratings for product:",
            product._id,
            reviewError
          );
          return {
            ...product,
            averageRating: 0,
            totalReviews: 0,
          };
        }
      })
    );

    return productsWithRatings;
  } catch (error) {
    console.error("Error fetching products with ratings:", error);
    throw error;
  }
};

// Page Controllers
const loadLanding = async (req, res) => {
  try {
    const products = await getProductsWithRatings();
    return res.render("dashboard", { products });
  } catch (error) {
    console.error("Landing page error:", error);
    res.status(500).send("Server error");
  }
};

const loadDashboard = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.redirect("/");
    }

    const products = await getProductsWithRatings();
    return res.render("dashboard", { products });
  } catch (error) {
    console.error("Dashboard loading error:", error);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  loadLanding,
  loadDashboard,
};
