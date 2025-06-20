const User = require("../../models/user");
require("dotenv").config()
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer")
const Product = require("../../models/product")

// Import service modules for better code organization
const UserValidationService = require("../../services/userValidationService");
const EmailService = require("../../services/emailService");
const OtpService = require("../../services/otpService");
const UserAuthService = require("../../services/userAuthService");
const ProductDisplayService = require("../../services/productDisplayService");

const aboutPage = (req, res, next) => {
    try {
        res.render("user/about", {
            user: res.locals.user,
        })
    } catch (error) {
        console.error('Error fetching about page:', error);
        next(error);
    }
}

const contactUsPage = (req, res, next) => {
    try {
        res.render("user/contactUs", {
            user: res.locals.user,
        })
    } catch (error) {
        console.error('Error fetching contact page:', error);
        next(error);
    }
}

const landingPage = async (req, res, next) => {
    try {
        // Fetch featured products for homepage display
        const { products, gamingProducts } = await ProductDisplayService.getLandingPageProducts();
        const user = req.session.user;

        res.render("user/landingPage", {
            products,
            user,
            gamingProducts,
        });
    } catch (error) {
        console.error('Error fetching landing page:', error);
        next(error);
    }
};

const loginPage = (req, res, next) => {
    try {
        // Redirect if user is already logged in
        if (req.session.user) return res.redirect("/")
        res.render("user/userLogin", { 
            error: null,
            message: null 
        });
    } catch (error) {
        console.error('Error fetching login page:', error);
        next(error);
    }
};

const signupPage = (req, res, next) => {
    try {
        // Redirect if user is already logged in
        if (req.session.user) return res.redirect("/")
        return res.render("user/userSignUp", {
            errors: null,
            message: null,
            error: null,
            formData: {}
        });
    } catch (error) {
        console.error('Error fetching signup page:', error);
        next(error);
    }
};

const signup = async (req, res, next) => {
    try {
        const { fullname, email, mobile, password, confirmPassword } = req.body;

        // Validate all signup fields
        const errors = UserValidationService.validateSignupFields(req.body);
        
        if (Object.keys(errors).length > 0) {
            return res.render("user/userSignUp", {
                errors,
                message: null,
                error: null,
                formData: { fullname, email, mobile }
            });
        }

        // Check if user already exists
        const existingUser = await UserValidationService.checkUserExists(email);
        
        if (existingUser) {
            return res.render("user/userSignUp", {
                errors: { email: "Email already registered" },
                message: null,
                error: null,
                formData: { fullname, email, mobile }
            });
        }

        // Hash password and generate OTP for verification
        const hashedPassword = await UserAuthService.hashPassword(password);
        const otp = OtpService.generateOtp();
        
        console.log('📧 Signup OTP for', email + ':', otp);

        // Store user data temporarily in session until OTP verification
        OtpService.storeSignupOtp(req.session, otp, {
            fullname,
            email,
            mobile,
            hashedPassword
        });

        const emailResult = await OtpService.sendSignupOtp(email, otp);
        
        if (!emailResult.success) {
            console.error('Email sending failed:', emailResult.error);
        }

        res.render("user/verifyOtp", { 
            email, 
            message: "OTP sent to your email", 
            error: null 
        });

    } catch (error) {
        console.error('Error in signup:', error);
        res.status(500).render("user/userSignUp", {
            errors: {},
            message: null,
            error: "Something went wrong. Please try again.",
            formData: req.body || {}
        });
    }
};

const verifyOtp = async (req, res, next) => {
    try {
        const { otp } = req.body;
        
        const validation = OtpService.validateSignupOtp(req.session, otp);
        
        if (!validation.isValid) {
            return res.render("user/verifyOtp", { 
                email: validation.email, 
                message: null, 
                error: validation.error 
            });
        }

        await UserAuthService.createUser(validation.userData);

        OtpService.clearSignupOtpData(req.session);

        res.render("user/userLogin", { 
            error: null, 
            message: "Registration successful! Please login." 
        });

    } catch (error) {
        console.error('Error in verifyOtp:', error);
        res.render("user/verifyOtp", { 
            email: req.session.tempUser?.email || "", 
            message: null, 
            error: "Something went wrong. Please try again." 
        });
    }
};

