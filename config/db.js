const mongoose = require("mongoose");
const env = require("dotenv").config();

const connectDB = async () => {
  try {
    const options = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true
    };
    
    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log("✅ Database connection successful");
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;