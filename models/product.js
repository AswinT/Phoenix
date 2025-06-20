const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    modelNumber: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category',
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    driverSize: {
        type: String,
        required: true,
    },
    connectivity: {
        type: String,
        required: true
    },
    noiseCancellation: {
        type: Boolean,
        default: false
    },
    microphoneIncluded: {
        type: Boolean,
        default: false
    },
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true,
    },

    regularPrice: {
        type: Number,
        required: true
    },
    salePrice: {
        type: Number,
        required: true
    },
    warranty: {
        type: String,
        default: ''
    },
    images: [{
        url: {
            type: String,
            required: true
        },
        isMain: {
            type: Boolean,
            required: true,
            default: false
        }
    }],
    isExisting: {
        type: Boolean,
        required: true,
        default: true,
    },
}, { timestamps: true })

const Product = mongoose.model("product", productSchema)
module.exports = Product
