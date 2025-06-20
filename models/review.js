const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    reviewText: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 1000,
        trim: true
    },
    reviewerName: {
        type: String,
        required: true,
        trim: true
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    isApproved: {
        type: Boolean,
        default: true
    },
    helpfulCount: {
        type: Number,
        default: 0
    },
    helpfulVotes: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }
    }]
}, { 
    timestamps: true 
});

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ isApproved: 1 });
reviewSchema.statics.getProductRatingStats = async function(productId) {
    const stats = await this.aggregate([
        {
            $match: { 
                productId: new mongoose.Types.ObjectId(productId),
                isApproved: true 
            }
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
                ratingDistribution: {
                    $push: '$rating'
                }
            }
        }
    ]);

    if (stats.length === 0) {
        return {
            averageRating: 0,
            totalReviews: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
    }

    const result = stats[0];
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    result.ratingDistribution.forEach(rating => {
        distribution[rating]++;
    });

    return {
        averageRating: Math.round(result.averageRating * 10) / 10,
        totalReviews: result.totalReviews,
        ratingDistribution: distribution
    };
};
reviewSchema.methods.isHelpfulByUser = function(userId) {
    return this.helpfulVotes.some(vote => vote.userId.toString() === userId.toString());
};

const Review = mongoose.model('review', reviewSchema);
module.exports = Review;