const resendOtp = async (req, res, next) => {
    try {
        const result = await OtpService.resendSignupOtp(req.session);
        res.json(result);
    } catch (error) {
        console.error('Error in resendOtp:', error);
        res.json({ 
            success: false, 
            message: "Failed to send OTP. Please try again." 
        });
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const errors = UserValidationService.validateLoginFields(req.body);
        
        if (Object.keys(errors).length > 0) {
            return res.render("user/userLogin", { 
                error: "Email and password are required",
                message: null
            });
        }

        const authResult = await UserAuthService.authenticateUser(email, password);
        
        if (!authResult.success) {
            return res.render("user/userLogin", { 
                error: authResult.error,
                message: null
            });
        }

        UserAuthService.setUserSession(req.session, authResult.user);

        res.redirect("/");

    } catch (error) {
        console.error('Error in login:', error);
        res.render("user/userLogin", { 
            error: "Something went wrong. Please try again.",
            message: null
        });
    }
};

const logout = (req, res, next) => {
    try {
        UserAuthService.clearUserSession(req.session, (err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).send("Logout failed");
            }
            res.clearCookie('session-id');
            res.redirect('/');
        });
    } catch (error) {
        console.error('Error in logout:', error);
        next(error);
    }
};

const forgotPassword = (req, res, next) => {
    try {
        res.render("user/verifyEmail", { error: null });
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        next(error);
    }
};

const verifyEmail = async (req, res, next) => {
    try {
        const { email } = req.body;

        const emailError = UserValidationService.validateEmail(email);
        if (emailError) {
            return res.render("user/verifyEmail", {
                error: emailError
            });
        }

        const user = await UserValidationService.checkUserExists(email);
        if (!user) {
            return res.render("user/verifyEmail", {
                error: "No account found with this email address"
            });
        }

        const otp = OtpService.generateOtp();
        console.log('🔑 Forgot Password OTP for', email + ':', otp);
        
        OtpService.storePasswordResetOtp(req.session, otp, email);

        const emailResult = await OtpService.sendPasswordResetOtp(email, otp);
        
        if (!emailResult.success) {
            console.error('Password reset email sending failed:', emailResult.error);
        }

        res.render("user/forgot-mail-verify", {
            data: email,
            message: "OTP sent to your email",
            error: null
        });

    } catch (error) {
        console.error('Error in verifyEmail:', error);
        res.render("user/verifyEmail", {
            error: "Something went wrong. Please try again."
        });
    }
};

const forgotVerifyOtp = async (req, res, next) => {
    try {
        const { otp } = req.body;
        
        const validation = OtpService.validatePasswordResetOtp(req.session, otp);
        
        if (!validation.isValid) {
            return res.render("user/forgot-mail-verify", {
                data: validation.email,
                message: null,
                error: validation.error
            });
        }

        res.redirect("/newpassword");

    } catch (error) {
        console.error('Error in forgotVerifyOtp:', error);
        res.render("user/forgot-mail-verify", {
            data: req.session.resetEmail || "",
            message: null,
            error: "Something went wrong. Please try again."
        });
    }
};

const newPassword = (req, res, next) => {
    try {
        if (!req.session.resetEmail || !req.session.resetOtp) {
            return res.redirect("/forgot-password");
        }
        res.render("user/newPassword", { error: null });
    } catch (error) {
        console.error('Error in newPassword:', error);
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { password, confirmPassword } = req.body;
        const email = req.session.resetEmail;

        if (!email) {
            return res.redirect("/forgot-password");
        }

        const errors = UserValidationService.validatePasswordReset(req.body);
        
        if (Object.keys(errors).length > 0) {
            const errorMessage = Object.values(errors)[0]; // Get first error
            return res.render("user/newPassword", {
                error: errorMessage
            });
        }

        const result = await UserAuthService.resetUserPassword(email, password);
        
        if (!result.success) {
            return res.render("user/newPassword", {
                error: result.error
            });
        }

        OtpService.clearPasswordResetOtpData(req.session);

        res.render("user/userLogin", {
            error: null,
            message: "Password reset successful! Please login with your new password."
        });

    } catch (error) {
        console.error('Error in resetPassword:', error);
        res.render("user/newPassword", {
            error: "Something went wrong. Please try again."
        });
    }
};

const resendForgotOtp = async (req, res, next) => {
    try {
        const result = await OtpService.resendPasswordResetOtp(req.session);
        res.json(result);
    } catch (error) {
        console.error('Error in resendForgotOtp:', error);
        res.json({
            success: false,
            message: "Failed to send verification code. Please try again."
        });
    }
};

module.exports = {
    aboutPage,
    contactUsPage,
    landingPage,
    loginPage,
    signupPage,
    signup,
    verifyOtp,
    resendOtp,
    login,
    logout,
    forgotPassword,
    verifyEmail,
    forgotVerifyOtp,
    newPassword,
    resetPassword,
    resendForgotOtp
};