// models/offerSchema.js
const mongoose = require('mongoose');
const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
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
    appliesTo: {
      type: String,
      enum: ['all_products', 'specific_products', 'all_categories', 'specific_categories'],
      required: [true, 'Offer applicability type is required.']
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      }
    ],
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
      }
    ],
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);
offerSchema.index({ title: 'text' });
offerSchema.index({ isActive: 1, endDate: 1, startDate: 1 });
offerSchema.index({ appliesTo: 1 });
offerSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    return next(new Error('End date must be after start date.'));
  }
  if (this.discountType === 'percentage' && (this.discountValue <= 0 || this.discountValue > 100)) {
    return next(new Error('Percentage discount must be between 1 and 100.'));
  }
  if (this.discountType === 'fixed' && this.discountValue <= 0) {
    return next(new Error('Fixed discount must be greater than 0.'));
  }
  if (this.appliesTo === 'specific_products' && (!this.applicableProducts || this.applicableProducts.length === 0)) {
    return next(new Error('Please select at least one product for a product-specific offer.'));
  }
  if (
    this.appliesTo === 'specific_categories' &&
    (!this.applicableCategories || this.applicableCategories.length === 0)
  ) {
    return next(new Error('Please select at least one category for a category-specific offer.'));
  }
  if (this.appliesTo === 'all_products' || this.appliesTo === 'all_categories') {
    this.applicableProducts = [];
    this.applicableCategories = [];
  }
  if (this.appliesTo === 'specific_products') {
    this.applicableCategories = [];
  }
  if (this.appliesTo === 'specific_categories') {
    this.applicableProducts = [];
  }
  next();
});
module.exports = mongoose.model('Offer', offerSchema);
