const mongoose = require('mongoose');
const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  discountType: {
    type: String,
    enum: ['fixed', 'percentage'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  maxDiscountValue: {
    type: Number,
    default: null
  },
  minOrderAmount: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageLimitGlobal: {
    type: Number,
    default: null
  },
  usageLimitPerUser: {
    type: Number,
    default: 1
  },
  usedCount: {
    type: Number,
    default: 0
  },
  usedBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      usedAt: {
        type: Date,
        default: Date.now
      },
      count: {
        type: Number,
        default: 1
      }
    }
  ],
  applicableCategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }
  ],
  applicableProducts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }
  ],
  createdByAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});
module.exports = mongoose.model('Coupon', couponSchema);
