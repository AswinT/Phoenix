const User = require("../models/user");

// Middleware to check if user is authenticated and not blocked
const userAuthCheck = async (req, res, next) => {
    // Check if user session exists
    if (!req.session.user) {
        return res.redirect("/login");
    }

    try {
        // Verify user still exists in database
        const user = await User.findById(req.session.user._id);

        if (!user) {
            // User deleted from database, clear session
            req.session.destroy((err) => {
                if (err) console.error('Error destroying session:', err);
            });
            return res.redirect("/login");
        }

        // Check if user account is blocked
        if (user.isBlocked) {
            req.session.destroy((err) => {
                if (err) console.error('Error destroying session:', err);
            });
            return res.render("user/userLogin", {
                user: null,
                username: null,
                error: "Your account has been blocked. Please contact support."
            });
        }

        next();
    } catch (error) {
        console.error('Error in userAuthCheck middleware:', error);
        return res.redirect("/login");
    }
};

// Middleware to check if logged-in user is blocked (allows non-logged users to continue)
const isBlocked = async (req, res, next) => {
    // Allow non-authenticated users to continue
    if (!req.session.user) {
        return next();
    }

    try {
        const user = await User.findById(req.session.user._id);

        if (!user) {
            // User deleted from database, clear session
            req.session.destroy((err) => {
                if (err) console.error('Error destroying session:', err);
            });
            return res.redirect("/login");
        }

        // Block access if user account is blocked
        if (user.isBlocked) {
            req.session.destroy((err) => {
                if (err) console.error('Error destroying session:', err);
            });
            return res.render("user/userLogin", {
                user: null,
                username: null,
                error: "Your account has been blocked. Please contact support."
            });
        }

        next();
    } catch (error) {
        console.error('Error in isBlocked middleware:', error);
        next(); // Continue on error to avoid breaking the flow
    }
};

module.exports = { userAuthCheck, isBlocked };
