const User = require("../models/user");

const userAuthCheck = async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    try {
        const user = await User.findById(req.session.user._id);

        if (!user) {
            req.session.destroy((err) => {
                if (err) console.error('Error destroying session:', err);
            });
            return res.redirect("/login");
        }

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

const isBlocked = async (req, res, next) => {
    if (!req.session.user) {
        return next();
    }

    try {
        const user = await User.findById(req.session.user._id);

        if (!user) {
            req.session.destroy((err) => {
                if (err) console.error('Error destroying session:', err);
            });
            return res.redirect("/login");
        }

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
        next();
    }
};

module.exports = { userAuthCheck, isBlocked };
