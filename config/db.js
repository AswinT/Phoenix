const mongoose = require('mongoose')
require("dotenv").config()

const mongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
    } catch (error) {
        process.exit(1)
    }
}

module.exports = mongoDB
