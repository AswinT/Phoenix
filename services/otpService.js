const EmailService = require("./emailService");

class OtpService {
    static generateOtp() {
        return EmailService.generateOtp();
    }

    static getOtpExpiry() {
        return Date.now() + 10 * 60 * 1000; // 10 minutes
    }

    static isOtpExpired(expiry) {
        return Date.now() > expiry;
    }

    static isOtpValid(inputOtp, sessionOtp) {
        return parseInt(inputOtp) === sessionOtp;
    }

    static storeSignupOtp(session, otp, userData) {
        session.tempUser = {
            fullname: userData.fullname.trim(),
            email: userData.email.trim(),
            mobile: userData.mobile.trim(),
            password: userData.hashedPassword
        };
        session.otp = otp;
        session.otpExpiry = this.getOtpExpiry();
    }

    static storePasswordResetOtp(session, otp, email) {
        session.resetOtp = otp;
        session.resetOtpExpiry = this.getOtpExpiry();
        session.resetEmail = email;
    }

    static clearSignupOtpData(session) {
        delete session.tempUser;
        delete session.otp;
        delete session.otpExpiry;
    }

    static clearPasswordResetOtpData(session) {
        delete session.resetOtp;
        delete session.resetOtpExpiry;
        delete session.resetEmail;
    }

    static validateSignupOtp(session, inputOtp) {
        const { otp: sessionOtp, otpExpiry, tempUser } = session;

        if (!sessionOtp || !otpExpiry || !tempUser) {
            return {
                isValid: false,
                error: "Session expired. Please sign up again.",
                email: ""
            };
        }

        if (this.isOtpExpired(otpExpiry)) {
            return {
                isValid: false,
                error: "OTP expired. Please request a new one.",
                email: tempUser.email
            };
        }

        if (!this.isOtpValid(inputOtp, sessionOtp)) {
            return {
                isValid: false,
                error: "Invalid OTP. Please try again.",
                email: tempUser.email
            };
        }

        return {
            isValid: true,
            userData: tempUser
        };
    }

    static validatePasswordResetOtp(session, inputOtp) {
        const { resetOtp: sessionOtp, resetOtpExpiry: otpExpiry, resetEmail: email } = session;

        if (!sessionOtp || !otpExpiry || !email) {
            return {
                isValid: false,
                error: "Session expired. Please try again.",
                email: ""
            };
        }

        if (this.isOtpExpired(otpExpiry)) {
            return {
                isValid: false,
                error: "OTP expired. Please request a new one.",
                email: email
            };
        }

        if (!this.isOtpValid(inputOtp, sessionOtp)) {
            return {
                isValid: false,
                error: "Invalid OTP. Please try again.",
                email: email
            };
        }

        return {
            isValid: true,
            email: email
        };
    }

    static async sendSignupOtp(email, otp) {
        try {
            await EmailService.sendVerificationEmail(email, otp);
            return { success: true };
        } catch (error) {
            console.error('Failed to send signup OTP:', error);
            return { success: false, error: error.message };
        }
    }

    static async sendPasswordResetOtp(email, otp) {
        try {
            await EmailService.sendPasswordResetEmail(email, otp);
            return { success: true };
        } catch (error) {
            console.error('Failed to send password reset OTP:', error);
            return { success: false, error: error.message };
        }
    }

    static async resendSignupOtp(session) {
        const tempUser = session.tempUser;

        if (!tempUser) {
            return {
                success: false,
                message: "Session expired. Please sign up again."
            };
        }

        const newOtp = this.generateOtp();
        console.log(' Resend Signup OTP for', tempUser.email + ':', newOtp);
        
        session.otp = newOtp;
        session.otpExpiry = this.getOtpExpiry();

        const result = await this.sendSignupOtp(tempUser.email, newOtp);
        
        if (result.success) {
            return {
                success: true,
                message: "New OTP sent to your email"
            };
        } else {
            return {
                success: false,
                message: "Failed to send OTP. Please try again."
            };
        }
    }

    static async resendPasswordResetOtp(session) {
        const email = session.resetEmail;

        if (!email) {
            return {
                success: false,
                message: "Session expired. Please start the password reset process again."
            };
        }

        const newOtp = this.generateOtp();
        console.log(' Resend Password Reset OTP for', email + ':', newOtp);
        
        session.resetOtp = newOtp;
        session.resetOtpExpiry = this.getOtpExpiry();

        const result = await this.sendPasswordResetOtp(email, newOtp);
        
        if (result.success) {
            return {
                success: true,
                message: "New verification code sent to your email"
            };
        } else {
            return {
                success: false,
                message: "Failed to send verification code. Please try again."
            };
        }
    }
}

module.exports = OtpService;