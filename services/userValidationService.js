const User = require("../models/user");

class UserValidationService {
    static validateSignupFields(body) {
        const { fullname, email, mobile, password, confirmPassword } = body;
        const errors = {};

        if (!fullname?.trim()) {
            errors.fullname = "Full name is required";
        }

        if (!email?.trim()) {
            errors.email = "Email is required";
        } else if (!this.isValidEmail(email)) {
            errors.email = "Please enter a valid email address";
        }

        if (!mobile?.trim()) {
            errors.mobile = "Mobile number is required";
        } else if (!this.isValidMobile(mobile)) {
            errors.mobile = "Please enter a valid mobile number";
        }

        if (!password) {
            errors.password = "Password is required";
        } else if (password.length < 6) {
            errors.password = "Password must be at least 6 characters long";
        }

        if (!confirmPassword) {
            errors.confirmPassword = "Confirm password is required";
        } else if (password && confirmPassword && password !== confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }

        return errors;
    }

    static validateLoginFields(body) {
        const { email, password } = body;
        const errors = {};

        if (!email?.trim()) {
            errors.email = "Email is required";
        }

        if (!password?.trim()) {
            errors.password = "Password is required";
        }

        return errors;
    }

    static validatePasswordReset(body) {
        const { password, confirmPassword } = body;
        const errors = {};

        if (!password) {
            errors.password = "Password is required";
        } else if (password.length < 6) {
            errors.password = "Password must be at least 6 characters long";
        }

        if (!confirmPassword) {
            errors.confirmPassword = "Confirm password is required";
        } else if (password && confirmPassword && password !== confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }

        return errors;
    }

    static validateEmail(email) {
        if (!email?.trim()) {
            return "Email is required";
        }

        if (!this.isValidEmail(email)) {
            return "Please enter a valid email address";
        }

        return null;
    }

    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidMobile(mobile) {
        const mobileRegex = /^[0-9]{10}$/;
        return mobileRegex.test(mobile.replace(/\s+/g, ''));
    }

    static async checkUserExists(email) {
        try {
            const existingUser = await User.findOne({ email: email.trim() });
            return existingUser;
        } catch (error) {
            console.error('Database error when checking for existing user:', error);
            throw new Error('Database connection failed: ' + error.message);
        }
    }

    static async validateUserForLogin(email, password) {
        const user = await User.findOne({ email });

        if (!user) {
            return { isValid: false, error: "Invalid email or password" };
        }

        if (user.isBlocked) {
            return { isValid: false, error: "Your account has been blocked. Please contact support." };
        }

        if (!user.password) {
            console.error('User password is missing from database for email:', email);
            return { isValid: false, error: "Account error. Please contact support." };
        }

        return { isValid: true, user };
    }
}

module.exports = UserValidationService;