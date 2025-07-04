const bcrypt = require("bcrypt");
const User = require("../models/user");
const UserValidationService = require("./userValidationService");

// Service class to handle user authentication operations
class UserAuthService {
    // Hash password with bcrypt (salt rounds: 10)
    static async hashPassword(password) {
        try {
            return await bcrypt.hash(password, 10);
        } catch (error) {
            console.error('Error hashing password:', error);
            throw new Error('Password hashing failed: ' + error.message);
        }
    }

    // Compare plain password with hashed password
    static async comparePassword(plainPassword, hashedPassword) {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            console.error('Error comparing passwords:', error);
            throw new Error('Password comparison failed: ' + error.message);
        }
    }

    // Create new user account after OTP verification
    static async createUser(userData) {
        try {
            const newUser = new User({
                fullname: userData.fullname,
                email: userData.email,
                mobile: userData.mobile,
                password: userData.password,
            });

            await newUser.save();
            return newUser;
        } catch (error) {
            console.error('Error creating user:', error);
            throw new Error('User creation failed: ' + error.message);
        }
    }

    // Authenticate user login credentials
    static async authenticateUser(email, password) {
        try {
            const validation = await UserValidationService.validateUserForLogin(email, password);
            
            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.error
                };
            }

            // Verify password matches
            const isMatch = await this.comparePassword(password, validation.user.password);

            if (!isMatch) {
                return {
                    success: false,
                    error: "Invalid email or password"
                };
            }

            return {
                success: true,
                user: validation.user
            };

        } catch (error) {
            console.error('Error in authenticateUser:', error);
            return {
                success: false,
                error: "Something went wrong. Please try again."
            };
        }
    }

    // Reset user password after OTP verification
    static async resetUserPassword(email, newPassword) {
        try {
            const hashedPassword = await this.hashPassword(newPassword);
            
            await User.findOneAndUpdate(
                { email },
                { password: hashedPassword }
            );

            return { success: true };
        } catch (error) {
            console.error('Error resetting password:', error);
            return {
                success: false,
                error: "Failed to reset password. Please try again."
            };
        }
    }

    // Set user session data after successful login
    static setUserSession(session, user) {
        session.user = user;
        session.username = user.fullname;
    }

    // Clear user session on logout
    static clearUserSession(session, callback) {
        session.destroy(callback);
    }
}

module.exports = UserAuthService;