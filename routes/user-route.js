const express = require("express");
const router = express.Router();
const passport = require("passport");
const userAuthController = require("../controllers/user/user-auth-controller");
const userDashboardController = require("../controllers/user/user-dashboard-controller");
const userShopController = require("../controllers/user/user-shop-controller");
const userProfileController = require("../controllers/user/user-profile-controller");
const userReviewController = require("../controllers/user/user-review-controller");
const { checkProductAvailabilityForPage } = require("../middleware/product-availability-middleware");
const { profileUpload, handleMulterError } = require("../config/multer-config");

const { isUserAuthenticated, noCache } = require("../middleware/auth-middleware");
const { addUserContext, checkUserBlocked } = require("../middleware/user-middleware");


// Google OAuth routes
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
    req.session.userId = req.user._id;
    res.redirect("/dashboard");
  }
);


// Public routes (with user context for navbar)
router.get("/signup", addUserContext, userAuthController.loadSignup);
router.get("/login", addUserContext, userAuthController.loadLogin);
router.post("/signup", userAuthController.signup);

router.get("/verify-otp", userAuthController.loadOtpPage);
router.post("/verify-otp", userAuthController.verifyOtp);
router.post("/resend-otp", userAuthController.resendOtp);
router.post("/login", userAuthController.login);

// Forgot password routes (no user context needed)
router.get("/forgot-password", userAuthController.loadForgotPassword);
router.post("/forgot-password", userAuthController.verifyForgotPasswordEmail);
router.get("/forgot-verify-otp", userAuthController.loadForgotVerifyOtp);
router.post("/forgot-verify-otp", userAuthController.verifyForgotPasswordOtp);
router.post("/resend-forgot-verify-otp", userAuthController.resendForgotPasswordOtp);
router.get("/new-password", userAuthController.loadNewPassword);
router.post("/reset-password", userAuthController.resetPassword);

// Routes that need user context for dropdown (apply middleware)
router.get("/", addUserContext, checkUserBlocked, userDashboardController.loadLanding);
router.get("/dashboard", isUserAuthenticated, noCache, addUserContext, checkUserBlocked, userDashboardController.loadDashboard);
router.get("/shop", addUserContext, checkUserBlocked, userShopController.loadShop);
router.get("/products", addUserContext, checkUserBlocked, userShopController.loadShop);
router.get("/product/:id", addUserContext, checkUserBlocked, checkProductAvailabilityForPage, userShopController.loadProductDetails);
router.get("/profile", isUserAuthenticated, noCache, addUserContext, checkUserBlocked, userProfileController.loadProfile);
router.get("/settings", isUserAuthenticated, noCache, addUserContext, checkUserBlocked, userProfileController.loadSettings);
router.get("/logout", isUserAuthenticated, noCache, checkUserBlocked, userAuthController.logout);

// Review routes
router.post("/submit-review", isUserAuthenticated, noCache, checkUserBlocked, userReviewController.submitReview);
router.post("/mark-helpful", isUserAuthenticated, noCache, checkUserBlocked, userReviewController.markHelpful);

// Profile photo upload route
router.post("/upload-profile-photo", isUserAuthenticated, noCache, checkUserBlocked, profileUpload.single('profilePhoto'), handleMulterError, userProfileController.uploadProfilePhoto);

// API routes
router.get("/api/product-status/:id", isUserAuthenticated, noCache, checkUserBlocked, userShopController.checkProductStatus);



module.exports = router;