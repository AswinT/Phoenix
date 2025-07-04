const mongoose = require("mongoose")

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false
    },
    addedDate: {
        type: Date,
        default: Date.now
    },
    isListed: {
        type: Boolean,
        required: true,
        default: true
    },
    isExisting: {
        type: Boolean,
        default: true,
        required: true
    }
})

const Category = mongoose.model("category", categorySchema)
module.exports = Category
