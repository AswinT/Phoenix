const User = require("../../models/user-schema");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// Helper function to check user authentication
const checkUserAuth = (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return { isAuthenticated: false, userId: null };
  }
  return { isAuthenticated: true, userId };
};

// Helper function to delete old profile photo
const deleteOldProfilePhoto = (filename) => {
  try {
    if (!filename) return;
    
    const oldPhotoPath = path.join(
      __dirname,
      "../../public/uploads/profiles",
      filename
    );
    
    if (fs.existsSync(oldPhotoPath)) {
      fs.unlinkSync(oldPhotoPath);
    }
  } catch (error) {
    console.error("Error deleting old profile photo:", error);
  }
};

// Page Loading Controllers
const loadProfile = async (req, res) => {
  try {
    const { isAuthenticated, userId } = checkUserAuth(req, res);
    
    if (!isAuthenticated) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId).select("-password").lean();

    if (!user) {
      return res.redirect("/login");
    }

    res.render("profile", {
      title: "My Profile",
      user: user,
    });
  } catch (error) {
    console.error("Error loading profile:", error);
    res.status(500).send("Server Error");
  }
};

const loadSettings = async (req, res) => {
  try {
    const { isAuthenticated } = checkUserAuth(req, res);
    
    if (!isAuthenticated) {
      return res.redirect("/login");
    }

    res.render("user/settings", {
      title: "Settings",
      user: req.user || null,
    });
  } catch (error) {
    console.error("Error loading settings:", error);
    res.status(500).send("Server Error");
  }
};

// Profile Photo Management
const uploadProfilePhoto = async (req, res) => {
  try {
    const { isAuthenticated, userId } = checkUserAuth(req, res);
    
    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        message: "Please login to upload profile photo",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `profile_${userId}_${timestamp}.jpg`;
    const filepath = path.join(
      __dirname,
      "../../public/uploads/profiles",
      filename
    );

    // Process and save the image using Sharp
    await sharp(req.file.buffer)
      .resize(200, 200, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 90 })
      .toFile(filepath);

    // Get current user to check for existing profile photo
    const currentUser = await User.findById(userId);

    // Delete old profile photo if it exists
    deleteOldProfilePhoto(currentUser.profilePhoto);

    // Update user with new profile photo
    await User.findByIdAndUpdate(userId, {
      profilePhoto: filename,
    });

    res.json({
      success: true,
      message: "Profile photo updated successfully",
      filename: filename,
    });
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload profile photo",
    });
  }
};

// Profile Update
const updateProfile = async (req, res) => {
  try {
    const { isAuthenticated, userId } = checkUserAuth(req, res);

    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        message: "Please login to update profile",
      });
    }

    const { fullname, email, phone } = req.body;

    // Validate fullname
    if (!fullname || fullname.trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: "Full name must be at least 4 characters long",
      });
    }

    // Validate email
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Validate Indian mobile number (required field)
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must start with 6, 7, 8, or 9 and be 10 digits long",
      });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: userId }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered with another account",
      });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        fullname: fullname.trim(),
        email: email.toLowerCase(),
        phone: phone.trim(),
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: validationErrors[0] || "Validation error",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

module.exports = {
  loadProfile,
  loadSettings,
  uploadProfilePhoto,
  updateProfile,
};
