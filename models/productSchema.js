const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title:
  { type: String,
     required: true },
  brand: {
     type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  regularPrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },
  stock: { type: Number, required: true },
  battery_life: { type: Number, required: true },
  connectivity: { type: String, required: true },
  manufacturer: { type: String, required: true },
  release_date: { type: Date },
  model_number: { type: String },
  mainImage: { type: String, required: true },
  subImages: [{ type: String }],
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
  isListed: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Product", productSchema);
