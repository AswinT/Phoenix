const Review = require("../../models/reviewSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const mongoose = require("mongoose");
const { HttpStatus } = require("../../helpers/status-code");

/**
 * Get reviews for a specific product
 */
const getProductReviews = async (req, res) => {
  try {
    const productId = req.params.productId;
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // Reviews per page
    const skip = (page - 1) * limit;

    // Get reviews for the product
    const reviews = await Review.find({
      product: productId,
      isDeleted: false,
    })
      .populate("user", "fullName profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total review count
    const totalReviews = await Review.countDocuments({
      product: productId,
      isDeleted: false,
    });

    // Calculate pagination
    const totalPages = Math.ceil(totalReviews / limit);

    // Format reviews for display
    reviews.forEach((review) => {
      review.formattedDate = new Date(review.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      review.timeAgo = getTimeAgo(review.createdAt);
    });

    res.json({
      success: true,
      reviews,
      pagination: {
        currentPage: page,
        totalPages,
        totalReviews,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
};

/**
 * Submit a new review for a product
 */
const submitReview = async (req, res) => {
  try {
    // Debug logging
    console.log("Review submission request received:");
    console.log("- Session user_id:", req.session.user_id);
    console.log("- Product ID from params:", req.params.productId);
    console.log("- Request body:", req.body);
    console.log("- Content-Type:", req.headers['content-type']);

    if (!req.session.user_id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Please log in to submit a review",
      });
    }

    const userId = req.session.user_id;
    const productId = req.params.productId;
    const { rating, reviewText } = req.body;

    // Comprehensive input validation

    // 1. Validate Product ID
    if (!productId) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Validate Product ID format (MongoDB ObjectId)
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    // 2. Validate Rating
    if (!rating) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Rating is required",
      });
    }

    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // 3. Validate Review Text
    if (!reviewText) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Review text is required",
      });
    }

    const trimmedReviewText = reviewText.trim();
    if (trimmedReviewText.length === 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Review text cannot be empty",
      });
    }

    if (trimmedReviewText.length < 10) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Review must be at least 10 characters long",
      });
    }

    if (trimmedReviewText.length > 1000) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Review must not exceed 1000 characters",
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product || !product.isListed || product.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      user: userId,
      product: productId,
      isDeleted: false,
    });

    if (existingReview) {
      return res.status(HttpStatus.CONFLICT).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }

    // Check if user has purchased this product (verified purchase)
    const hasPurchased = await Order.findOne({
      user: userId,
      "items.product": productId,
      orderStatus: "Delivered",
      isDeleted: false,
    });

    // Create new review using validated data
    const newReview = new Review({
      user: userId,
      product: productId,
      rating: ratingNum,
      reviewText: trimmedReviewText,
      isVerifiedPurchase: !!hasPurchased,
    });

    await newReview.save();

    // Update product's average rating and review count
    await updateProductRating(productId);

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Review submitted successfully",
      review: {
        _id: newReview._id,
        rating: newReview.rating,
        reviewText: newReview.reviewText,
        isVerifiedPurchase: newReview.isVerifiedPurchase,
        createdAt: newReview.createdAt,
      },
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to submit review",
    });
  }
};

/**
 * Update product's average rating and review count
 */
const updateProductRating = async (productId) => {
  try {
    const reviews = await Review.find({
      product: productId,
      isDeleted: false,
    });

    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount 
      : 0;

    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      reviewCount,
    });
  } catch (error) {
    console.error("Error updating product rating:", error);
  }
};

/**
 * Helper function to calculate time ago
 */
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
};

/**
 * Delete a review (soft delete)
 */
const deleteReview = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Please log in to delete review",
      });
    }

    const userId = req.session.user_id;
    const reviewId = req.params.reviewId;

    const review = await Review.findOne({
      _id: reviewId,
      user: userId,
      isDeleted: false,
    });

    if (!review) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: "Review not found or you don't have permission to delete it",
      });
    }

    // Soft delete the review
    review.isDeleted = true;
    await review.save();

    // Update product rating
    await updateProductRating(review.product);

    res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to delete review",
    });
  }
};

module.exports = {
  getProductReviews,
  submitReview,
  deleteReview,
  updateProductRating,
};
