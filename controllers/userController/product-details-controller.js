const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const Review = require("../../models/reviewSchema");

const {HttpStatus} = require('../../helpers/status-code')

const productDetails = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.params.id;

    const product = await Product.findById(productId).populate("category");
    if (!product || !product.isListed || product.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).render("pageNotFound");
    }

    // Set final price to sale price (no offers)
    product.finalPrice = product.salePrice;
    product.regularPrice = product.regularPrice || product.salePrice;

    // Get related products
    const relatedProducts = await Product.aggregate([
      { 
        $match: { 
          _id: { $ne: product._id }, 
          isListed: true, 
          isDeleted: false,
          category: product.category._id 
        }
      },
      { $sample: { size: 4 } },
    ]);

    // Set final price to sale price for related products (no offers)
    for (const relatedProduct of relatedProducts) {
      relatedProduct.finalPrice = relatedProduct.salePrice;
      relatedProduct.regularPrice = relatedProduct.regularPrice || relatedProduct.salePrice;
    }

    let cartCount = 0;
    let wishlistCount = 0;
    let isInCart = false;
    let isWishlisted = false;

    if (userId) {
      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        isInCart = cart.items.some(item => item.product.toString() === productId);
      }

      const wishlist = await Wishlist.findOne({ user: userId });
      if (wishlist) {
        wishlistCount = wishlist.items.length;
        isWishlisted = wishlist.items.some(item => item.product.toString() === productId);
      }
    }

    // Get recent reviews for the product
    const recentReviews = await Review.find({
      product: productId,
      isDeleted: false,
    })
      .populate("user", "fullName profileImage")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    // Format reviews for display
    recentReviews.forEach((review) => {
      review.formattedDate = new Date(review.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    });

    // Check if user has already reviewed this product
    let userReview = null;
    if (userId) {
      userReview = await Review.findOne({
        user: userId,
        product: productId,
        isDeleted: false,
      });
    }

    // Log the product data for debugging
    console.log('Product details:', {
      title: product.title,
      regularPrice: product.regularPrice,
      finalPrice: product.finalPrice,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount
    });

    res.render("product-details", {
      product,
      relatedProducts,
      recentReviews,
      userReview,
      isInCart,
      isWishlisted,
      cartCount,
      wishlistCount,
      user: userId ? { id: userId } : null,
      isAuthenticated: !!userId,
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).render("pageNotFound");
  }
};

module.exports = { productDetails };

