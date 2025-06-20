const Review = require("../../models/review");
const Product = require("../../models/product");
const User = require("../../models/user");

const submitReview = async (req, res, next) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "Please login to submit a review" 
            });
        }

        const productId = req.params.id;
        const { rating, reviewText, isAnonymous } = req.body;

        if (!rating || !reviewText) {
            return res.status(400).json({ 
                success: false, 
                message: "Rating and review text are required" 
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ 
                success: false, 
                message: "Rating must be between 1 and 5" 
            });
        }

        if (reviewText.trim().length < 10) {
            return res.status(400).json({ 
                success: false, 
                message: "Review must be at least 10 characters long" 
            });
        }

        if (reviewText.trim().length > 1000) {
            return res.status(400).json({ 
                success: false, 
                message: "Review must be less than 1000 characters" 
            });
        }

        const product = await Product.findById(productId);
        if (!product || !product.isActive || !product.isExisting) {
            return res.status(404).json({ 
                success: false, 
                message: "Product not found" 
            });
        }

        const existingReview = await Review.findOne({ 
            productId, 
            userId: user._id 
        });

        if (existingReview) {
            return res.status(400).json({ 
                success: false, 
                message: "You have already reviewed this product" 
            });
        }

        const userDetails = await User.findById(user._id);
        if (!userDetails) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        const newReview = new Review({
            productId,
            userId: user._id,
            rating: parseInt(rating),
            reviewText: reviewText.trim(),
            reviewerName: isAnonymous === 'true' ? 'Anonymous' : userDetails.fullname,
            isAnonymous: isAnonymous === 'true'
        });

        await newReview.save();

        res.status(201).json({ 
            success: true, 
            message: "Review submitted successfully",
            review: {
                _id: newReview._id,
                rating: newReview.rating,
                reviewText: newReview.reviewText,
                reviewerName: newReview.reviewerName,
                createdAt: newReview.createdAt,
                helpfulCount: newReview.helpfulCount
            }
        });

    } catch (error) {
        console.error('Error submitting review:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: "You have already reviewed this product" 
            });
        }

        res.status(500).json({ 
            success: false, 
            message: "Failed to submit review. Please try again." 
        });
    }
};

const getProductReviews = async (req, res, next) => {
    try {
        const productId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const sortBy = req.query.sort || 'newest';

        let sortCriteria = {};
        switch (sortBy) {
            case 'oldest':
                sortCriteria = { createdAt: 1 };
                break;
            case 'highest':
                sortCriteria = { rating: -1, createdAt: -1 };
                break;
            case 'lowest':
                sortCriteria = { rating: 1, createdAt: -1 };
                break;
            case 'helpful':
                sortCriteria = { helpfulCount: -1, createdAt: -1 };
                break;
            default:
                sortCriteria = { createdAt: -1 };
        }

        const skip = (page - 1) * limit;
        const reviews = await Review.find({ 
            productId, 
            isApproved: true 
        })
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullname')
        .lean();

        const totalReviews = await Review.countDocuments({ 
            productId, 
            isApproved: true 
        });

        const totalPages = Math.ceil(totalReviews / limit);

        const formattedReviews = reviews.map(review => ({
            _id: review._id,
            rating: review.rating,
            reviewText: review.reviewText,
            reviewerName: review.reviewerName,
            createdAt: review.createdAt,
            helpfulCount: review.helpfulCount,
            timeAgo: getTimeAgo(review.createdAt)
        }));

        res.json({
            success: true,
            reviews: formattedReviews,
            pagination: {
                currentPage: page,
                totalPages,
                totalReviews,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch reviews" 
        });
    }
};

const checkUserReview = async (req, res, next) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.json({ hasReviewed: false });
        }

        const productId = req.params.id;
        const existingReview = await Review.findOne({ 
            productId, 
            userId: user._id 
        });

        res.json({ 
            hasReviewed: !!existingReview,
            review: existingReview ? {
                rating: existingReview.rating,
                reviewText: existingReview.reviewText,
                createdAt: existingReview.createdAt
            } : null
        });

    } catch (error) {
        console.error('Error checking user review:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to check review status" 
        });
    }
};

const markHelpful = async (req, res, next) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "Please login to mark reviews as helpful" 
            });
        }

        const reviewId = req.params.reviewId;
        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: "Review not found" 
            });
        }

        const alreadyMarked = review.helpfulVotes.some(
            vote => vote.userId.toString() === user._id.toString()
        );

        if (alreadyMarked) {
            return res.status(400).json({ 
                success: false, 
                message: "You have already marked this review as helpful" 
            });
        }

        review.helpfulVotes.push({ userId: user._id });
        review.helpfulCount = review.helpfulVotes.length;
        await review.save();

        res.json({ 
            success: true, 
            message: "Review marked as helpful",
            helpfulCount: review.helpfulCount
        });

    } catch (error) {
        console.error('Error marking review as helpful:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to mark review as helpful" 
        });
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
    submitReview,
    getProductReviews,
    checkUserReview,
    markHelpful
};
