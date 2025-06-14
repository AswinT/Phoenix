const User = require("../../models/user-schema");
const generateOtp = require("../../utils/generateOtp");
const sendEmail = require("../../utils/sendEmail");
const bcrypt = require("bcrypt");

// Page Loading Controllers
const loadSignup = async (req, res) => {
  try {
    return res.render("signup");
  } catch (error) {
    console.log("Home page not loading", error);
    res.status(500).send("Server Error");
  }
};

const loadLogin = async (req, res) => {
  try {
    return res.render("login");
  } catch (error) {
    console.log("Login page not loading", error);
    res.status(500).send("Server error");
  }
};

const loadOtpPage = async (req, res) => {
  try {
    return res.render("verify-otp");
  } catch (error) {
    console.log("otp-validation page not loading");
    res.status(500).send("Internal server error");
  }
};

const loadForgotPassword = async (req, res) => {
  try {
    return res.render("forgot-password");
  } catch (error) {
    console.log("Verify email page not loading", error);
    res.status(500).send("Server Error");
  }
};

const loadForgotVerifyOtp = async (req, res) => {
  try {
    return res.render("forgot-verify-otp");
  } catch (error) {
    console.log("otp-validation page not loading");
    res.status(500).send("Internal server error");
  }
};

const loadNewPassword = async (req, res) => {
  try {
    return res.render("new-password");
  } catch (error) {
    console.log("New password page not loading");
    res.status(500).send("Internal server error");
  }
};

// User Registration and Authentication
const signup = async (req, res) => {
  try {
    const { fullname, phone, email, password } = req.body;

    if (!fullname || fullname.length < 4) {
      return res.status(400).json({
        success: false,
        message: "Full name must be at least 4 characters",
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || !emailRegex.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter a valid email" });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res
        .status(400)
        .json({ success: false, message: "Phone must be 10 digits" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(403).json({
        success: false,
        message: "User already exists",
      });
    }

    const otp = generateOtp();
    const isSendMail = await sendEmail(email, otp);

    if (!isSendMail) {
      return res.json({
        success: false,
        message: "Failed to send OTP",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    req.session.userData = { fullname, phone, email, password: hashedPassword };
    req.session.userOtp = otp;

    res.json({
      success: true,
      message: "otp sent successfully",
    });
  } catch (error) {
    console.error("Error in loading signup page", error);
    res.status(500).send("Internal server error");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked, Please contact support",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    req.session.userId = user._id;
    req.session.email = user.email;

    return res.status(200).redirect("/dashboard");
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during login. Please try again later.",
    });
  }
};

const logout = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(400).json({
        success: false,
        message: "No active session to logout from",
      });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error", err);
        return res.status(500).json({
          success: false,
          message: "Failed to logout, Please try again",
        });
      }

      res.clearCookie("connect.sid");
      return res.status(200).redirect("/login");
    });
  } catch (error) {
    console.error("Logout error", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// OTP Verification
const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    console.log(otp);
    console.log(req.session.userOtp);

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const saveUserData = new User({
        fullname: user.fullname,
        phone: user.phone,
        email: user.email,
        password: user.password,
      });

      await saveUserData.save();
      res.json({
        success: true,
        redirectUrl: "/login",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid OTP, Please try again",
      });
    }
  } catch (error) {
    console.error("Error Varifying OTP", error);
    res.status(500).json({ success: false, message: `${error.message}` });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;

    if (!email) {
      res.status(401).json({ message: "email not found, session ends" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const isSendMail = await sendEmail(email, otp);

    if (!isSendMail) {
      return res.json({
        success: false,
        message: "Failed to send OTP",
      });
    }

    res.json({
      success: true,
      message: "otp sent successfully",
    });
  } catch (error) {
    console.error("Error in resending otp", error);
    res.status(500).send("Internal server error");
  }
};

// Forgot Password Functionality
const verifyForgotPasswordEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    const otp = generateOtp();

    req.session.userOtp = {
      otp,
      email,
    };

    const isSendMail = await sendEmail(email, otp);
    if (!isSendMail) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP",
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Error in verifyForgotEmail:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const verifyForgotPasswordOtp = (req, res) => {
  try {
    const { otp } = req.body;
    const sessionOtp = req.session.userOtp.otp;

    console.log(otp, sessionOtp);

    if (!sessionOtp) {
      return res.status(400).json({
        success: false,
        message: "No OTP session found. Please request again.",
      });
    }

    if (String(otp) !== String(sessionOtp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    res.json({
      success: true,
      message: "OTP verified successfully",
      redirectUrl: "/new-password",
    });
  } catch (error) {
    console.error("Error in verifyForgotOtp:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const resendForgotPasswordOtp = async (req, res) => {
  try {
    const email = req.session.userOtp.email;

    if (!email) {
      res.status(401).json({ message: "email not found, session ends" });
    }

    const otp = generateOtp();
    req.session.userOtp = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      email,
    };

    const isSendMail = await sendEmail(email, otp);

    if (!isSendMail) {
      return res.json({
        success: false,
        message: "Failed to send OTP",
      });
    }

    res.json({
      success: true,
      message: "otp sent successfully",
    });
  } catch (error) {
    console.error("Error in resending otp", error);
    res.status(500).send("Internal server error");
  }
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const email = req.session.userOtp.email;

    const { _id } = await User.findOne({ email });

    console.log(_id);

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findByIdAndUpdate(
      _id,
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  loadSignup,
  loadLogin,
  loadOtpPage,
  loadForgotPassword,
  loadForgotVerifyOtp,
  loadNewPassword,
  signup,
  login,
  logout,
  verifyOtp,
  resendOtp,
  verifyForgotPasswordEmail,
  verifyForgotPasswordOtp,
  resendForgotPasswordOtp,
  resetPassword,
};
