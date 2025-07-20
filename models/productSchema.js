const mongoose = require("mongoose");
const productSchema = new mongoose.Schema({
  model:
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
  connectivity: {
    type: String,
    required: true,
    enum: ['Wired', 'Wireless'],
    default: 'Wired'
  },
  manufacturer: { type: String, required: true },
  mainImage: { type: String, required: true },
  subImages: [{ type: String }],
  isListed: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Product", productSchema);