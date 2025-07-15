const User = require("../../models/userSchema");
const OTP = require("../../models/otpSchema"); // Import the new OTP model

const hashPasswordHelper = require("../../helpers/hash");
const { sendOtpEmail } = require("../../helpers/sendMail");
const { validateBasicOtp, validateOtpSession } = require("../../validators/user/basic-otp-validator");
const { HttpStatus } = require("../../helpers/status-code");
const { createOtpMessage } = require("../../helpers/email-mask");

const getOtp = async (req, res) => {
  try {

    const email = req.session.tempUser?.email;
    const otpMessage = createOtpMessage(email, 'signup');

    res.render("verify-otp", {
      maskedEmail: otpMessage.maskedEmail,
      otpMessage: otpMessage.fullMessage
    });
  } catch (error) {
    console.log("error during render", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
  }
};

const otpGenerator = () =>
  Math.floor(100000 + Math.random() * 900000).toString();



const getSignup = async (req, res) => {
  try {
    res.render("signup");
  } catch (error) {
    console.log(`Error:,${error.message}`);
  }
};

const postSignup = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password } = req.body;


    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();


    const existingUser = await User.findOne({
      $or: [{ email: trimmedEmail }, { phone: trimmedPhone }],
    });

    if (existingUser) {
      return res.status(HttpStatus.CONFLICT).json({
        success: false,
        message: "User with this email or phone number already exists!",
      });
    }

    // Generate OTP
    const otp = otpGenerator();
    console.log("Generated OTP for signup:", otp);

    const subjectContent = "Verify your email for Phoenix";


    try {
      await sendOtpEmail(trimmedEmail, trimmedName, otp, subjectContent,"signup");
    } catch (err) {
      console.error("Email sending error:", err.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to send OTP email. Please try again later.",
      });
    }

    const hashedPassword = await hashPasswordHelper.hashPassword(password);


    await OTP.deleteMany({ email: trimmedEmail, purpose: "signup" });


    const otpDoc = new OTP({
      email: trimmedEmail,
      otp,
      purpose: "signup",
    });
    await otpDoc.save();


    req.session.tempUser = {
      fullName: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      password: hashedPassword,
    };


    const otpMessage = createOtpMessage(trimmedEmail, 'signup');

    return res.status(HttpStatus.OK).json({
      success: true,
      message: otpMessage.message,
    });

  } catch (error) {
    console.error("Error in postSignup:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;


    const otpValidation = validateBasicOtp(otp);
    if (!otpValidation.isValid) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: otpValidation.message,
      });
    }


    const sessionValidation = validateOtpSession(req, 'signup');
    if (!sessionValidation.isValid) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: sessionValidation.message,
        sessionExpired: sessionValidation.sessionExpired,
      });
    }

    const tempUser = req.session.tempUser;

    const otpDoc = await OTP.findOne({ email: tempUser.email, purpose: "signup" });

    if (!otpDoc) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "OTP has expired or doesn't exist. Please request a new one.",
      });
    }

    if (otp !== otpDoc.otp) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid OTP"
      });
    }


    const newUser = new User({
      fullName: tempUser.fullName,
      email: tempUser.email,
      phone: tempUser.phone,
      password: tempUser.password,
      isVerified: true,
    });
    await newUser.save();


    await OTP.deleteOne({ _id: otpDoc._id });
    delete req.session.tempUser;

    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Account created successfully",
    });
  } catch (error) {
    console.log("Error in verifyOtp:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    const email = req.session.tempUser?.email;

    if (!email) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Session expired. Please sign up again.",
      });
    }

    const otp = otpGenerator();
    console.log("Resending OTP for signup:", otp);


    await OTP.deleteMany({ email, purpose: "signup" });


    const otpDoc = new OTP({
      email,
      otp,
      purpose: "signup",
    });
    await otpDoc.save();

    const fullName = req.session.tempUser.fullName;
    const subjectContent = "Your new OTP for Phoenix";

    await sendOtpEmail(email, fullName, otp, subjectContent, "resend");


    const otpMessage = createOtpMessage(email, 'resend');

    return res.status(HttpStatus.OK).json({
      success: true,
      message: otpMessage.message,
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
module.exports = { getSignup, postSignup, verifyOtp, getOtp, resendOtp };