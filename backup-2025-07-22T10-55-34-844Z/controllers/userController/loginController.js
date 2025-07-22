const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");
const { HttpStatus } = require("../../helpers/status-code");

// Show login page
const getLogin = async (req, res) => {
  try {
    res.header(
      "Cache-Control",
      "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
    );
    res.header("Pragma", "no-cache");
    res.header("Expires", "0");
    res.render("login");
  } catch (error) {
    console.log(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server Error",
    });
  }
};
// Handle user login
const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: "Email Not found",
      });
    }
    // Check if account is blocked
    if (existingUser.isBlocked) {
      return res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        message: "Your account is blocked. Please contact support.",
      });
    }
    // Verify password
    const verifiedPassword = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!verifiedPassword) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }
    // Create user session
    req.session.user_id = existingUser._id;
    req.session.user_email = existingUser.email;
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Session error",
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Welcome to Phoenix",
      });
    });
  } catch (error) {
    console.log("Signin ERROR", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server Error",
    });
  }
};
module.exports = {
  getLogin,
  postLogin,
};