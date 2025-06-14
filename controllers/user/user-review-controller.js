const Product = require("../../models/product-schema");
const Review = require("../../models/review-schema");

// Helper function to check user authentication
const checkUserAuth = (req) => {
  const userId = req.session.userId;
  return {
    isAuthenticated: !!userId,
    userId: userId
  };
};

// Helper function to validate review data
const validateReviewData = (productId, rating, title, comment) => {
  if (!productId || !rating || !title || !comment) {
    return { isValid: false, message: "All fields are required" };
  }

  if (rating < 1 || rating > 5) {
    return { isValid: false, message: "Rating must be between 1 and 5" };
  }

  return { isValid: true };
};

// Review Management
const submitReview = async (req, res) => {
  try {
    const { isAuthenticated, userId } = checkUserAuth(req);

    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        message: "Please login to submit a review",
      });
    }

    const { productId, rating, title, comment } = req.body;

    // Validate input data
    const validation = validateReviewData(productId, rating, title, comment);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      user: userId,
      product: productId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }

    // Create new review
    const newReview = new Review({
      user: userId,
      product: productId,
      rating: parseInt(rating),
      title: title.trim(),
      comment: comment.trim(),
    });

    await newReview.save();

    res.json({
      success: true,
      message: "Review submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit review",
    });
  }
};

const markHelpful = async (req, res) => {
  try {
    const { isAuthenticated } = checkUserAuth(req);

    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        message: "Please login to mark reviews as helpful",
      });
    }

    const { reviewId } = req.body;

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: "Review ID is required",
      });
    }

    // Find and update review
    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $inc: { helpfulVotes: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.json({
      success: true,
      message: "Marked as helpful",
      helpfulVotes: review.helpfulVotes,
    });
  } catch (error) {
    console.error("Error marking review as helpful:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark as helpful",
    });
  }
};

module.exports = {
  submitReview,
  markHelpful,
};
