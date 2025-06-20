const express = require("express")
const router = express.Router();
const passport = require("passport")

// Import controllers
const userController = require("../controllers/user/userController")
const productController = require("../controllers/user/productController")
const reviewController = require("../controllers/user/reviewController")

// Import middleware for user authentication and blocking checks
const { userAuthCheck, isBlocked } = require("../middlewares/userAuthCheck")

// Public pages - accessible to all users (blocked users redirected)
router.get('/', isBlocked, userController.landingPage)
router.get("/about", isBlocked, userController.aboutPage)
router.get("/contact-us", isBlocked, userController.contactUsPage)

// Authentication routes
router.get("/login", userController.loginPage)
router.post("/login", userController.login)

router.get('/signup', userController.signupPage)
router.post('/signup', userController.signup)

// OTP verification for signup
router.post("/verify-otp", userController.verifyOtp)
router.post("/resend-otp", userController.resendOtp)

// Google OAuth authentication routes
router.get('/auth/google', (req, res, next) => {
    // Check if Google strategy is configured
    if (!passport._strategies.google) {
        return res.render("user/userLogin", {
            user: null,
            username: null,
            error: "Google authentication is not configured. Please contact the administrator."
        });
    }
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Google OAuth callback handler
router.get('/auth/google/callback', (req, res, next) => {
    if (!passport._strategies.google) {
        return res.redirect('/login');
    }
    passport.authenticate('google', { failureRedirect: "/login" })(req, res, next);
}, async (req, res) => {
    try {
        // Check if user is blocked after successful OAuth
        const user = await require("../models/user").findById(req.user._id);
        if (user && user.isBlocked) {
            return res.render("user/userLogin", {
                user: null,
                username: null,
                error: "Your account has been blocked. Please contact support."
            });
        }
        req.session.user = req.user;
        res.redirect('/');
    } catch (error) {
        console.error('Error in Google OAuth callback:', error);
        res.redirect('/login');
    }
});

// Password reset flow
router.get("/forgot-password", userController.forgotPassword)
router.post("/forgot-password", userController.verifyEmail)
router.post("/forgot-verify-otp", userController.forgotVerifyOtp)
router.post("/resend-forgot-otp", userController.resendForgotOtp)
router.get("/newpassword", userController.newPassword)
router.post("/reset-password", userController.resetPassword)

router.post("/logout", userController.logout)

// Product browsing routes
router.get("/products", isBlocked, productController.listProducts)
router.get("/products/:id", isBlocked, productController.viewProduct)

// Review system routes - require authentication for posting/voting
router.post("/products/:id/reviews", userAuthCheck, reviewController.submitReview)
router.get("/products/:id/reviews", reviewController.getProductReviews)
router.get("/products/:id/user-review", isBlocked, reviewController.checkUserReview)
router.post("/reviews/:reviewId/helpful", userAuthCheck, reviewController.markHelpful)


module.exports = router
